const db = require("../config/db");
const { refreshInventorySnapshot } = require("./inventoryController");

const BATCH_TABLE = "batches";

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

let globalSchemaCache = null;

const getGlobalDispatchSchema = async () => {
  if (globalSchemaCache) return globalSchemaCache;

  const dispatchCols = await q(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'global_dispatch'
  `);

  const itemCols = await q(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'global_dispatch_items'
  `);

  const dispatchSet = new Set(dispatchCols.map((row) => row.COLUMN_NAME));
  const itemSet = new Set(itemCols.map((row) => row.COLUMN_NAME));

  globalSchemaCache = {
    hasFlightNo: dispatchSet.has("flight_no"),
    hasAwbNumber: dispatchSet.has("awb_number"),
    hasTotalWeight: dispatchSet.has("total_weight"),
    hasTotalBoxes: dispatchSet.has("total_boxes"),
    hasItemBoxes: itemSet.has("boxes"),
  };

  return globalSchemaCache;
};

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

const buildShipmentNumber = async (dispatchDate) => {
  const year = new Date(dispatchDate || Date.now()).getFullYear();
  const rows = await q(`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM global_dispatch`);
  const runningNo = String(rows?.[0]?.next_id || 1).padStart(3, "0");
  return `SHP-${year}-${runningNo}`;
};

const parseDispatchMetaFromRemarks = (remarks) => {
  const raw = String(remarks || "");
  const flightMatch = raw.match(/Flight No:\s*(.+)/i);
  const awbMatch = raw.match(/AWB No:\s*(.+)/i);

  return {
    flight_no: flightMatch ? flightMatch[1].trim() : "",
    awb_number: awbMatch ? awbMatch[1].trim() : "",
  };
};

const mergeDispatchRemarks = ({ remarks, flight_no, awb_number, shouldEmbed }) => {
  const lines = [];

  if (remarks) lines.push(String(remarks).trim());
  if (shouldEmbed && flight_no) lines.push(`Flight No: ${String(flight_no).trim()}`);
  if (shouldEmbed && awb_number) lines.push(`AWB No: ${String(awb_number).trim()}`);

  return lines.filter(Boolean).join("\n");
};

const parseBoxesFromNotes = (notes) => {
  const raw = String(notes || "");
  const match = raw.match(/Boxes:\s*(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : 0;
};

const getAllGlobalDispatches = async (req, res) => {
  try {
    const schema = await getGlobalDispatchSchema();

    const totalBoxesSelect = schema.hasTotalBoxes
      ? `gd.total_boxes`
      : schema.hasItemBoxes
      ? `COALESCE(it.total_boxes, 0) AS total_boxes`
      : `0 AS total_boxes`;

    const totalWeightSelect = schema.hasTotalWeight
      ? `gd.total_weight`
      : `COALESCE(it.total_weight, 0) AS total_weight`;

    const flightNoSelect = schema.hasFlightNo ? `gd.flight_no` : `NULL AS flight_no`;
    const awbSelect = schema.hasAwbNumber ? `gd.awb_number` : `NULL AS awb_number`;

    const itemTotalsSql = `
      SELECT
        global_dispatch_id,
        COALESCE(SUM(qty), 0) AS total_weight
        ${schema.hasItemBoxes ? `, COALESCE(SUM(boxes), 0) AS total_boxes` : ``}
      FROM global_dispatch_items
      GROUP BY global_dispatch_id
    `;

    const rows = await q(`
      SELECT
        gd.id,
        gd.dispatch_number,
        gd.dispatch_date,
        gd.departure_date,
        gd.airline,
        ${flightNoSelect},
        ${awbSelect},
        gd.incoterm,
        ${totalWeightSelect},
        ${totalBoxesSelect},
        gd.cold_chain_required,
        gd.status,
        gd.stock_deducted,
        gd.remarks,
        gd.created_at,
        ${CUSTOMER_DISPLAY_SQL} AS customer_name,
        c.customer_code,
        (
          (COALESCE(ed.commercial_invoice_status, 'pending') = 'done') +
          (COALESCE(ed.packing_list_status, 'pending') = 'done') +
          (COALESCE(ed.phytosanitary_certificate_status, 'pending') = 'done') +
          (COALESCE(ed.airway_bill_status, 'pending') = 'done') +
          (COALESCE(ed.certificate_of_origin_status, 'pending') = 'done') +
          (COALESCE(ed.health_certificate_status, 'pending') = 'done') +
          (COALESCE(ed.insurance_certificate_status, 'pending') = 'done')
        ) AS docs_done_count,
        CASE
          WHEN UPPER(COALESCE(gd.incoterm, '')) = 'CIF' THEN 7
          ELSE 6
        END AS required_docs_count,
        COALESCE(ed.all_cleared, 0) AS all_cleared
      FROM global_dispatch gd
      JOIN customers c ON gd.customer_id = c.id
      LEFT JOIN export_documents ed ON ed.global_dispatch_id = gd.id
      LEFT JOIN (${itemTotalsSql}) it ON it.global_dispatch_id = gd.id
      ORDER BY gd.dispatch_date DESC, gd.id DESC
    `);

    const normalized = rows.map((row) => {
      const parsed = parseDispatchMetaFromRemarks(row.remarks);
      return {
        ...row,
        flight_no: row.flight_no || parsed.flight_no || "",
        awb_number: row.awb_number || parsed.awb_number || "",
      };
    });

    res.json(normalized);
  } catch (err) {
    console.error("getAllGlobalDispatches error:", err);
    res.status(500).json({
      message: "Failed to load global shipments",
      error: err.message,
    });
  }
};

const getGlobalDispatchById = async (req, res) => {
  try {
    const { id } = req.params;
    const schema = await getGlobalDispatchSchema();

    const totalBoxesSelect = schema.hasTotalBoxes
      ? `gd.total_boxes`
      : schema.hasItemBoxes
      ? `COALESCE(it.total_boxes, 0) AS total_boxes`
      : `0 AS total_boxes`;

    const totalWeightSelect = schema.hasTotalWeight
      ? `gd.total_weight`
      : `COALESCE(it.total_weight, 0) AS total_weight`;

    const flightNoSelect = schema.hasFlightNo ? `gd.flight_no` : `NULL AS flight_no`;
    const awbSelect = schema.hasAwbNumber ? `gd.awb_number` : `NULL AS awb_number`;

    const itemTotalsSql = `
      SELECT
        global_dispatch_id,
        COALESCE(SUM(qty), 0) AS total_weight
        ${schema.hasItemBoxes ? `, COALESCE(SUM(boxes), 0) AS total_boxes` : ``}
      FROM global_dispatch_items
      GROUP BY global_dispatch_id
    `;

    const headerRows = await q(
      `
      SELECT
        gd.id,
        gd.dispatch_number,
        gd.dispatch_date,
        gd.departure_date,
        gd.airline,
        ${flightNoSelect},
        ${awbSelect},
        gd.incoterm,
        ${totalWeightSelect},
        ${totalBoxesSelect},
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
      LEFT JOIN (${itemTotalsSql}) it ON it.global_dispatch_id = gd.id
      WHERE gd.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!headerRows.length) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    const itemRows = await q(
      `
      SELECT
        gdi.id,
        gdi.item_id,
        gdi.batch_id,
        gdi.qty,
        ${schema.hasItemBoxes ? "gdi.boxes" : "0 AS boxes"},
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
      `,
      [id]
    );

    const header = headerRows[0];
    const parsed = parseDispatchMetaFromRemarks(header.remarks);

    const normalizedItems = itemRows.map((row) => ({
      ...row,
      boxes: schema.hasItemBoxes ? Number(row.boxes || 0) : parseBoxesFromNotes(row.notes),
    }));

    res.json({
      ...header,
      flight_no: header.flight_no || parsed.flight_no || "",
      awb_number: header.awb_number || parsed.awb_number || "",
      items: normalizedItems,
      export_documents: {
        commercial_invoice_status: header.commercial_invoice_status,
        packing_list_status: header.packing_list_status,
        phytosanitary_certificate_status: header.phytosanitary_certificate_status,
        airway_bill_status: header.airway_bill_status,
        certificate_of_origin_status: header.certificate_of_origin_status,
        health_certificate_status: header.health_certificate_status,
        insurance_certificate_status: header.insurance_certificate_status,
        all_cleared: Number(header.all_cleared || 0) === 1,
        notes: header.export_notes || "",
      },
    });
  } catch (err) {
    console.error("getGlobalDispatchById error:", err);
    res.status(500).json({
      message: "Failed to load shipment details",
      error: err.message,
    });
  }
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

  let txStarted = false;

  try {
    const schema = await getGlobalDispatchSchema();
    const totalWeight = cleanedItems.reduce((sum, row) => sum + Number(row.qty || 0), 0);
    const totalBoxes = cleanedItems.reduce((sum, row) => sum + Number(row.boxes || 0), 0);

    await beginTx();
    txStarted = true;

    const customerRows = await q(
      `
      SELECT id
      FROM customers
      WHERE id = ?
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

    const headerColumns = [
      "dispatch_number",
      "customer_id",
      "dispatch_date",
      "departure_date",
      "airline",
      "incoterm",
      "cold_chain_required",
      "status",
      "stock_deducted",
      "remarks",
      "created_by",
    ];

    const headerValues = [
      dispatchNumber,
      Number(customer_id),
      dispatch_date,
      departure_date || null,
      airline,
      incoterm || "CIF",
      cold_chain_required ? 1 : 0,
      "docs_pending",
      0,
      mergeDispatchRemarks({
        remarks,
        flight_no,
        awb_number,
        shouldEmbed: !schema.hasFlightNo || !schema.hasAwbNumber,
      }),
      createdBy,
    ];

    if (schema.hasFlightNo) {
      headerColumns.splice(5, 0, "flight_no");
      headerValues.splice(5, 0, flight_no || null);
    }

    if (schema.hasAwbNumber) {
      const insertAt = schema.hasFlightNo ? 7 : 6;
      headerColumns.splice(insertAt, 0, "awb_number");
      headerValues.splice(insertAt, 0, awb_number || null);
    }

    if (schema.hasTotalWeight) {
      const insertAt = headerColumns.indexOf("cold_chain_required");
      headerColumns.splice(insertAt, 0, "total_weight");
      headerValues.splice(insertAt, 0, totalWeight);
    }

    if (schema.hasTotalBoxes) {
      const insertAt = headerColumns.indexOf("cold_chain_required");
      headerColumns.splice(insertAt + (schema.hasTotalWeight ? 1 : 0), 0, "total_boxes");
      headerValues.splice(insertAt + (schema.hasTotalWeight ? 1 : 0), 0, totalBoxes);
    }

    const headerResult = await q(
      `
      INSERT INTO global_dispatch
      (${headerColumns.join(", ")})
      VALUES (${headerColumns.map(() => "?").join(", ")})
      `,
      headerValues
    );

    const globalDispatchId = headerResult.insertId;

    for (const item of cleanedItems) {
      const itemColumns = [
        "global_dispatch_id",
        "item_id",
        "batch_id",
        "qty",
        "unit",
        "unit_price",
        "line_total",
        "notes",
      ];

      const itemValues = [
        globalDispatchId,
        item.item_id,
        item.batch_id,
        item.qty,
        "kg",
        0,
        0,
        !schema.hasItemBoxes && item.boxes > 0 ? `Boxes: ${item.boxes}` : null,
      ];

      if (schema.hasItemBoxes) {
        itemColumns.splice(4, 0, "boxes");
        itemValues.splice(4, 0, item.boxes || 0);
      }

      await q(
        `
        INSERT INTO global_dispatch_items
        (${itemColumns.join(", ")})
        VALUES (${itemColumns.map(() => "?").join(", ")})
        `,
        itemValues
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

    const { sendNotification } = require("../utils/notificationHelper");
    
    // Notify Supervisor
    sendNotification({
      role: "supervisor",
      title: "Dispatch Ready for Review",
      message: `Global dispatch ${dispatchNumber} is ready for review.`,
      type: "dispatch_ready"
    }).catch(err => console.error("Global dispatch ready notification error:", err.message));

    // Notify Logistics
    sendNotification({
      role: "logistics",
      title: "New Dispatch Assigned",
      message: `Global dispatch ${dispatchNumber} has been assigned.`,
      type: "dispatch_assigned"
    }).catch(err => console.error("Global dispatch assigned notification error:", err.message));

    res.status(201).json({
      message: "Shipment created successfully",
      globalDispatchId,
      dispatchNumber,
    });
  } catch (err) {
    if (txStarted) {
      await rollbackTx();
    }

    console.error("createGlobalDispatch error:", err);

    res.status(500).json({
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
        message: "All required export documents must be completed before clearing this shipment",
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

    const { sendNotification } = require("../utils/notificationHelper");
    sendNotification({
      role: "logistics",
      title: "Dispatch Status Changed",
      message: `Global dispatch ID ${id} status has been updated to cleared.`,
      type: "dispatch_status"
    }).catch(err => console.error("Global dispatch cleared notification error:", err.message));

    res.json({
      message: "Shipment cleared and stock deducted successfully",
    });
  } catch (err) {
    if (txStarted) {
      await rollbackTx();
    }

    console.error("clearGlobalDispatch error:", err);

    res.status(500).json({
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

    const { sendNotification } = require("../utils/notificationHelper");
    sendNotification({
      role: "logistics",
      title: "Dispatch Status Changed",
      message: `Global dispatch ID ${id} status has been updated to delivered.`,
      type: "dispatch_status"
    }).catch(err => console.error("Global dispatch delivery notification error:", err.message));

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