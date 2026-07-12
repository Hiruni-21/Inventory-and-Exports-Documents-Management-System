const db = require("../config/db");
const { refreshInventorySnapshot } = require("./inventoryController");
const { generateReturnPdf } = require("../services/returnPdf.service");
const { sendReturnEmail, buildReturnEmailHtml } = require("../services/returnEmail.service");

const getAllReturns = (req, res) => {
  const sql = `
    SELECT
      r.id,
      r.quantity,
      r.reason,
      r.notes,
      r.created_at,
      s.supplier_name,
      i.name AS item_name,
      i.code AS item_code,
      ib.batch_code,
      u.full_name AS created_by_name,
      r.status,
      (
        SELECT COALESCE(SUM(b2.received_quantity), 0)
        FROM inventory_batches b2
        WHERE b2.grn_id = ib.grn_id AND b2.item_id = ib.item_id
      ) AS total_received_for_item,
      (
        SELECT COALESCE(SUM(r2.quantity), 0)
        FROM goods_returns r2
        JOIN inventory_batches b3 ON r2.batch_id = b3.id
        WHERE b3.grn_id = ib.grn_id AND b3.item_id = ib.item_id
      ) AS total_returned_for_item
    FROM goods_returns r
    JOIN suppliers s ON r.supplier_id = s.id
    JOIN items i ON r.item_id = i.id
    JOIN inventory_batches ib ON r.batch_id = ib.id
    LEFT JOIN users u ON r.created_by = u.id
    ORDER BY r.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

const createReturn = (req, res) => {
  const { supplier_id, item_id, batch_id, quantity, reason, notes } = req.body;
  const created_by = req.user.id;

  if (!supplier_id || !item_id || !batch_id || !quantity || !reason) {
    return res.status(400).json({ message: "Required fields are missing" });
  }

  const returnQty = Number(quantity);

  if (returnQty <= 0) {
    return res.status(400).json({ message: "Return quantity must be greater than 0" });
  }

  const getBatchSql = `
    SELECT available_quantity
    FROM inventory_batches
    WHERE id = ? AND item_id = ?
  `;

  db.query(getBatchSql, [batch_id, item_id], (batchErr, batchResults) => {
    if (batchErr) {
      return res.status(500).json({ message: "Database error", error: batchErr.message });
    }

    if (batchResults.length === 0) {
      return res.status(404).json({ message: "Inventory batch not found" });
    }

    const currentQty = Number(batchResults[0].available_quantity || 0);

    if (returnQty > currentQty) {
      return res.status(400).json({ message: "Not enough stock in selected batch" });
    }

    const newQty = currentQty - returnQty;
    const newStatus = newQty === 0 ? "Depleted" : "Available";

    const updateBatchSql = `
      UPDATE inventory_batches
      SET available_quantity = ?, status = ?
      WHERE id = ?
    `;

    db.query(updateBatchSql, [newQty, newStatus, batch_id], (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ message: "Database error", error: updateErr.message });
      }

      const insertReturnSql = `
        INSERT INTO goods_returns
          (supplier_id, item_id, batch_id, quantity, reason, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertReturnSql,
        [supplier_id, item_id, batch_id, returnQty, reason, notes || null, created_by],
        (rErr, result) => {
          if (rErr) {
            return res.status(500).json({ message: "Database error", error: rErr.message });
          }

          const movementSql = `
            INSERT INTO stock_movements
              (item_id, movement_type, reference_type, reference_id, quantity, notes)
            VALUES (?, 'OUT', 'RETURN', ?, ?, ?)
          `;

          db.query(
            movementSql,
            [
              item_id,
              result.insertId,
              returnQty,
              notes || `Goods returned: ${reason}`,
            ],
            (mErr) => {
              if (mErr) {
                return res.status(500).json({ message: "Database error", error: mErr.message });
              }

              refreshInventorySnapshot(item_id, (refreshErr) => {
                if (refreshErr) {
                  return res.status(500).json({ message: "Database error", error: refreshErr.message });
                }

                res.status(201).json({ message: "Goods return recorded successfully" });
              });
            }
          );
        }
      );
    });
  });
};

const sendReturnNote = (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT
      r.id,
      r.quantity,
      r.reason,
      r.notes,
      r.created_at,
      r.status,
      s.supplier_name,
      s.email AS supplier_email,
      s.address,
      s.city,
      s.contact_number,
      s.whatsapp_number,
      s.supplier_code,
      i.name AS item_name,
      ib.batch_code,
      u.full_name AS created_by_name
    FROM goods_returns r
    JOIN suppliers s ON r.supplier_id = s.id
    JOIN items i ON r.item_id = i.id
    JOIN inventory_batches ib ON r.batch_id = ib.id
    LEFT JOIN users u ON r.created_by = u.id
    WHERE r.id = ?
  `;

  db.query(sql, [id], async (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Return note not found" });
    }

    const returnNoteData = results[0];

    if (!returnNoteData.supplier_email) {
      return res.status(400).json({ message: "Supplier email is missing" });
    }

    try {
      const returnNumber = `RN-${String(returnNoteData.id).padStart(4, "0")}`;

      const { absPath, fileName } = await generateReturnPdf({
        returnNote: returnNoteData,
        supplier: returnNoteData,
      });

      const emailHtml = buildReturnEmailHtml({
        supplierName: returnNoteData.supplier_name,
        returnNumber,
        reason: returnNoteData.reason,
      });

      await sendReturnEmail({
        to: returnNoteData.supplier_email,
        subject: `Return Note ${returnNumber} - Fresh World Exporters`,
        html: emailHtml,
        pdfPath: absPath,
        pdfFileName: fileName,
      });

      const updateSql = "UPDATE goods_returns SET status = 'sent' WHERE id = ?";
      db.query(updateSql, [id], (updateErr) => {
        if (updateErr) {
          return res.status(500).json({ message: "Failed to update return note status", error: updateErr.message });
        }

        res.json({ message: "Return note sent successfully" });
      });
    } catch (sendErr) {
      console.error("Failed to send return note:", sendErr);
      res.status(500).json({ message: "Failed to send return note", error: sendErr.message });
    }
  });
};

const renderPdf = async (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT
      r.id,
      r.quantity,
      r.reason,
      r.notes,
      r.created_at,
      r.status,
      s.supplier_name,
      s.email AS supplier_email,
      s.address,
      s.city,
      s.contact_number,
      s.whatsapp_number,
      s.supplier_code,
      i.name AS item_name,
      ib.batch_code,
      u.full_name AS created_by_name
    FROM goods_returns r
    JOIN suppliers s ON r.supplier_id = s.id
    JOIN items i ON r.item_id = i.id
    JOIN inventory_batches ib ON r.batch_id = ib.id
    LEFT JOIN users u ON r.created_by = u.id
    WHERE r.id = ?
  `;

  db.query(sql, [id], async (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "Return note not found" });
    }

    const returnNoteData = results[0];
    try {
      const { publicPath } = await generateReturnPdf({
        returnNote: returnNoteData,
        supplier: returnNoteData,
      });

      res.json({
        message: "Return note PDF generated successfully",
        fileUrl: publicPath,
        documentUrl: `${process.env.BACKEND_BASE_URL || "http://localhost:5001"}${publicPath}`,
      });
    } catch (pdfErr) {
      console.error("Failed to generate return note PDF:", pdfErr);
      res.status(500).json({ message: "Failed to generate return note PDF", error: pdfErr.message });
    }
  });
};

module.exports = {
  getAllReturns,
  createReturn,
  sendReturnNote,
  renderPdf,
};