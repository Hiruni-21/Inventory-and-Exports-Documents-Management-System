const db = require("../config/db");

const getAllPurchaseOrders = (req, res) => {
  const sql = `
    SELECT
      po.id,
      po.po_number,
      po.supplier_id,
      po.order_date,
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

  if (!supplier_id || !required_by || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "Supplier, required-by date, and at least one line item are required",
    });
  }

  const selectedDate = new Date(required_by);
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
        required_by,
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

const sendPurchaseOrder = (req, res) => {
  const { id } = req.params;

  const userId = req.user?.id || null;
  const userName =
    req.user?.full_name ||
    req.user?.email ||
    req.user?.name ||
    "Fresh World ERP";

  const findSql = `
    SELECT
      po.id,
      po.po_number,
      po.status,
      po.order_date,
      po.required_by,
      po.notes,
      po.remarks,
      s.id AS supplier_id,
      s.supplier_name,
      s.email,
      s.contact_number,
      s.whatsapp_number
    FROM purchase_orders po
    LEFT JOIN suppliers s ON s.id = po.supplier_id
    WHERE po.id = ?
    LIMIT 1
  `;

  db.query(findSql, [id], (findErr, rows) => {
    if (findErr) {
      console.error("sendPurchaseOrder find error:", findErr);
      return res.status(500).json({
        message: "Database error while finding purchase order",
        error: findErr.message,
      });
    }

    if (!rows.length) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    const po = rows[0];
    const currentStatus = String(po.status || "").toLowerCase();

    if (currentStatus !== "approved") {
      return res.status(400).json({
        message: "Only approved purchase orders can be sent",
      });
    }

    const requiredBy =
      po.required_by || "—";

    const messageBody = [
      `Purchase Order: ${po.po_number}`,
      `Supplier: ${po.supplier_name || "—"}`,
      `Order Date: ${po.order_date || "—"}`,
      `Required By: ${requiredBy}`,
      po.notes || po.remarks ? `Notes: ${po.notes || po.remarks}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    db.beginTransaction((txErr) => {
      if (txErr) {
        console.error("sendPurchaseOrder transaction error:", txErr);
        return res.status(500).json({
          message: "Failed to start transaction",
          error: txErr.message,
        });
      }

      const updateSql = `
        UPDATE purchase_orders
        SET status = 'sent',
            sent_by = ?,
            updated_at = NOW()
        WHERE id = ?
      `;

      db.query(updateSql, [userId, id], (updateErr) => {
        if (updateErr) {
          return db.rollback(() => {
            console.error("sendPurchaseOrder update error:", updateErr);
            res.status(500).json({
              message: "Failed to update purchase order status",
              error: updateErr.message,
            });
          });
        }

        const messageSql = `
          INSERT INTO supplier_messages
            (
              supplier_id,
              message_type,
              subject,
              message_body,
              linked_kind,
              linked_record_id,
              sent_by,
              status
            )
          VALUES (?, 'purchase_order', ?, ?, 'order', ?, ?, 'Sent')
        `;

        db.query(
          messageSql,
          [
            po.supplier_id,
            `Purchase Order ${po.po_number}`,
            messageBody,
            po.id,
            userName,
          ],
          (messageErr) => {
            if (messageErr) {
              return db.rollback(() => {
                console.error("sendPurchaseOrder message error:", messageErr);
                res.status(500).json({
                  message: "Failed to log supplier message",
                  error: messageErr.message,
                });
              });
            }

            db.commit((commitErr) => {
              if (commitErr) {
                return db.rollback(() => {
                  console.error("sendPurchaseOrder commit error:", commitErr);
                  res.status(500).json({
                    message: "Failed to complete send action",
                    error: commitErr.message,
                  });
                });
              }

              const { sendNotification } = require("../utils/notificationHelper");
              sendNotification({
                role: "supplier",
                supplierId: po.supplier_id,
                title: "New Purchase Order Sent",
                message: `Purchase Order ${po.po_number} has been sent to you.`,
                type: "po_sent"
              }).catch(err => console.error("Supplier PO sent notification error:", err.message));

              const emailSubject = encodeURIComponent(
                `Fresh World Purchase Order ${po.po_number}`
              );
              const emailBody = encodeURIComponent(messageBody);

              const cleanPhone = String(
                po.whatsapp_number || po.contact_number || ""
              ).replace(/\D/g, "");

              res.json({
                message: "Purchase order sent successfully",
                status: "sent",
                email_link: po.email
                  ? `mailto:${po.email}?subject=${emailSubject}&body=${emailBody}`
                  : null,
                whatsapp_link: cleanPhone
                  ? `https://wa.me/${cleanPhone}?text=${emailBody}`
                  : null,
              });
            });
          }
        );
      });
    });
  });
};

module.exports = {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  getPurchaseItemsBySupplier,
  createPurchaseOrder,
  sendPurchaseOrder,
};