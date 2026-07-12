const db = require("../config/db");
const { refreshInventorySnapshot } = require("./inventoryController");
const { generateReturnPdf } = require("../services/returnPdf.service");
const { sendReturnEmail, buildReturnEmailHtml } = require("../services/returnEmail.service");

const getAllReturns = (req, res) => {
  const sql = `
    SELECT
      rn.id,
      rn.return_number,
      rn.status,
      rn.created_at,
      s.supplier_name,
      u.full_name AS created_by_name,
      (SELECT COALESCE(SUM(quantity), 0) FROM return_note_items WHERE return_note_id = rn.id) as total_quantity,
      (SELECT COUNT(id) FROM return_note_items WHERE return_note_id = rn.id) as item_count
    FROM return_notes rn
    JOIN suppliers s ON rn.supplier_id = s.id
    LEFT JOIN users u ON rn.created_by = u.id
    ORDER BY rn.id DESC
  `;

  db.query(sql, (err, rnResults) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (rnResults.length === 0) {
      return res.json([]);
    }

    const itemSql = `
      SELECT 
        rni.id,
        rni.return_note_id,
        rni.quantity,
        rni.reason,
        rni.notes,
        i.name AS item_name,
        i.code AS item_code,
        ib.batch_code,
        (
          SELECT COALESCE(SUM(b2.received_quantity), 0)
          FROM inventory_batches b2
          WHERE b2.grn_id = rn.grn_id AND b2.item_id = ib.item_id
        ) AS total_received_for_item,
        (
          SELECT COALESCE(SUM(rni2.quantity), 0)
          FROM return_note_items rni2
          JOIN return_notes rn2 ON rni2.return_note_id = rn2.id
          JOIN inventory_batches b3 ON rni2.batch_id = b3.id
          WHERE b3.grn_id = rn.grn_id AND b3.item_id = ib.item_id
        ) AS total_returned_for_item
      FROM return_note_items rni
      JOIN return_notes rn ON rni.return_note_id = rn.id
      JOIN items i ON rni.item_id = i.id
      JOIN inventory_batches ib ON rni.batch_id = ib.id
      WHERE rni.return_note_id IN (?)
    `;

    db.query(itemSql, [rnResults.map(r => r.id)], (err2, itemResults) => {
      if (err2) {
        return res.status(500).json({ message: "Database error", error: err2.message });
      }

      const itemsByRn = {};
      itemResults.forEach(item => {
        if (!itemsByRn[item.return_note_id]) itemsByRn[item.return_note_id] = [];
        itemsByRn[item.return_note_id].push(item);
      });

      rnResults.forEach(rn => {
        rn.items = itemsByRn[rn.id] || [];
      });

      res.json(rnResults);
    });
  });
};

const createReturn = (req, res) => {
  const { grn_id, supplier_id, items } = req.body;
  const created_by = req.user.id;

  if (!grn_id || !supplier_id || !items || !items.length) {
    return res.status(400).json({ message: "Required fields are missing" });
  }

  db.getConnection((err, conn) => {
    if (err) return res.status(500).json({ message: "Database error", error: err.message });

    conn.beginTransaction(async (txErr) => {
      if (txErr) {
        conn.release();
        return res.status(500).json({ message: "Transaction start error", error: txErr.message });
      }

      try {
        const year = new Date().getFullYear();
        const numResult = await new Promise((resolve, reject) => {
          conn.query(
            "SELECT MAX(CAST(SUBSTRING_INDEX(return_number, '-', -1) AS UNSIGNED)) AS max_num FROM return_notes WHERE return_number LIKE ?",
            [`RN-${year}-%`],
            (e, r) => e ? reject(e) : resolve(r)
          );
        });
        const maxNum = numResult[0].max_num || 0;
        const nextNumStr = String(maxNum + 1).padStart(3, "0");
        const return_number = `RN-${year}-${nextNumStr}`;

        const rnResult = await new Promise((resolve, reject) => {
          conn.query(
            "INSERT INTO return_notes (return_number, supplier_id, grn_id, created_by) VALUES (?, ?, ?, ?)",
            [return_number, supplier_id, grn_id, created_by],
            (e, r) => e ? reject(e) : resolve(r)
          );
        });
        const return_note_id = rnResult.insertId;

        for (const item of items) {
          const { item_id, batch_id, quantity, reason, notes } = item;
          const returnQty = Number(quantity);

          if (returnQty <= 0) throw new Error("Return quantity must be greater than 0");

          const batchResults = await new Promise((resolve, reject) => {
            conn.query(
              "SELECT available_quantity FROM inventory_batches WHERE id = ? AND item_id = ?",
              [batch_id, item_id],
              (e, r) => e ? reject(e) : resolve(r)
            );
          });

          if (batchResults.length === 0) throw new Error("Inventory batch not found");

          const currentQty = Number(batchResults[0].available_quantity || 0);
          if (returnQty > currentQty) throw new Error("Not enough stock in selected batch");

          const newQty = currentQty - returnQty;
          const newStatus = newQty === 0 ? "Depleted" : "Available";

          await new Promise((resolve, reject) => {
            conn.query(
              "UPDATE inventory_batches SET available_quantity = ?, status = ? WHERE id = ?",
              [newQty, newStatus, batch_id],
              (e, r) => e ? reject(e) : resolve(r)
            );
          });

          await new Promise((resolve, reject) => {
            conn.query(
              "INSERT INTO return_note_items (return_note_id, item_id, batch_id, quantity, reason, notes) VALUES (?, ?, ?, ?, ?, ?)",
              [return_note_id, item_id, batch_id, returnQty, reason, notes || null],
              (e, r) => e ? reject(e) : resolve(r)
            );
          });

          await new Promise((resolve, reject) => {
            conn.query(
              "INSERT INTO stock_movements (item_id, movement_type, reference_type, reference_id, quantity, notes) VALUES (?, 'OUT', 'RETURN', ?, ?, ?)",
              [item_id, return_note_id, returnQty, notes || `Goods returned: ${reason}`],
              (e, r) => e ? reject(e) : resolve(r)
            );
          });
        }

        conn.commit((cErr) => {
          if (cErr) {
            conn.rollback(() => {
              conn.release();
              res.status(500).json({ message: "Commit error", error: cErr.message });
            });
            return;
          }

          const uniqueItems = [...new Set(items.map(i => i.item_id))];
          uniqueItems.forEach(id => refreshInventorySnapshot(id, () => { }));

          conn.release();
          res.status(201).json({ message: "Return note created successfully", return_number });
        });
      } catch (innerErr) {
        conn.rollback(() => {
          conn.release();
          res.status(400).json({ message: innerErr.message });
        });
      }
    });
  });
};

const getReturnNoteData = (id) => {
  return new Promise((resolve, reject) => {
    const rnSql = `
      SELECT
        rn.id,
        rn.return_number,
        rn.status,
        rn.created_at,
        s.supplier_name,
        s.email AS supplier_email,
        s.address,
        s.city,
        s.contact_number,
        s.whatsapp_number,
        s.supplier_code,
        u.full_name AS created_by_name
      FROM return_notes rn
      JOIN suppliers s ON rn.supplier_id = s.id
      LEFT JOIN users u ON rn.created_by = u.id
      WHERE rn.id = ?
    `;
    db.query(rnSql, [id], (err, rnResults) => {
      if (err) return reject(err);
      if (rnResults.length === 0) return resolve(null);

      const rnData = rnResults[0];

      const itemsSql = `
        SELECT
          rni.quantity,
          rni.reason,
          rni.notes,
          i.name AS item_name,
          ib.batch_code
        FROM return_note_items rni
        JOIN items i ON rni.item_id = i.id
        JOIN inventory_batches ib ON rni.batch_id = ib.id
        WHERE rni.return_note_id = ?
      `;
      db.query(itemsSql, [id], (err2, itemResults) => {
        if (err2) return reject(err2);
        rnData.items = itemResults;
        resolve(rnData);
      });
    });
  });
};

const sendReturnNote = async (req, res) => {
  try {
    const { id } = req.params;
    const returnNoteData = await getReturnNoteData(id);

    if (!returnNoteData) {
      return res.status(404).json({ message: "Return note not found" });
    }
    if (!returnNoteData.supplier_email) {
      return res.status(400).json({ message: "Supplier email is missing" });
    }

    const { absPath, fileName } = await generateReturnPdf({
      returnNote: returnNoteData,
      supplier: returnNoteData,
    });

    const emailHtml = buildReturnEmailHtml({
      supplierName: returnNoteData.supplier_name,
      returnNumber: returnNoteData.return_number,
      reason: "Multiple items returned",
    });

    await sendReturnEmail({
      to: returnNoteData.supplier_email,
      subject: `Return Note ${returnNoteData.return_number} - Fresh World Exporters`,
      html: emailHtml,
      pdfPath: absPath,
      pdfFileName: fileName,
    });

    const updateSql = "UPDATE return_notes SET status = 'sent', sent_at = NOW() WHERE id = ?";
    db.query(updateSql, [id], (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ message: "Failed to update return note status", error: updateErr.message });
      }
      res.json({ message: "Return note sent successfully" });
    });
  } catch (err) {
    console.error("Failed to send return note:", err);
    res.status(500).json({ message: "Failed to send return note", error: err.message });
  }
};

const renderPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const returnNoteData = await getReturnNoteData(id);

    if (!returnNoteData) {
      return res.status(404).json({ message: "Return note not found" });
    }

    const { publicPath } = await generateReturnPdf({
      returnNote: returnNoteData,
      supplier: returnNoteData,
    });

    res.json({
      message: "Return note PDF generated successfully",
      fileUrl: publicPath,
      documentUrl: `${process.env.BACKEND_BASE_URL || "http://localhost:5001"}${publicPath}`,
    });
  } catch (err) {
    console.error("Failed to generate return note PDF:", err);
    res.status(500).json({ message: "Failed to generate return note PDF", error: err.message });
  }
};

module.exports = {
  getAllReturns,
  createReturn,
  sendReturnNote,
  renderPdf,
};