const db = require("../config/db");

/*
  If your system uses the old batch table, change this to "batches".
  Leave it as "inventory_batches" if your current inventory pages already work with that.
*/
const BATCH_TABLE = "batches";
const BATCH_CODE_COL = BATCH_TABLE === "batches" ? "batch_number" : "batch_code";
const BATCH_QTY_COL =
  BATCH_TABLE === "batches" ? "qty_remaining" : "available_quantity";
const BATCH_RECEIVED_COL =
  BATCH_TABLE === "batches" ? "qty_received" : "received_quantity";
const BATCH_ACTIVE_STATUS = BATCH_TABLE === "batches" ? "active" : "Available";
const BATCH_DEPLETED_STATUS = BATCH_TABLE === "batches" ? "depleted" : "Depleted";

const CUSTOMER_DISPLAY_SQL = `
  CASE
    WHEN c.city IS NOT NULL AND TRIM(c.city) <> ''
      THEN CONCAT(c.customer_name, ' — ', c.city)
    ELSE c.customer_name
  END
`;

const buildRunningNumber = (prefix) => {
  const last6 = String(Date.now()).slice(-6);
  return `${prefix}${last6}`;
};

const rollbackWithError = (res, err, message = "Database error") => {
  console.error(message, err);
  return res.status(500).json({
    message,
    error: err.message,
  });
};

const refreshInventorySnapshot = (itemId, callback = () => {}) => {
  const totalsSql = `
    SELECT
      COALESCE(SUM(${BATCH_RECEIVED_COL}), 0) AS qty_on_hand,
      COALESCE(SUM(${BATCH_QTY_COL}), 0) AS qty_available
    FROM ${BATCH_TABLE}
    WHERE item_id = ?
  `;

  const itemSql = `
    SELECT COALESCE(unit_cost, 0) AS unit_cost
    FROM items
    WHERE id = ?
    LIMIT 1
  `;

  db.query(totalsSql, [itemId], (totalsErr, totalsRows) => {
    if (totalsErr) return callback(totalsErr);

    db.query(itemSql, [itemId], (itemErr, itemRows) => {
      if (itemErr) return callback(itemErr);

      const qtyOnHand = Number(totalsRows?.[0]?.qty_on_hand || 0);
      const qtyAvailable = Number(totalsRows?.[0]?.qty_available || 0);
      const unitCost = Number(itemRows?.[0]?.unit_cost || 0);
      const totalValue = qtyAvailable * unitCost;

      const upsertSql = `
        INSERT INTO inventory
          (item_id, qty_on_hand, qty_reserved, qty_available, avg_unit_cost, total_value, last_movement_at, updated_at)
        VALUES (?, ?, 0, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          qty_on_hand = VALUES(qty_on_hand),
          qty_reserved = 0,
          qty_available = VALUES(qty_available),
          avg_unit_cost = VALUES(avg_unit_cost),
          total_value = VALUES(total_value),
          last_movement_at = NOW(),
          updated_at = NOW()
      `;

      db.query(
        upsertSql,
        [itemId, qtyOnHand, qtyAvailable, unitCost, totalValue],
        (upsertErr) => {
          if (!upsertErr) {
            const { triggerLowStockCheck } = require("../utils/notificationHelper");
            triggerLowStockCheck(itemId);
          }
          callback(upsertErr);
        }
      );
    });
  });
};

const resolveLocalCustomer = ({ customer_id, client_name }, callback) => {
  if (customer_id) {
    const byIdSql = `
      SELECT
        id,
        customer_name,
        city,
        delivery_window
      FROM customers
      WHERE id = ?
        AND customer_type = 'local'
      LIMIT 1
    `;

    db.query(byIdSql, [customer_id], (err, rows) => {
      if (err) return callback(err);

      if (!rows.length) {
        return callback(new Error("Selected local customer not found"));
      }

      return callback(null, rows[0]);
    });

    return;
  }

  if (!client_name) {
    return callback(new Error("Customer is required"));
  }

  const byNameSql = `
    SELECT
      id,
      customer_name,
      city,
      delivery_window
    FROM customers
    WHERE customer_type = 'local'
      AND (
        customer_name = ?
        OR CONCAT(customer_name, ' — ', city) = ?
        OR CONCAT(customer_name, ' - ', city) = ?
      )
    LIMIT 1
  `;

  db.query(byNameSql, [client_name, client_name, client_name], (err, rows) => {
    if (err) return callback(err);

    if (!rows.length) {
      return callback(new Error("Selected local customer not found"));
    }

    return callback(null, rows[0]);
  });
};

const getAllDispatches = (req, res) => {
  const sql = `
    SELECT
      ld.id,
      ld.dispatch_number,
      ld.delivery_note_number,
      ld.dispatch_date,
      ld.delivery_date,
      ld.status,
      ld.stock_deducted,
      ld.driver_name,
      ld.vehicle_number,
      ld.delivery_window,
      ld.notes AS remarks,
      ld.created_at,
      ld.delivered_at,
      ${CUSTOMER_DISPLAY_SQL} AS client_name,
      u.full_name AS created_by_name,
      COALESCE(agg.item_count, 0) AS item_count,
      COALESCE(agg.total_weight, 0) AS total_weight
    FROM local_dispatch ld
    JOIN customers c ON ld.customer_id = c.id
    LEFT JOIN users u ON ld.created_by = u.id
    LEFT JOIN (
      SELECT
        local_dispatch_id,
        COUNT(*) AS item_count,
        COALESCE(SUM(qty), 0) AS total_weight
      FROM local_dispatch_items
      GROUP BY local_dispatch_id
    ) agg ON agg.local_dispatch_id = ld.id
    ORDER BY ld.dispatch_date DESC, ld.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("getAllDispatches error:", err);
      return res.status(500).json({
        message: "Database error",
        error: err.message,
      });
    }

    res.json(results);
  });
};

const getDispatchById = (req, res) => {
  const { id } = req.params;

  const headerSql = `
    SELECT
      ld.id,
      ld.dispatch_number,
      ld.delivery_note_number,
      ld.dispatch_date,
      ld.delivery_date,
      ld.status,
      ld.stock_deducted,
      ld.driver_name,
      ld.vehicle_number,
      ld.delivery_window,
      ld.notes AS remarks,
      ld.created_at,
      ld.delivered_at,
      ${CUSTOMER_DISPLAY_SQL} AS client_name,
      c.customer_name,
      c.city,
      c.contact_person,
      c.phone,
      c.email,
      u.full_name AS created_by_name,
      du.full_name AS delivered_by_name,
      COALESCE(agg.item_count, 0) AS item_count,
      COALESCE(agg.total_weight, 0) AS total_weight
    FROM local_dispatch ld
    JOIN customers c ON ld.customer_id = c.id
    LEFT JOIN users u ON ld.created_by = u.id
    LEFT JOIN users du ON ld.delivered_by = du.id
    LEFT JOIN (
      SELECT
        local_dispatch_id,
        COUNT(*) AS item_count,
        COALESCE(SUM(qty), 0) AS total_weight
      FROM local_dispatch_items
      GROUP BY local_dispatch_id
    ) agg ON agg.local_dispatch_id = ld.id
    WHERE ld.id = ?
    LIMIT 1
  `;

  const itemsSql = `
    SELECT
      ldi.id,
      ldi.local_dispatch_id AS dispatch_id,
      ldi.item_id,
      ldi.batch_id,
      ldi.qty AS quantity,
      ldi.unit,
      ldi.unit_price,
      ldi.line_total,
      ldi.notes,
      i.code AS item_code,
      i.name AS item_name,
      b.${BATCH_CODE_COL} AS batch_code,
      b.expiry_date
    FROM local_dispatch_items ldi
    JOIN items i ON ldi.item_id = i.id
    LEFT JOIN ${BATCH_TABLE} b ON ldi.batch_id = b.id
    WHERE ldi.local_dispatch_id = ?
    ORDER BY ldi.id ASC
  `;

  db.query(headerSql, [id], (err, headerRows) => {
    if (err) {
      console.error("getDispatchById header error:", err);
      return res.status(500).json({
        message: "Database error",
        error: err.message,
      });
    }

    if (!headerRows.length) {
      return res.status(404).json({ message: "Dispatch not found" });
    }

    db.query(itemsSql, [id], (itemErr, itemRows) => {
      if (itemErr) {
        console.error("getDispatchById items error:", itemErr);
        return res.status(500).json({
          message: "Database error",
          error: itemErr.message,
        });
      }

      res.json({
        ...headerRows[0],
        items: itemRows,
      });
    });
  });
};

const createDispatch = (req, res) => {
  const {
    customer_id,
    client_name,
    dispatch_date,
    delivery_date,
    driver_name,
    vehicle_number,
    delivery_window,
    remarks,
    notes,
    items,
  } = req.body;

  const created_by = req.user?.id || null;

  if (!dispatch_date || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "Dispatch date and at least one item are required",
    });
  }

  const cleanedItems = items
    .map((item) => ({
      item_id: Number(item.item_id),
      batch_id: item.batch_id ? Number(item.batch_id) : null,
      qty: Number(item.quantity ?? item.qty ?? 0),
      notes: item.notes || null,
    }))
    .filter((item) => item.item_id && item.qty > 0);

  if (!cleanedItems.length) {
    return res.status(400).json({
      message: "At least one valid dispatch line is required",
    });
  }

  resolveLocalCustomer({ customer_id, client_name }, (customerErr, customer) => {
    if (customerErr) {
      return res.status(400).json({ message: customerErr.message });
    }

    const dispatchNumber = buildRunningNumber("DSP-L-");
    const deliveryNoteNumber = buildRunningNumber("DN-L-");

    const insertHeaderSql = `
      INSERT INTO local_dispatch
        (
          dispatch_number,
          delivery_note_number,
          customer_id,
          dispatch_date,
          delivery_date,
          status,
          stock_deducted,
          driver_name,
          vehicle_number,
          delivery_window,
          notes,
          created_by
        )
      VALUES (?, ?, ?, ?, ?, 'scheduled', 0, ?, ?, ?, ?, ?)
    `;

    db.beginTransaction((txErr) => {
      if (txErr) {
        return rollbackWithError(res, txErr, "Failed to start transaction");
      }

      db.query(
        insertHeaderSql,
        [
          dispatchNumber,
          deliveryNoteNumber,
          customer.id,
          dispatch_date,
          delivery_date || null,
          driver_name || null,
          vehicle_number || null,
          delivery_window || customer.delivery_window || null,
          remarks || notes || null,
          created_by,
        ],
        (headerErr, headerResult) => {
          if (headerErr) {
            return db.rollback(() =>
              rollbackWithError(res, headerErr, "Failed to create local dispatch")
            );
          }

          const dispatchId = headerResult.insertId;

          const insertNextItem = (index) => {
            if (index >= cleanedItems.length) {
              return db.commit((commitErr) => {
                if (commitErr) {
                  return db.rollback(() =>
                    rollbackWithError(res, commitErr, "Failed to commit local dispatch")
                  );
                }

                const { sendNotification } = require("../utils/notificationHelper");
                
                // Notify Supervisor
                sendNotification({
                  role: "supervisor",
                  title: "Dispatch Ready for Review",
                  message: `Local dispatch ${dispatchNumber} is ready for review.`,
                  type: "dispatch_ready"
                }).catch(err => console.error("Local dispatch ready notification error:", err.message));

                // Notify Logistics
                sendNotification({
                  role: "logistics",
                  title: "New Dispatch Assigned",
                  message: `Local dispatch ${dispatchNumber} has been assigned.`,
                  type: "dispatch_assigned"
                }).catch(err => console.error("Local dispatch assigned notification error:", err.message));

                return res.status(201).json({
                  message: "Dispatch created successfully",
                  dispatchId,
                  dispatchNumber,
                  deliveryNoteNumber,
                });
              });
            }

            const row = cleanedItems[index];

            const itemSql = `
              SELECT
                id,
                unit,
                COALESCE(unit_cost, 0) AS unit_cost
              FROM items
              WHERE id = ?
              LIMIT 1
            `;

            db.query(itemSql, [row.item_id], (itemErr, itemRows) => {
              if (itemErr) {
                return db.rollback(() =>
                  rollbackWithError(res, itemErr, "Failed to load item details")
                );
              }

              if (!itemRows.length) {
                return db.rollback(() =>
                  res.status(404).json({ message: `Item ${row.item_id} not found` })
                );
              }

              const itemInfo = itemRows[0];
              const unitPrice = Number(itemInfo.unit_cost || 0);
              const lineTotal = Number(row.qty) * unitPrice;

              const continueInsert = () => {
                const insertItemSql = `
                  INSERT INTO local_dispatch_items
                    (
                      local_dispatch_id,
                      item_id,
                      batch_id,
                      qty,
                      unit,
                      unit_price,
                      line_total,
                      notes
                    )
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `;

                db.query(
                  insertItemSql,
                  [
                    dispatchId,
                    row.item_id,
                    row.batch_id,
                    row.qty,
                    itemInfo.unit || "kg",
                    unitPrice,
                    lineTotal,
                    row.notes,
                  ],
                  (insertErr) => {
                    if (insertErr) {
                      return db.rollback(() =>
                        rollbackWithError(res, insertErr, "Failed to insert dispatch item")
                      );
                    }

                    insertNextItem(index + 1);
                  }
                );
              };

              if (!row.batch_id) {
                return continueInsert();
              }

              const batchSql = `
                SELECT
                  id,
                  item_id,
                  ${BATCH_CODE_COL} AS batch_code,
                  COALESCE(${BATCH_QTY_COL}, 0) AS qty_available
                FROM ${BATCH_TABLE}
                WHERE id = ?
                  AND item_id = ?
                LIMIT 1
              `;

              db.query(batchSql, [row.batch_id, row.item_id], (batchErr, batchRows) => {
                if (batchErr) {
                  return db.rollback(() =>
                    rollbackWithError(res, batchErr, "Failed to validate batch")
                  );
                }

                if (!batchRows.length) {
                  return db.rollback(() =>
                    res.status(404).json({
                      message: `Selected batch not found for item ${row.item_id}`,
                    })
                  );
                }

                const batch = batchRows[0];

                if (Number(row.qty) > Number(batch.qty_available || 0)) {
                  return db.rollback(() =>
                    res.status(400).json({
                      message: `Not enough stock in batch ${batch.batch_code}`,
                    })
                  );
                }

                continueInsert();
              });
            });
          };

          insertNextItem(0);
        }
      );
    });
  });
};

const markDispatchDelivered = (req, res) => {
  const { id } = req.params;
  const delivered_by = req.user?.id || null;

  const headerSql = `
    SELECT
      ld.id,
      ld.dispatch_number,
      ld.status,
      ld.stock_deducted,
      ${CUSTOMER_DISPLAY_SQL} AS client_name
    FROM local_dispatch ld
    JOIN customers c ON ld.customer_id = c.id
    WHERE ld.id = ?
    LIMIT 1
  `;

  const itemsSql = `
    SELECT
      ldi.id,
      ldi.item_id,
      ldi.batch_id,
      ldi.qty
    FROM local_dispatch_items ldi
    WHERE ldi.local_dispatch_id = ?
    ORDER BY ldi.id ASC
  `;

  db.query(headerSql, [id], (headerErr, headerRows) => {
    if (headerErr) {
      return rollbackWithError(res, headerErr, "Failed to load local dispatch");
    }

    if (!headerRows.length) {
      return res.status(404).json({ message: "Dispatch not found" });
    }

    const dispatchRow = headerRows[0];

    if (
      String(dispatchRow.status || "").toLowerCase() === "delivered" ||
      Number(dispatchRow.stock_deducted || 0) === 1
    ) {
      return res.status(400).json({ message: "Dispatch is already delivered" });
    }

    db.query(itemsSql, [id], (itemsErr, itemRows) => {
      if (itemsErr) {
        return rollbackWithError(res, itemsErr, "Failed to load dispatch items");
      }

      if (!itemRows.length) {
        return res.status(400).json({ message: "Dispatch has no items" });
      }

      db.beginTransaction((txErr) => {
        if (txErr) {
          return rollbackWithError(res, txErr, "Failed to start transaction");
        }

        const processNext = (index) => {
          if (index >= itemRows.length) {
            const updateHeaderSql = `
              UPDATE local_dispatch
              SET
                status = 'delivered',
                stock_deducted = 1,
                delivered_by = ?,
                delivered_at = NOW(),
                delivery_date = COALESCE(delivery_date, CURDATE())
              WHERE id = ?
            `;

            return db.query(updateHeaderSql, [delivered_by, id], (updateErr) => {
              if (updateErr) {
                return db.rollback(() =>
                  rollbackWithError(res, updateErr, "Failed to update dispatch status")
                );
              }

              return db.commit((commitErr) => {
                if (commitErr) {
                  return db.rollback(() =>
                    rollbackWithError(res, commitErr, "Failed to commit delivered dispatch")
                  );
                }

                const { sendNotification } = require("../utils/notificationHelper");
                sendNotification({
                  role: "logistics",
                  title: "Dispatch Status Changed",
                  message: `Local dispatch ${dispatchRow.dispatch_number} status has been updated to delivered.`,
                  type: "dispatch_status"
                }).catch(err => console.error("Local dispatch delivery notification error:", err.message));

                return res.json({
                  message: "Dispatch marked delivered and stock deducted successfully",
                });
              });
            });
          }

          const row = itemRows[index];

          if (!row.batch_id) {
            return db.rollback(() =>
              res.status(400).json({
                message: "A dispatch item is missing its FEFO batch",
              })
            );
          }

          const batchSql = `
            SELECT
              id,
              item_id,
              ${BATCH_CODE_COL} AS batch_code,
              COALESCE(${BATCH_QTY_COL}, 0) AS qty_available
            FROM ${BATCH_TABLE}
            WHERE id = ?
              AND item_id = ?
            LIMIT 1
          `;

          db.query(batchSql, [row.batch_id, row.item_id], (batchErr, batchRows) => {
            if (batchErr) {
              return db.rollback(() =>
                rollbackWithError(res, batchErr, "Failed to load batch for delivery")
              );
            }

            if (!batchRows.length) {
              return db.rollback(() =>
                res.status(404).json({
                  message: `Batch not found for item ${row.item_id}`,
                })
              );
            }

            const batch = batchRows[0];
            const currentQty = Number(batch.qty_available || 0);
            const deductQty = Number(row.qty || 0);

            if (deductQty > currentQty) {
              return db.rollback(() =>
                res.status(400).json({
                  message: `Not enough stock in batch ${batch.batch_code}`,
                })
              );
            }

            const nextQty = currentQty - deductQty;
            const nextStatus =
              nextQty <= 0 ? BATCH_DEPLETED_STATUS : BATCH_ACTIVE_STATUS;

            const updateBatchSql = `
              UPDATE ${BATCH_TABLE}
              SET
                ${BATCH_QTY_COL} = ?,
                status = ?
              WHERE id = ?
            `;

            db.query(updateBatchSql, [nextQty, nextStatus, row.batch_id], (updateErr) => {
              if (updateErr) {
                return db.rollback(() =>
                  rollbackWithError(res, updateErr, "Failed to update batch stock")
                );
              }

              const movementSql = `
                INSERT INTO stock_movements
                  (item_id, movement_type, reference_type, reference_id, quantity, notes)
                VALUES (?, 'OUT', 'DISPATCH', ?, ?, ?)
              `;

              db.query(
                movementSql,
                [
                  row.item_id,
                  id,
                  deductQty,
                  `Local dispatch delivered to ${dispatchRow.client_name}`,
                ],
                (movementErr) => {
                  if (movementErr) {
                    return db.rollback(() =>
                      rollbackWithError(res, movementErr, "Failed to create stock movement")
                    );
                  }

                  refreshInventorySnapshot(row.item_id, (refreshErr) => {
                    if (refreshErr) {
                      return db.rollback(() =>
                        rollbackWithError(
                          res,
                          refreshErr,
                          "Failed to refresh inventory snapshot"
                        )
                      );
                    }

                    processNext(index + 1);
                  });
                }
              );
            });
          });
        };

        processNext(0);
      });
    });
  });
};

module.exports = {
  getAllDispatches,
  getDispatchById,
  createDispatch,
  markDispatchDelivered,
};