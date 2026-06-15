const db = require("../config/db");

const getAllPurchaseOrders = (req, res) => {
  const sql = `
    SELECT
      po.id,
      po.po_number,
      po.supplier_id,
      po.order_date,
      po.expected_delivery_date,
      po.expected_date,
      po.required_by,
      po.payment_terms,
      po.priority,
      po.status,
      po.total_amount,
      po.created_by,
      po.created_at,
      po.updated_at,
      s.supplier_name,COALESCE(NULLIF(u.full_name, ''), u.email, CONCAT('User #', po.created_by), 'System User') AS created_by_name
      
  FROM purchase_orders po
  LEFT JOIN suppliers s ON po.supplier_id = s.id
  LEFT JOIN users u ON po.created_by = u.id
  ORDER BY po.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("getAllPurchaseOrders error:", err);
      return res.status(500).json({
        message: "Database error",
        error: err.message,
      });
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
      COALESCE(NULLIF(u.full_name, ''), u.email, CONCAT('User #', po.created_by), 'System User') AS created_by_name
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON po.created_by = u.id
      WHERE po.id = ?
  `;

  const itemsSql = `
    SELECT 
      poi.id,
      poi.item_id,
      poi.quantity,
      poi.unit_price,
      (poi.quantity * poi.unit_price) AS line_total,
      i.name AS item_name,
      i.code AS item_code,
      i.unit
    FROM purchase_order_items poi
    LEFT JOIN items i ON poi.item_id = i.id
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
    required_by,
    status = "draft",
    priority = "normal",
    remarks = "",
    items,
  } = req.body;

  const createdBy = req.user?.id;

  if (!createdBy) {
    return res.status(401).json({ message: "Login required. Created by user is missing." });
  }

  if (!supplier_id || !expected_delivery_date || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "Supplier, required-by date, and at least one line item are required",
    });
  }

  const selectedDate = new Date(expected_delivery_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
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

  const poNumber = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const finalStatus = status === "pending_approval" ? "pending_approval" : "draft";
  const finalPriority = priority === "urgent" ? "urgent" : "normal";

  db.beginTransaction((txErr) => {
    if (txErr) {
      return res.status(500).json({ message: "Transaction error", error: txErr.message });
    }

    const poSql = `
      INSERT INTO purchase_orders
      (
        po_number,
        supplier_id,
        order_date,
        expected_delivery_date,
        required_by,
        payment_terms,
        notes,
        status,
        total_amount,
        priority,
        created_by,
        remarks
      )
      VALUES (?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      poSql,
      [
        poNumber,
        supplier_id,
        expected_delivery_date,
        expected_delivery_date,
        null,
        remarks,
        finalStatus,
        totalAmount,
        finalPriority,
        createdBy,
        remarks,
      ],
      (err, result) => {
        if (err) {
          console.error("createPurchaseOrder error:", err);
          return db.rollback(() =>
            res.status(500).json({ message: "Database error", error: err.message })
          );
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
            console.error("createPurchaseOrder items error:", itemErr);
            return db.rollback(() =>
              res.status(500).json({ message: "Database error", error: itemErr.message })
            );
          }

          if (finalStatus !== "pending_approval") {
            return db.commit((commitErr) => {
              if (commitErr) {
                return db.rollback(() =>
                  res.status(500).json({ message: "Commit error", error: commitErr.message })
                );
              }

              return res.status(201).json({
                message: "Purchase order draft created successfully",
                purchaseOrderId,
                poNumber,
              });
            });
          }

          const approvalSql = `
            INSERT INTO approval_requests
            (
              module_key,
              entity_id,
              request_number,
              title,
              summary,
              requested_by,
              requested_by_name,
              priority,
              approval_status,
              target_table,
              target_pk,
              approve_status,
              reject_status,
              current_status,
              metadata_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          db.query(
            approvalSql,
            [
              "purchase_order",
              purchaseOrderId,
              poNumber,
              `Purchase Order ${poNumber}`,
              remarks || `Purchase order created for supplier ID ${supplier_id}`,
              createdBy,
              req.user?.name || req.user?.email || "System User",
              finalPriority,
              "pending",
              "purchase_orders",
              purchaseOrderId,
              "approved",
              "draft",
              "pending_approval",
              JSON.stringify({ totalAmount, itemCount: cleanItems.length }),
            ],
            (approvalErr) => {
              if (approvalErr) {
                console.error("create approval request error:", approvalErr);
                return db.rollback(() =>
                  res.status(500).json({ message: "Database error", error: approvalErr.message })
                );
              }

              db.commit((commitErr) => {
                if (commitErr) {
                  return db.rollback(() =>
                    res.status(500).json({ message: "Commit error", error: commitErr.message })
                  );
                }

                return res.status(201).json({
                  message: "Purchase order submitted for approval",
                  purchaseOrderId,
                  poNumber,
                });
              });
            }
          );
        });
      }
    );
  });
};
const getPurchaseItemsBySupplier = (req, res) => {
  const supplierId = Number(req.params.supplierId);

  if (!supplierId) {
    return res.status(400).json({ message: "Supplier id is required" });
  }

  const sql = `
    SELECT DISTINCT
      i.id,
      i.code,
      i.name,
      i.unit,
      i.unit_cost,
      i.item_kind,
      i.purchase_source,
      i.supplier_id
    FROM items i
    LEFT JOIN item_suppliers isp
      ON isp.item_id = i.id AND isp.supplier_id = ?
    WHERE i.status = 'active'
      AND (
        i.supplier_id = ?
        OR isp.supplier_id IS NOT NULL
      )
    ORDER BY i.name ASC
  `;

  db.query(sql, [supplierId, supplierId], (err, results) => {
    if (err) {
      console.error("getPurchaseItemsBySupplier error:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

module.exports = {
   getAllPurchaseOrders,
   getPurchaseOrderById,
   getPurchaseItemsBySupplier,
   createPurchaseOrder,
};