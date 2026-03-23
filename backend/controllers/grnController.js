const db = require("../config/db");
const { refreshInventorySnapshot } = require("./inventoryController");

const getAllGrn = (req, res) => {
  const sql = `
    SELECT
      g.id,
      g.grn_number,
      g.received_date,
      NULL AS received_time,
      g.created_at,
      po.po_number,
      s.supplier_name,
      u.full_name AS created_by_name
    FROM grn g
    JOIN purchase_orders po ON g.purchase_order_id = po.id
    JOIN suppliers s ON g.supplier_id = s.id
    LEFT JOIN users u ON g.created_by = u.id
    ORDER BY g.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("getAllGrn error:", err);
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
      NULL AS received_time,
      po.po_number,
      s.supplier_name,
      s.contact_number,
      s.email,
      u.full_name AS created_by_name
    FROM grn g
    JOIN purchase_orders po ON g.purchase_order_id = po.id
    JOIN suppliers s ON g.supplier_id = s.id
    LEFT JOIN users u ON g.created_by = u.id
    WHERE g.id = ?
  `;

  const itemsSql = `
    SELECT
      gi.id,
      gi.item_id,
      gi.ordered_quantity,
      gi.delivered_quantity,
      i.name AS item_name,
      i.code AS item_code,
      i.unit
    FROM grn_items gi
    JOIN items i ON gi.item_id = i.id
    WHERE gi.grn_id = ?
    ORDER BY gi.id ASC
  `;

  db.query(grnSql, [id], (err, grnResults) => {
    if (err) {
      console.error("getGrnById error:", err);
      return res.status(500).json({ message: "Database error", error: err.message });
    }

    if (grnResults.length === 0) {
      return res.status(404).json({ message: "GRN not found" });
    }

    db.query(itemsSql, [id], (itemErr, itemResults) => {
      if (itemErr) {
        console.error("getGrnById items error:", itemErr);
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
      i.name AS item_name,
      i.code AS item_code,
      i.unit,
      po.supplier_id
    FROM purchase_order_items poi
    JOIN items i ON poi.item_id = i.id
    JOIN purchase_orders po ON poi.purchase_order_id = po.id
    WHERE poi.purchase_order_id = ?
    ORDER BY poi.id ASC
  `;

  db.query(sql, [purchaseOrderId], (err, results) => {
    if (err) {
      console.error("getPurchaseOrderItemsForGrn error:", err);
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

  if (!purchase_order_id || !supplier_id || !received_date || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Required fields are missing" });
  }

  const validItems = items
    .map((item) => ({
      item_id: Number(item.item_id),
      ordered_quantity: Number(item.ordered_quantity || 0),
      delivered_quantity: Number(item.delivered_quantity || 0),
    }))
    .filter((item) => item.item_id && item.delivered_quantity > 0);

  if (validItems.length === 0) {
    return res.status(400).json({ message: "At least one delivered quantity must be greater than 0" });
  }

  const grnNumber = `GRN-${Date.now()}`;

  const finalRemarks = [
    remarks || "",
    received_time ? `Received Time: ${received_time}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const grnSql = `
    INSERT INTO grn
      (grn_number, purchase_order_id, supplier_id, received_date, remarks, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    grnSql,
    [
      grnNumber,
      purchase_order_id,
      supplier_id,
      received_date,
      finalRemarks || null,
      created_by,
    ],
    (err, result) => {
      if (err) {
        console.error("createGrn error:", err);
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      const grnId = result.insertId;

      const grnItemValues = validItems.map((item) => [
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
          console.error("createGrn items error:", itemErr);
          return res.status(500).json({ message: "Database error", error: itemErr.message });
        }

        const itemIds = [...new Set(validItems.map((item) => item.item_id))];

        db.query(
          `SELECT id, unit FROM items WHERE id IN (?)`,
          [itemIds],
          (unitErr, itemRows) => {
            if (unitErr) {
              console.error("createGrn unit lookup error:", unitErr);
              return res.status(500).json({ message: "Database error", error: unitErr.message });
            }

            const unitMap = {};
            (itemRows || []).forEach((row) => {
              unitMap[row.id] = row.unit || "";
            });

            let processed = 0;
            let failed = false;

            validItems.forEach((item, index) => {
              const batchCode = `BATCH-${grnId}-${index + 1}`;
              const unit = unitMap[item.item_id] || "";

              const inventorySql = `
                INSERT INTO inventory_batches
                  (item_id, grn_id, batch_code, received_quantity, available_quantity, unit, received_date, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'Available')
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
                (inventoryErr) => {
                  if (failed) return;

                  if (inventoryErr) {
                    failed = true;
                    console.error("createGrn inventory error:", inventoryErr);
                    return res.status(500).json({
                      message: "Database error",
                      error: inventoryErr.message,
                    });
                  }

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
                    (movementErr) => {
                      if (failed) return;

                      if (movementErr) {
                        failed = true;
                        console.error("createGrn movement error:", movementErr);
                        return res.status(500).json({
                          message: "Database error",
                          error: movementErr.message,
                        });
                      }

                      refreshInventorySnapshot(item.item_id, (refreshErr) => {
                        if (failed) return;

                        if (refreshErr) {
                          failed = true;
                          console.error("createGrn refreshInventorySnapshot error:", refreshErr);
                          return res.status(500).json({
                            message: "Database error",
                            error: refreshErr.message,
                          });
                        }

                        processed += 1;

                        if (processed === validItems.length) {
                          return res.status(201).json({
                            message: "GRN created successfully and inventory updated",
                            grnId,
                            grnNumber,
                          });
                        }
                      });
                    }
                  );
                }
              );
            });
          }
        );
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