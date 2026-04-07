const db = require("../config/db");
const { refreshInventorySnapshot } = require("./inventoryController");

const BATCH_TABLE =
  process.env.BATCH_TABLE === "batches" ? "batches" : "inventory_batches";

const BATCH_CODE_COL = BATCH_TABLE === "batches" ? "batch_number" : "batch_code";
const BATCH_QTY_COL = BATCH_TABLE === "batches" ? "qty_remaining" : "available_quantity";

const CUSTOMER_DISPLAY_SQL = `
  CASE
    WHEN c.location_island IS NOT NULL AND TRIM(c.location_island) <> ''
      THEN CONCAT(c.customer_name, ' — ', c.location_island)
    WHEN c.city IS NOT NULL AND TRIM(c.city) <> ''
      THEN CONCAT(c.customer_name, ' — ', c.city)
    ELSE c.customer_name
  END
`;

const DOCS_DONE_SQL_CIF = `
  (
    (COALESCE(ed.commercial_invoice_status, 'pending') = 'done') +
    (COALESCE(ed.packing_list_status, 'pending') = 'done') +
    (COALESCE(ed.phytosanitary_certificate_status, 'pending') = 'done') +
    (COALESCE(ed.airway_bill_status, 'pending') = 'done') +
    (COALESCE(ed.certificate_of_origin_status, 'pending') = 'done') +
    (COALESCE(ed.health_certificate_status, 'pending') = 'done') +
    (COALESCE(ed.insurance_certificate_status, 'pending') = 'done')
  )
`;

const DOCS_DONE_SQL_NON_CIF = `
  (
    (COALESCE(ed.commercial_invoice_status, 'pending') = 'done') +
    (COALESCE(ed.packing_list_status, 'pending') = 'done') +
    (COALESCE(ed.phytosanitary_certificate_status, 'pending') = 'done') +
    (COALESCE(ed.airway_bill_status, 'pending') = 'done') +
    (COALESCE(ed.certificate_of_origin_status, 'pending') = 'done') +
    (COALESCE(ed.health_certificate_status, 'pending') = 'done')
  )
`;

const isInsuranceRequired = (incoterm) =>
  String(incoterm || "").toUpperCase() === "CIF";

const requiredDocsCount = (incoterm) => (isInsuranceRequired(incoterm) ? 7 : 6);

const docsDoneCountFromRow = (row, incoterm) => {
  const total =
    Number(row.commercial_invoice_status === "done") +
    Number(row.packing_list_status === "done") +
    Number(row.phytosanitary_certificate_status === "done") +
    Number(row.airway_bill_status === "done") +
    Number(row.certificate_of_origin_status === "done") +
    Number(row.health_certificate_status === "done") +
    Number(isInsuranceRequired(incoterm) && row.insurance_certificate_status === "done");

  return total;
};

const q = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

const beginTx = () =>
  new Promise((resolve, reject) => {
    db.beginTransaction((err) => {
      if (err) return reject(err);
      resolve();
    });
  });

const commitTx = () =>
  new Promise((resolve, reject) => {
    db.commit((err) => {
      if (err) return reject(err);
      resolve();
    });
  });

const rollbackTx = () =>
  new Promise((resolve) => {
    db.rollback(() => resolve());
  });

const buildShipmentNumber = async (dispatchDate) => {
  const year = new Date(dispatchDate || Date.now()).getFullYear();
  const rows = await q(`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM global_dispatch`);
  const runningNo = String(rows?.[0]?.next_id || 1).padStart(3, "0");
  return `SHP-${year}-${runningNo}`;
};

const getAllGlobalDispatches = (req, res) => {
  const sql = `
    SELECT
      gd.id,
      gd.dispatch_number,
      gd.dispatch_date,
      gd.departure_date,
      gd.airline,
      gd.flight_no,
      gd.awb_number,
      gd.incoterm,
      gd.total_weight,
      gd.total_boxes,
      gd.cold_chain_required,
      gd.status,
      gd.stock_deducted,
      gd.remarks,
      gd.created_at,
      ${CUSTOMER_DISPLAY_SQL} AS customer_name,
      c.customer_code,
      CASE
        WHEN UPPER(COALESCE(gd.incoterm, '')) = 'CIF' THEN ${DOCS_DONE_SQL_CIF}
        ELSE ${DOCS_DONE_SQL_NON_CIF}
      END AS docs_done_count,
      CASE
        WHEN UPPER(COALESCE(gd.incoterm, '')) = 'CIF' THEN 7
        ELSE 6
      END AS required_docs_count,
      COALESCE(ed.all_cleared, 0) AS all_cleared
    FROM global_dispatch gd
    JOIN customers c ON gd.customer_id = c.id
    LEFT JOIN export_documents ed ON ed.global_dispatch_id = gd.id
    ORDER BY gd.dispatch_date DESC, gd.id DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("getAllGlobalDispatches error:", err);
      return res.status(500).json({
        message: "Failed to load global shipments",
        error: err.message,
      });
    }

    res.json(rows);
  });
};

const getGlobalDispatchById = (req, res) => {
  const { id } = req.params;

  const headerSql = `
    SELECT
      gd.id,
      gd.dispatch_number,
      gd.dispatch_date,
      gd.departure_date,
      gd.airline,
      gd.flight_no,
      gd.awb_number,
      gd.incoterm,
      gd.total_weight,
      gd.total_boxes,
      gd.cold_chain_required,
      gd.status,
      gd.stock_deducted,
      gd.remarks,
      gd.created_at,
      gd.cleared_at,
      ${CUSTOMER_DISPLAY_SQL} AS customer_name,
      c.customer_code,
      c.customer_name AS raw_customer_name,
      c.contact_person,
      c.phone,
      c.email,
      c.city,
      c.location_island,
      c.airline_preference,
      c.incoterm AS customer_incoterm,
      COALESCE(ed.commercial_invoice_status, 'pending') AS commercial_invoice_status,
      COALESCE(ed.packing_list_status, 'pending') AS packing_list_status,
      COALESCE(ed.phytosanitary_certificate_status, 'pending') AS phytosanitary_certificate_status,
      COALESCE(ed.airway_bill_status, 'pending') AS airway_bill_status,
      COALESCE(ed.certificate_of_origin_status, 'pending') AS certificate_of_origin_status,
      COALESCE(ed.health_certificate_status, 'pending') AS health_certificate_status,
      COALESCE(ed.insurance_certificate_status, 'pending') AS insurance_certificate_status,
      COALESCE(ed.all_cleared, 0) AS all_cleared,
      COALESCE(ed.notes, '') AS export_notes,
      CASE
        WHEN UPPER(COALESCE(gd.incoterm, '')) = 'CIF' THEN 7
        ELSE 6
      END AS required_docs_count
    FROM global_dispatch gd
    JOIN customers c ON gd.customer_id = c.id
    LEFT JOIN export_documents ed ON ed.global_dispatch_id = gd.id
    WHERE gd.id = ?
    LIMIT 1
  `;

  const itemsSql = `
    SELECT
      gdi.id,
      gdi.item_id,
      gdi.batch_id,
      gdi.qty,
      gdi.boxes,
      gdi.unit,
      gdi.unit_price,
      gdi.line_total,
      gdi.notes,
      i.code AS item_code,
      i.name AS item_name,
      b.${BATCH_CODE_COL} AS batch_code,
      b.expiry_date
    FROM global_dispatch_items gdi
    JOIN items i ON i.id = gdi.item_id
    LEFT JOIN ${BATCH_TABLE} b ON b.id = gdi.batch_id
    WHERE gdi.global_dispatch_id = ?
    ORDER BY gdi.id ASC
  `;

  db.query(headerSql, [id], (headerErr, headerRows) => {
    if (headerErr) {
      console.error("getGlobalDispatchById header error:", headerErr);
      return res.status(500).json({
        message: "Failed to load shipment details",
        error: headerErr.message,
      });
    }

    if (!headerRows.length) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    db.query(itemsSql, [id], (itemsErr, itemRows) => {
      if (itemsErr) {
        console.error("getGlobalDispatchById items error:", itemsErr);
        return res.status(500).json({
          message: "Failed to load shipment items",
          error: itemsErr.message,
        });
      }

      const row = headerRows[0];

      res.json({
        ...row,
        items: itemRows,
        export_documents: {
          commercial_invoice_status: row.commercial_invoice_status,
          packing_list_status: row.packing_list_status,
          phytosanitary_certificate_status: row.phytosanitary_certificate_status,
          airway_bill_status: row.airway_bill_status,
          certificate_of_origin_status: row.certificate_of_origin_status,
          health_certificate_status: row.health_certificate_status,
          insurance_certificate_status: row.insurance_certificate_status,
          all_cleared: Number(row.all_cleared || 0) === 1,
          notes: row.export_notes || "",
        },
      });
    });
  });
};

const createGlobalDispatch = async (req, res) => {
  const {
    customer_id,
    dispatch_date,
    departure_date,
    airline,
    flight_no,
    awb_number,
    incoterm,
    cold_chain_required,
    remarks,
    items,
  } = req.body;

  const createdBy = req.user?.id || null;

  if (!customer_id || !dispatch_date || !airline || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      message: "Customer, shipment date, airline and at least one item are required",
    });
  }

  const cleanedItems = items
    .map((item) => ({
      item_id: Number(item.item_id),
      batch_id: item.batch_id ? Number(item.batch_id) : null,
      qty: Number(item.qty || 0),
      boxes: Number(item.boxes || 0),
    }))
    .filter((item) => item.item_id && item.batch_id && item.qty > 0);

  if (!cleanedItems.length) {
    return res.status(400).json({
      message: "At least one valid shipment item is required",
    });
  }

  const totalWeight = cleanedItems.reduce((sum, row) => sum + Number(row.qty || 0), 0);
  const totalBoxes = cleanedItems.reduce((sum, row) => sum + Number(row.boxes || 0), 0);

  let txStarted = false;

  try {
    await beginTx();
    txStarted = true;

    const customerRows = await q(
      `
      SELECT id
      FROM customers
      WHERE id = ? AND customer_type = 'global'
      LIMIT 1
      `,
      [Number(customer_id)]
    );

    if (!customerRows.length) {
      await rollbackTx();
      return res.status(404).json({
        message: "Selected global customer not found",
      });
    }

    for (const item of cleanedItems) {
      const batchRows = await q(
        `
        SELECT id, item_id, ${BATCH_CODE_COL} AS batch_code, ${BATCH_QTY_COL} AS qty_available
        FROM ${BATCH_TABLE}
        WHERE id = ? AND item_id = ?
        LIMIT 1
        `,
        [item.batch_id, item.item_id]
      );

      if (!batchRows.length) {
        await rollbackTx();
        return res.status(400).json({
          message: `Selected batch not found for item ${item.item_id}`,
        });
      }

      const batch = batchRows[0];

      if (Number(item.qty) > Number(batch.qty_available || 0)) {
        await rollbackTx();
        return res.status(400).json({
          message: `Not enough stock in batch ${batch.batch_code}`,
        });
      }
    }

    const dispatchNumber = await buildShipmentNumber(dispatch_date);

    const headerResult = await q(
      `
      INSERT INTO global_dispatch
      (
        dispatch_number,
        customer_id,
        dispatch_date,
        departure_date,
        airline,
        flight_no,
        awb_number,
        incoterm,
        total_weight,
        total_boxes,
        cold_chain_required,
        status,
        stock_deducted,
        remarks,
        created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'docs_pending', 0, ?, ?)
      `,
      [
        dispatchNumber,
        Number(customer_id),
        dispatch_date,
        departure_date || null,
        airline,
        flight_no || null,
        awb_number || null,
        incoterm || "CIF",
        totalWeight,
        totalBoxes,
        cold_chain_required ? 1 : 0,
        remarks || null,
        createdBy,
      ]
    );

    const globalDispatchId = headerResult.insertId;

    for (const item of cleanedItems) {
      await q(
        `
        INSERT INTO global_dispatch_items
        (
          global_dispatch_id,
          item_id,
          batch_id,
          qty,
          boxes,
          unit,
          unit_price,
          line_total,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          globalDispatchId,
          item.item_id,
          item.batch_id,
          item.qty,
          item.boxes,
          "kg",
          0,
          0,
          item.boxes ? `Boxes: ${item.boxes}` : null,
        ]
      );
    }

    await q(
      `
      INSERT INTO export_documents
      (
        global_dispatch_id,
        commercial_invoice_status,
        packing_list_status,
        phytosanitary_certificate_status,
        airway_bill_status,
        certificate_of_origin_status,
        health_certificate_status,
        insurance_certificate_status,
        all_cleared,
        notes,
        updated_by
      )
      VALUES (?, 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 0, NULL, ?)
      `,
      [globalDispatchId, createdBy]
    );

    await commitTx();

    return res.status(201).json({
      message: "Shipment created successfully",
      globalDispatchId,
      dispatchNumber,
    });
  } catch (err) {
    if (txStarted) {
      await rollbackTx();
    }

    console.error("createGlobalDispatch error:", err);

    return res.status(500).json({
      message: "Failed to create shipment",
      error: err.message,
    });
  }
};

const clearGlobalDispatch = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || null;
  let txStarted = false;

  try {
    const dispatchRows = await q(
      `
      SELECT gd.id, gd.status, gd.stock_deducted, gd.incoterm
      FROM global_dispatch gd
      WHERE gd.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!dispatchRows.length) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    const dispatch = dispatchRows[0];

    if (String(dispatch.status).toLowerCase() === "cleared") {
      return res.status(400).json({ message: "Shipment is already cleared" });
    }

    if (String(dispatch.status).toLowerCase() === "delivered") {
      return res.status(400).json({ message: "Delivered shipment cannot be cleared again" });
    }

    if (Number(dispatch.stock_deducted || 0) === 1) {
      return res.status(400).json({ message: "Stock already deducted for this shipment" });
    }

    const docsRows = await q(
      `
      SELECT
        ed.id,
        ed.commercial_invoice_status,
        ed.packing_list_status,
        ed.phytosanitary_certificate_status,
        ed.airway_bill_status,
        ed.certificate_of_origin_status,
        ed.health_certificate_status,
        ed.insurance_certificate_status,
        ed.all_cleared
      FROM export_documents ed
      WHERE ed.global_dispatch_id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!docsRows.length) {
      return res.status(400).json({ message: "Export document record not found" });
    }

    const docs = docsRows[0];
    const docsDoneCount = docsDoneCountFromRow(docs, dispatch.incoterm);
    const requiredCount = requiredDocsCount(dispatch.incoterm);
    const allDone =
      docsDoneCount === requiredCount && Number(docs.all_cleared || 0) === 1;

    if (!allDone) {
      return res.status(400).json({
        message:
          "All required export documents must be completed before clearing this shipment",
      });
    }

    const itemRows = await q(
      `
      SELECT
        gdi.id,
        gdi.item_id,
        gdi.batch_id,
        gdi.qty,
        i.name AS item_name,
        b.${BATCH_CODE_COL} AS batch_code,
        b.${BATCH_QTY_COL} AS qty_available
      FROM global_dispatch_items gdi
      JOIN items i ON i.id = gdi.item_id
      LEFT JOIN ${BATCH_TABLE} b ON b.id = gdi.batch_id
      WHERE gdi.global_dispatch_id = ?
      ORDER BY gdi.id ASC
      `,
      [id]
    );

    if (!itemRows.length) {
      return res.status(400).json({ message: "No items found for this shipment" });
    }

    for (const row of itemRows) {
      if (!row.batch_id) {
        return res.status(400).json({
          message: `Missing batch for item ${row.item_name}`,
        });
      }

      if (Number(row.qty_available || 0) < Number(row.qty || 0)) {
        return res.status(400).json({
          message: `Insufficient stock in batch ${row.batch_code || row.batch_id}`,
        });
      }
    }

    await beginTx();
    txStarted = true;

    for (const row of itemRows) {
      const nextQty = Number(row.qty_available || 0) - Number(row.qty || 0);

      await q(
        `
        UPDATE ${BATCH_TABLE}
        SET
          ${BATCH_QTY_COL} = ?,
          status = CASE
            WHEN ? <= 0 THEN 'Depleted'
            ELSE status
          END
        WHERE id = ?
        `,
        [nextQty, nextQty, row.batch_id]
      );
    }

    await q(
      `
      UPDATE global_dispatch
      SET
        status = 'cleared',
        stock_deducted = 1,
        cleared_by = ?,
        cleared_at = NOW()
      WHERE id = ?
      `,
      [userId, id]
    );

    await commitTx();

    const uniqueItemIds = [...new Set(itemRows.map((row) => row.item_id))];
    uniqueItemIds.forEach((itemId) => {
      refreshInventorySnapshot(itemId, () => {});
    });

    return res.json({
      message: "Shipment cleared and stock deducted successfully",
    });
  } catch (err) {
    if (txStarted) {
      await rollbackTx();
    }

    console.error("clearGlobalDispatch error:", err);

    return res.status(500).json({
      message: "Failed to clear shipment",
      error: err.message,
    });
  }
};

const markGlobalDispatchDelivered = (req, res) => {
  const { id } = req.params;

  const sql = `
    UPDATE global_dispatch
    SET status = 'delivered'
    WHERE id = ?
      AND status = 'cleared'
  `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("markGlobalDispatchDelivered error:", err);
      return res.status(500).json({
        message: "Failed to mark shipment delivered",
        error: err.message,
      });
    }

    if (!result.affectedRows) {
      return res.status(400).json({
        message: "Only cleared shipments can be marked delivered",
      });
    }

    res.json({ message: "Shipment marked delivered successfully" });
  });
};

module.exports = {
  getAllGlobalDispatches,
  getGlobalDispatchById,
  createGlobalDispatch,
  clearGlobalDispatch,
  markGlobalDispatchDelivered,
};