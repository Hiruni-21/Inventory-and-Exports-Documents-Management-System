const db = require("../config/db");

const getAllPurchaseOrders = (req, res) => {
  const sql = `
    SELECT 
      po.id,
      po.po_number,
      NULL AS expected_delivery_date,
      po.status,
      po.created_at,
      s.supplier_name,
      NULL AS created_by_name
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    ORDER BY po.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("getAllPurchaseOrders error:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

const getPurchaseOrderById = (req, res) => {
  const { id } = req.params;

  const poSql = `
    SELECT 
      po.*,
      NULL AS expected_delivery_date,
      s.supplier_name,
      s.contact_number,
      s.email,
      NULL AS created_by_name
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    WHERE po.id = ?
  `;

  const itemsSql = `
    SELECT 
      poi.id,
      poi.item_id,
      poi.quantity,
      i.name AS item_name,
      i.code AS item_code,
      i.unit
    FROM purchase_order_items poi
    JOIN items i ON poi.item_id = i.id
    WHERE poi.purchase_order_id = ?
    ORDER BY poi.id ASC
  `;

  db.query(poSql, [id], (err, poResults) => {
    if (err) {
      console.error("getPurchaseOrderById error:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (poResults.length === 0) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    db.query(itemsSql, [id], (itemErr, itemResults) => {
      if (itemErr) {
        console.error("getPurchaseOrderById items error:", itemErr);
        return res.status(500).json({ message: "Database error", error: itemErr.message });
      }

      res.json({
        ...poResults[0],
        items: itemResults,
      });
    });
  });
};

const createPurchaseOrder = (req, res) => {
  const { supplier_id, items } = req.body;

  if (!supplier_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Supplier and items are required" });
  }

  const cleanItems = items
    .map((item) => ({
      item_id: Number(item.item_id),
      quantity: Number(item.quantity || 0),
    }))
    .filter((item) => item.item_id && item.quantity > 0);

  if (cleanItems.length === 0) {
    return res.status(400).json({ message: "At least one valid item is required" });
  }

  const poNumber = `PO-${Date.now()}`;

  const poSql = `
    INSERT INTO purchase_orders
    (po_number, supplier_id, order_date)
    VALUES (?, ?, CURDATE())
  `;

  db.query(
    poSql,
    [poNumber, supplier_id],
    (err, result) => {
      if (err) {
        console.error("createPurchaseOrder error:", err);
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      const purchaseOrderId = result.insertId;

      const itemValues = cleanItems.map((item) => [
        purchaseOrderId,
        item.item_id,
        item.quantity,
      ]);

      const itemSql = `
        INSERT INTO purchase_order_items
        (purchase_order_id, item_id, quantity)
        VALUES ?
      `;

      db.query(itemSql, [itemValues], (itemErr) => {
        if (itemErr) {
          console.error("createPurchaseOrder items error:", itemErr);
          return res.status(500).json({ message: "Database error", error: itemErr.message });
        }

        return res.status(201).json({
          message: "Purchase order created successfully",
          purchaseOrderId,
          poNumber,
        });
      });
    }
  );
};
module.exports = {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
};