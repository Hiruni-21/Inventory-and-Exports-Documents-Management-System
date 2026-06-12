const db = require("../config/db");

const getUserDisplayName = (req) =>
  req.user?.name || req.user?.full_name || req.user?.username || req.user?.email || "System User";

const normalizePriority = (value) =>
  String(value || "normal").toLowerCase() === "urgent" ? "urgent" : "normal";

const getAllPurchaseOrders = (req, res) => {
  const sql = `
    SELECT 
      po.id,
      po.po_number,
      po.required_by AS expected_delivery_date,
      po.status,
      po.priority,
      po.created_at,
      s.supplier_name,
      COALESCE(u.name, u.full_name, u.username, u.email) AS created_by_name
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    LEFT JOIN users u ON po.created_by = u.id
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
      po.required_by AS expected_delivery_date,
      s.supplier_name,
      s.contact_number,
      s.email,
      COALESCE(u.name, u.full_name, u.username, u.email) AS created_by_name
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    LEFT JOIN users u ON po.created_by = u.id
    WHERE po.id = ?
  `;

  const itemsSql = `
    SELECT 
      poi.id,
      poi.item_id,
      poi.quantity,
      poi.unit_price,
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
  const {
    supplier_id,
    expected_delivery_date,
    status = "pending_approval",
    priority = "normal",
    remarks = "",
    items,
  } = req.body;

  const createdBy = req.user?.id || null;
  const createdByName = getUserDisplayName(req);
  const finalPriority = normalizePriority(priority);
  const finalStatus = status === "draft" ? "draft" : "pending_approval";

  if (!createdBy) {
    return res.status(401).json({ message: "Login user is required to create purchase order" });
  }

  if (!supplier_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Supplier and items are required" });
  }

  if (!expected_delivery_date) {
    return res.status(400).json({ message: "Required-by date is required" });
  }

  const today = new Date().toISOString().split("T")[0];

  if (expected_delivery_date < today) {
    return res.status(400).json({ message: "Required-by date cannot be in the past" });
  }

  const cleanItems = items
    .map((item) => ({
      item_id: Number(item.item_id),
      quantity: Number(item.quantity || 0),
      unit_price: Number(item.unit_price || 0),
    }))
    .filter((item) => item.item_id && item.quantity > 0);

  if (cleanItems.length === 0) {
    return res.status(400).json({ message: "At least one valid item is required" });
  }

  const totalAmount = cleanItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  const poNumber = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;

  db.beginTransaction((txErr) => {
    if (txErr) {
      return res.status(500).json({ message: "Database error", error: txErr.message });
    }

    const poSql = `
      INSERT INTO purchase_orders
      (po_number, supplier_id, requested_by, order_date, required_by, status, priority, created_by, remarks, total_amount)
      VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      poSql,
      [
        poNumber,
        supplier_id,
        createdBy,
        expected_delivery_date,
        finalStatus,
        finalPriority,
        createdBy,
        remarks,
        totalAmount,
      ],
      (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error("createPurchaseOrder error:", err);
            res.status(500).json({ message: "Database error", error: err.message });
          });
        }

        const purchaseOrderId = result.insertId;

        const itemValues = cleanItems.map((item) => [
          purchaseOrderId,
          item.item_id,
          item.quantity,
          item.unit_price,
        ]);

        const itemSql = `
          INSERT INTO purchase_order_items
          (purchase_order_id, item_id, quantity, unit_price)
          VALUES ?
        `;

        db.query(itemSql, [itemValues], (itemErr) => {
          if (itemErr) {
            return db.rollback(() => {
              console.error("createPurchaseOrder items error:", itemErr);
              res.status(500).json({ message: "Database error", error: itemErr.message });
            });
          }

          if (finalStatus === "draft") {
            return db.commit((commitErr) => {
              if (commitErr) {
                return db.rollback(() =>
                  res.status(500).json({ message: "Database error", error: commitErr.message })
                );
              }

              res.status(201).json({
                message: "Purchase order draft saved successfully",
                purchaseOrderId,
                poNumber,
              });
            });
          }

          const approvalSql = `
            INSERT INTO approval_requests
            (module_key, entity_id, request_number, title, summary, requested_by, requested_by_name,
             priority, approval_status, target_table, target_pk, approve_status, reject_status, current_status, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'purchase_orders', 'id', 'approved', 'rejected', ?, ?)
          `;

          const approvalValues = [
            "purchase_order",
            purchaseOrderId,
            poNumber,
            `Purchase Order ${poNumber}`,
            `Purchase order ${poNumber} requires manager approval.`,
            createdBy,
            createdByName,
            finalPriority,
            finalStatus,
            JSON.stringify({
              po_number: poNumber,
              supplier_id,
              total_amount: totalAmount,
              required_by: expected_delivery_date,
            }),
          ];

          db.query(approvalSql, approvalValues, (approvalErr) => {
            if (approvalErr) {
              return db.rollback(() => {
                console.error("createPurchaseOrder approval error:", approvalErr);
                res.status(500).json({ message: "Database error", error: approvalErr.message });
              });
            }

            db.commit((commitErr) => {
              if (commitErr) {
                return db.rollback(() =>
                  res.status(500).json({ message: "Database error", error: commitErr.message })
                );
              }

              res.status(201).json({
                message: "Purchase order submitted for approval successfully",
                purchaseOrderId,
                poNumber,
              });
            });
          });
        });
      }
    );
  });
};

module.exports = {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
};