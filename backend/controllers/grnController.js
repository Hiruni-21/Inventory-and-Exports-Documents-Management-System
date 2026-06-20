const db = require("../config/db");
const { refreshInventorySnapshot } = require("./inventoryController");

/* =========================
   GET ALL GRN
========================= */
const getAllGrn = (req, res) => {
  const sql = `
    SELECT
      g.id,
      g.grn_number,
      g.received_date,
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

/* =========================
   GET GRN BY ID
========================= */
const getGrnById = (req, res) => {
  const { id } = req.params;

  const grnSql = `
    SELECT
      g.*,
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
      gi.ordered_qty AS ordered_quantity,
      gi.received_qty AS delivered_quantity,
      gi.variance_qty,
      gi.variance_percent,
      gi.batch_number,
      gi.expiry_date,
      gi.unit_cost,
      gi.line_total,
      gi.notes,
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

    if (!grnResults.length) {
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

/* =========================
   GET PO ITEMS FOR GRN
========================= */
const getPurchaseOrderItemsForGrn = (req, res) => {
  const { purchaseOrderId } = req.params;

  const sql = `
    SELECT
      poi.id AS purchase_order_item_id,
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

/* =========================
   CREATE GRN
========================= */
const createGrn = (req, res) => {
  const {
    purchase_order_id,
    supplier_id,
    received_date,
    remarks,
    items,
  } = req.body;

  const created_by = req.user.id;

  if (
    !purchase_order_id ||
    !supplier_id ||
    !received_date ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return res.status(400).json({ message: "Required fields are missing" });
  }

  /* ✅ DATE VALIDATION (FIXED POSITION) */
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const received = new Date(received_date);

  if (received < today) {
    return res.status(400).json({
      message: "Received date cannot be before today.",
    });
  }

  const validItems = items
    .map((item) => ({
      item_id: Number(item.item_id),
      ordered_quantity: Number(item.ordered_quantity || 0),
      delivered_quantity: Number(item.delivered_quantity || 0),
    }))
    .filter((item) => item.item_id && item.delivered_quantity > 0);

  if (!validItems.length) {
    return res.status(400).json({
      message: "At least one delivered quantity must be greater than 0",
    });
  }

  const grnNumber = `GRN-${Date.now()}`;

  const grnSql = `
    INSERT INTO grn
    (grn_number, purchase_order_id, supplier_id, received_date, remarks, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    grnSql,
    [grnNumber, purchase_order_id, supplier_id, received_date, remarks, created_by],
    (err, result) => {
      if (err) {
        console.error("createGrn error:", err);
        return res.status(500).json({ message: "Database error", error: err.message });
      }

      const grnId = result.insertId;

      const itemIds = validItems.map((i) => i.item_id);

      db.query(
        `SELECT id, unit, COALESCE(unit_cost, 0) AS unit_cost FROM items WHERE id IN (?)`,
        [itemIds],
        (itemErr, itemRows) => {
          if (itemErr) {
            return res.status(500).json({ message: "DB error", error: itemErr.message });
          }

          const itemMap = {};
          itemRows.forEach((r) => {
            itemMap[r.id] = r;
          });

          const grnItemValues = validItems.map((item, index) => {
            const info = itemMap[item.item_id] || {};

            const varianceQty = item.delivered_quantity - item.ordered_quantity;
            const variancePercent =
              item.ordered_quantity > 0
                ? (varianceQty / item.ordered_quantity) * 100
                : 0;

            const batchNumber = `BATCH-${grnId}-${index + 1}`;
            const lineTotal = item.delivered_quantity * (info.unit_cost || 0);

            return [
              grnId,
              null,
              item.item_id,
              item.ordered_quantity,
              item.delivered_quantity,
              varianceQty,
              variancePercent,
              batchNumber,
              null,
              info.unit_cost || 0,
              lineTotal,
              remarks || null,
            ];
          });

          const grnItemSql = `
            INSERT INTO grn_items (
              grn_id,
              purchase_order_item_id,
              item_id,
              ordered_qty,
              received_qty,
              variance_qty,
              variance_percent,
              batch_number,
              expiry_date,
              unit_cost,
              line_total,
              notes
            ) VALUES ?
          `;

          db.query(grnItemSql, [grnItemValues], (itemErr) => {
            if (itemErr) {
              return res.status(500).json({ message: "DB error", error: itemErr.message });
            }

            let processed = 0;

            validItems.forEach((item, index) => {
              const batchCode = `BATCH-${grnId}-${index + 1}`;

              db.query(
                `INSERT INTO inventory_batches
                 (item_id, grn_id, batch_code, received_quantity, available_quantity, unit, received_date, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'Available')`,
                [
                  item.item_id,
                  grnId,
                  batchCode,
                  item.delivered_quantity,
                  item.delivered_quantity,
                  itemMap[item.item_id]?.unit || "",
                  received_date,
                ],
                (err) => {
                  if (err) return;

                  db.query(
                    `INSERT INTO stock_movements
                     (item_id, movement_type, reference_type, reference_id, quantity, notes)
                     VALUES (?, 'IN', 'GRN', ?, ?, ?)`,
                    [
                      item.item_id,
                      grnId,
                      item.delivered_quantity,
                      `Stock added from GRN ${grnNumber}`,
                    ],
                    () => {
                      refreshInventorySnapshot(item.item_id, () => {
                        processed++;

                        if (processed === validItems.length) {
                          return res.status(201).json({
                            message: "GRN created successfully",
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
          });
        }
      );
    }
  );
};

module.exports = {
  getAllGrn,
  getGrnById,
  getPurchaseOrderItemsForGrn,
  createGrn,
};