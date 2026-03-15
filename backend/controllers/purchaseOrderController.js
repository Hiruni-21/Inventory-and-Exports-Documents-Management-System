const db = require("../config/db");

const getAllPurchaseOrders = (req, res) => {
  const sql = `
    SELECT 
      po.id,
      po.po_number,
      po.expected_delivery_date,
      po.status,
      po.created_at,
      s.supplier_name,
      u.name AS created_by_name
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    LEFT JOIN users u ON po.created_by = u.id
    ORDER BY po.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
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
      s.supplier_name,
      s.contact_number,
      s.email,
      u.name AS created_by_name
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    LEFT JOIN users u ON po.created_by = u.id
    WHERE po.id = ?
  `;

  const itemsSql = `
    SELECT 
      poi.id,
      poi.quantity,
      i.item_name,
      i.item_code,
      i.unit
    FROM purchase_order_items poi
    JOIN items i ON poi.item_id = i.id
    WHERE poi.purchase_order_id = ?
  `;

  db.query(poSql, [id], (err, poResults) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (poResults.length === 0) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    db.query(itemsSql, [id], (itemErr, itemResults) => {
      if (itemErr) {
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
  const { supplier_id, expected_delivery_date, remarks, items } = req.body;
  const created_by = req.user.id;

  if (!supplier_id || !items || items.length === 0) {
    return res.status(400).json({ message: "Supplier and items are required" });
  }

  const poNumber = `PO-${Date.now()}`;

  const poSql = `
    INSERT INTO purchase_orders
    (po_number, supplier_id, expected_delivery_date, remarks, created_by)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    poSql,
    [poNumber, supplier_id, expected_delivery_date || null, remarks || null, created_by],
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      const purchaseOrderId = result.insertId;

      const itemValues = items.map((item) => [
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
          return res.status(500).json({ message: "Database error", error: itemErr.message });
        }

        res.status(201).json({
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