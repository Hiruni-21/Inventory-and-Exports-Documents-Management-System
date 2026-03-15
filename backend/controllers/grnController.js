const db = require("../config/db");

const getAllGrn = (req, res) => {
  const sql = `
    SELECT 
      g.id,
      g.grn_number,
      g.received_date,
      g.received_time,
      g.created_at,
      po.po_number,
      s.supplier_name,
      u.name AS created_by_name
    FROM grn g
    JOIN purchase_orders po ON g.purchase_order_id = po.id
    JOIN suppliers s ON g.supplier_id = s.id
    LEFT JOIN users u ON g.created_by = u.id
    ORDER BY g.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

const getGrnById = (req, res) => {
  const { id } = req.params;

  const grnSql = `
    SELECT
      g.*,
      po.po_number,
      s.supplier_name,
      s.contact_number,
      s.email,
      u.name AS created_by_name
    FROM grn g
    JOIN purchase_orders po ON g.purchase_order_id = po.id
    JOIN suppliers s ON g.supplier_id = s.id
    LEFT JOIN users u ON g.created_by = u.id
    WHERE g.id = ?
  `;

  const itemsSql = `
    SELECT
      gi.id,
      gi.ordered_quantity,
      gi.delivered_quantity,
      i.item_name,
      i.item_code,
      i.unit
    FROM grn_items gi
    JOIN items i ON gi.item_id = i.id
    WHERE gi.grn_id = ?
  `;

  db.query(grnSql, [id], (err, grnResults) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (grnResults.length === 0) {
      return res.status(404).json({ message: "GRN not found" });
    }

    db.query(itemsSql, [id], (itemErr, itemResults) => {
      if (itemErr) {
        return res.status(500).json({ message: "Database error", error: itemErr.message });
      }

      res.json({
        ...grnResults[0],
        items: itemResults,
      });
    });
  });
};

const getPurchaseOrderItemsForGrn = (req, res) => {
  const { purchaseOrderId } = req.params;

  const sql = `
    SELECT
      poi.item_id,
      poi.quantity AS ordered_quantity,
      i.item_name,
      i.item_code,
      i.unit,
      po.supplier_id
    FROM purchase_order_items poi
    JOIN items i ON poi.item_id = i.id
    JOIN purchase_orders po ON poi.purchase_order_id = po.id
    WHERE poi.purchase_order_id = ?
  `;

  db.query(sql, [purchaseOrderId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    res.json(results);
  });
};

const createGrn = (req, res) => {
  const {
    purchase_order_id,
    supplier_id,
    received_date,
    received_time,
    remarks,
    items,
  } = req.body;

  const created_by = req.user.id;

  if (!purchase_order_id || !supplier_id || !received_date || !items || items.length === 0) {
    return res.status(400).json({ message: "Required fields are missing" });
  }

  const grnNumber = `GRN-${Date.now()}`;

  const grnSql = `
    INSERT INTO grn
    (grn_number, purchase_order_id, supplier_id, received_date, received_time, remarks, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    grnSql,
    [
      grnNumber,
      purchase_order_id,
      supplier_id,
      received_date,
      received_time || null,
      remarks || null,
      created_by,
    ],
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      const grnId = result.insertId;

      const grnItemValues = items.map((item) => [
        grnId,
        item.item_id,
        item.ordered_quantity,
        item.delivered_quantity,
      ]);

      const grnItemSql = `
        INSERT INTO grn_items
        (grn_id, item_id, ordered_quantity, delivered_quantity)
        VALUES ?
      `;

      db.query(grnItemSql, [grnItemValues], (itemErr) => {
        if (itemErr) {
          return res.status(500).json({ message: "Database error", error: itemErr.message });
        }

        // Create inventory batches and stock movements
        items.forEach((item, index) => {
          const batchCode = `BATCH-${grnId}-${index + 1}`;

          const getUnitSql = `SELECT unit FROM items WHERE id = ?`;
          db.query(getUnitSql, [item.item_id], (unitErr, unitResults) => {
            if (unitErr || unitResults.length === 0) {
              return;
            }

            const unit = unitResults[0].unit;

            const inventorySql = `
              INSERT INTO inventory_batches
              (item_id, grn_id, batch_code, received_quantity, available_quantity, unit, received_date)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            db.query(
              inventorySql,
              [
                item.item_id,
                grnId,
                batchCode,
                item.delivered_quantity,
                item.delivered_quantity,
                unit,
                received_date,
              ],
              () => {}
            );

            const movementSql = `
              INSERT INTO stock_movements
              (item_id, movement_type, reference_type, reference_id, quantity, notes)
              VALUES (?, 'IN', 'GRN', ?, ?, ?)
            `;

            db.query(
              movementSql,
              [
                item.item_id,
                grnId,
                item.delivered_quantity,
                `Stock added from GRN ${grnNumber}`,
              ],
              () => {}
            );
          });
        });

        res.status(201).json({
          message: "GRN created successfully and inventory updated",
          grnId,
          grnNumber,
        });
      });
    }
  );
};

module.exports = {
  getAllGrn,
  getGrnById,
  getPurchaseOrderItemsForGrn,
  createGrn,
};