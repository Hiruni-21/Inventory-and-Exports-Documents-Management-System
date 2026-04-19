const db = require("../config/db");

const q = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

let ensuredTables = false;
let tableColumnsCache = {};
let poMetaCache = null;
let poItemsMetaCache = null;
let goodsReturnMetaCache = null;

const getTableColumns = async (tableName) => {
  if (tableColumnsCache[tableName]) return tableColumnsCache[tableName];

  const rows = await q(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
    `,
    [tableName]
  );

  const set = new Set(rows.map((row) => row.COLUMN_NAME));
  tableColumnsCache[tableName] = set;
  return set;
};

const ensureSupplierPortalTables = async () => {
  if (ensuredTables) return;

  await q(`
    CREATE TABLE IF NOT EXISTS supplier_po_responses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      purchase_order_id INT NOT NULL,
      supplier_id INT NOT NULL,
      response_status ENUM('accepted','rejected') NOT NULL,
      feedback_notes TEXT NULL,
      responded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_supplier_po_response (purchase_order_id, supplier_id)
    )
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS supplier_return_responses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      goods_return_id INT NOT NULL,
      supplier_id INT NOT NULL,
      response_status ENUM('acknowledged','disputed') NOT NULL,
      feedback_notes TEXT NULL,
      responded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_supplier_return_response (goods_return_id, supplier_id)
    )
  `);

  await q(`
    CREATE TABLE IF NOT EXISTS supplier_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      supplier_id INT NOT NULL,
      message_type VARCHAR(80) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      message_body TEXT NOT NULL,
      linked_kind ENUM('none','order','return') NOT NULL DEFAULT 'none',
      linked_record_id INT NULL,
      sent_by VARCHAR(40) NOT NULL DEFAULT 'You',
      status VARCHAR(40) NOT NULL DEFAULT 'Sent',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  ensuredTables = true;
};

const getPurchaseOrderMeta = async () => {
  if (poMetaCache) return poMetaCache;

  const cols = await getTableColumns("purchase_orders");

  poMetaCache = {
    requiredDateCol: cols.has("expected_date")
      ? "expected_date"
      : cols.has("required_date")
      ? "required_date"
      : null,
    notesCol: cols.has("notes")
      ? "notes"
      : cols.has("remarks")
      ? "remarks"
      : null,
    paymentTermsCol: cols.has("payment_terms")
      ? "payment_terms"
      : null,
    totalAmountCol: cols.has("total_amount")
      ? "total_amount"
      : cols.has("grand_total")
      ? "grand_total"
      : null,
    userRefCol: cols.has("sent_by")
      ? "sent_by"
      : cols.has("approved_by")
      ? "approved_by"
      : cols.has("requested_by")
      ? "requested_by"
      : cols.has("created_by")
      ? "created_by"
      : null,
  };

  return poMetaCache;
};

const getPoItemsMeta = async () => {
  if (poItemsMetaCache) return poItemsMetaCache;

  const poiCols = await getTableColumns("purchase_order_items");
  const poiExists = poiCols.size > 0;

  const tableName = poiExists ? "purchase_order_items" : "po_items";
  const cols = poiExists ? poiCols : await getTableColumns("po_items");

  poItemsMetaCache = {
    tableName,
    qtyCol: cols.has("quantity")
      ? "quantity"
      : cols.has("ordered_qty")
      ? "ordered_qty"
      : "quantity",
    rateCol: cols.has("unit_price")
      ? "unit_price"
      : cols.has("price")
      ? "price"
      : cols.has("rate")
      ? "rate"
      : null,
    noteCol: cols.has("notes") ? "notes" : null,
  };

  return poItemsMetaCache;
};

const getGoodsReturnMeta = async () => {
  if (goodsReturnMetaCache) return goodsReturnMetaCache;

  const cols = await getTableColumns("goods_returns");

  goodsReturnMetaCache = {
    qtyCol: cols.has("quantity")
      ? "quantity"
      : cols.has("qty")
      ? "qty"
      : "quantity",
    reasonCol: cols.has("reason")
      ? "reason"
      : cols.has("cause")
      ? "cause"
      : null,
    notesCol: cols.has("notes") ? "notes" : null,
    poIdCol: cols.has("purchase_order_id")
      ? "purchase_order_id"
      : cols.has("po_id")
      ? "po_id"
      : null,
    deductionCol: cols.has("deduction_amount")
      ? "deduction_amount"
      : cols.has("deducted_amount")
      ? "deducted_amount"
      : cols.has("amount")
      ? "amount"
      : null,
  };

  return goodsReturnMetaCache;
};

const getSupplierOrders = async (req, res) => {
  try {
    await ensureSupplierPortalTables();

    const supplierId = Number(req.user?.supplier_id || 0);
    if (!supplierId) return res.json([]);

    const poMeta = await getPurchaseOrderMeta();
    const itemsMeta = await getPoItemsMeta();

    const requiredDateSelect = poMeta.requiredDateCol
      ? `po.${poMeta.requiredDateCol} AS required_date`
      : `NULL AS required_date`;

    const notesSelect = poMeta.notesCol
      ? `po.${poMeta.notesCol} AS notes`
      : `NULL AS notes`;

    const paymentTermsSelect = poMeta.paymentTermsCol
      ? `po.${poMeta.paymentTermsCol} AS payment_terms`
      : `NULL AS payment_terms`;

    const totalValueSelect = poMeta.totalAmountCol
      ? `COALESCE(po.${poMeta.totalAmountCol}, 0) AS total_amount`
      : `COALESCE(poi_summary.total_amount, 0) AS total_amount`;

    const createdByJoin = poMeta.userRefCol
      ? `LEFT JOIN users u ON u.id = po.${poMeta.userRefCol}`
      : ``;

    const createdBySelect = poMeta.userRefCol
      ? `u.full_name AS created_by_name`
      : `NULL AS created_by_name`;

    const itemsSummarySql = `
      SELECT
        poi.purchase_order_id,
        COUNT(*) AS item_count,
        GROUP_CONCAT(
          CONCAT(
            i.name,
            '||',
            CAST(poi.${itemsMeta.qtyCol} AS CHAR),
            '||',
            COALESCE(i.unit, '')
          )
          ORDER BY poi.id
          SEPARATOR '~~~'
        ) AS item_preview,
        COALESCE(SUM(${
          itemsMeta.rateCol
            ? `COALESCE(poi.${itemsMeta.qtyCol}, 0) * COALESCE(poi.${itemsMeta.rateCol}, 0)`
            : `0`
        }), 0) AS total_amount
      FROM ${itemsMeta.tableName} poi
      JOIN items i ON i.id = poi.item_id
      GROUP BY poi.purchase_order_id
    `;

    const rows = await q(
      `
      SELECT
        po.id,
        po.po_number,
        po.order_date,
        ${requiredDateSelect},
        po.status,
        po.created_at,
        ${notesSelect},
        ${paymentTermsSelect},
        ${totalValueSelect},
        s.supplier_name,
        ${createdBySelect},
        poi_summary.item_count,
        poi_summary.item_preview,
        spr.response_status AS supplier_response_status,
        spr.feedback_notes AS supplier_response_notes,
        spr.responded_at AS supplier_responded_at
      FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN (${itemsSummarySql}) poi_summary ON poi_summary.purchase_order_id = po.id
      ${createdByJoin}
      LEFT JOIN supplier_po_responses spr
        ON spr.purchase_order_id = po.id
       AND spr.supplier_id = po.supplier_id
      WHERE po.supplier_id = ?
      ORDER BY po.id DESC
      `,
      [supplierId]
    );

    res.json(rows);
  } catch (err) {
    console.error("getSupplierOrders error:", err);
    res.status(500).json({
      message: "Failed to load supplier purchase orders",
      error: err.message,
    });
  }
};

const getSupplierOrderById = async (req, res) => {
  try {
    await ensureSupplierPortalTables();

    const supplierId = Number(req.user?.supplier_id || 0);
    const { id } = req.params;

    if (!supplierId) {
      return res.status(403).json({ message: "Supplier account is not linked properly" });
    }

    const poMeta = await getPurchaseOrderMeta();
    const itemsMeta = await getPoItemsMeta();

    const requiredDateSelect = poMeta.requiredDateCol
      ? `po.${poMeta.requiredDateCol} AS required_date`
      : `NULL AS required_date`;

    const notesSelect = poMeta.notesCol
      ? `po.${poMeta.notesCol} AS notes`
      : `NULL AS notes`;

    const paymentTermsSelect = poMeta.paymentTermsCol
      ? `po.${poMeta.paymentTermsCol} AS payment_terms`
      : `NULL AS payment_terms`;

    const totalValueSelect = poMeta.totalAmountCol
      ? `COALESCE(po.${poMeta.totalAmountCol}, 0) AS total_amount`
      : `COALESCE(item_totals.total_amount, 0) AS total_amount`;

    const createdByJoin = poMeta.userRefCol
      ? `LEFT JOIN users u ON u.id = po.${poMeta.userRefCol}`
      : ``;

    const createdBySelect = poMeta.userRefCol
      ? `u.full_name AS created_by_name`
      : `NULL AS created_by_name`;

    const itemTotalsSql = `
      SELECT
        purchase_order_id,
        COALESCE(SUM(${
          itemsMeta.rateCol
            ? `COALESCE(${itemsMeta.qtyCol}, 0) * COALESCE(${itemsMeta.rateCol}, 0)`
            : `0`
        }), 0) AS total_amount
      FROM ${itemsMeta.tableName}
      GROUP BY purchase_order_id
    `;

    const headerRows = await q(
      `
      SELECT
        po.id,
        po.po_number,
        po.order_date,
        ${requiredDateSelect},
        po.status,
        po.created_at,
        ${notesSelect},
        ${paymentTermsSelect},
        ${totalValueSelect},
        s.supplier_name,
        s.contact_person,
        s.contact_number,
        s.email,
        s.address,
        ${createdBySelect},
        spr.response_status AS supplier_response_status,
        spr.feedback_notes AS supplier_response_notes,
        spr.responded_at AS supplier_responded_at
      FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN (${itemTotalsSql}) item_totals ON item_totals.purchase_order_id = po.id
      ${createdByJoin}
      LEFT JOIN supplier_po_responses spr
        ON spr.purchase_order_id = po.id
       AND spr.supplier_id = po.supplier_id
      WHERE po.id = ?
        AND po.supplier_id = ?
      LIMIT 1
      `,
      [id, supplierId]
    );

    if (!headerRows.length) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    const items = await q(
      `
      SELECT
        poi.id,
        poi.item_id,
        poi.${itemsMeta.qtyCol} AS quantity,
        ${itemsMeta.rateCol ? `poi.${itemsMeta.rateCol} AS unit_price` : `0 AS unit_price`},
        i.name AS item_name,
        i.code AS item_code,
        i.unit
        ${itemsMeta.noteCol ? `, poi.${itemsMeta.noteCol} AS notes` : `, NULL AS notes`}
      FROM ${itemsMeta.tableName} poi
      JOIN items i ON i.id = poi.item_id
      WHERE poi.purchase_order_id = ?
      ORDER BY poi.id ASC
      `,
      [id]
    );

    res.json({
      ...headerRows[0],
      items,
    });
  } catch (err) {
    console.error("getSupplierOrderById error:", err);
    res.status(500).json({
      message: "Failed to load purchase order details",
      error: err.message,
    });
  }
};

const respondToSupplierOrder = async (req, res) => {
  try {
    await ensureSupplierPortalTables();

    const supplierId = Number(req.user?.supplier_id || 0);
    const { id } = req.params;
    const { response_status, feedback_notes } = req.body;

    if (!supplierId) {
      return res.status(403).json({ message: "Supplier account is not linked properly" });
    }

    if (!["accepted", "rejected"].includes(String(response_status || "").toLowerCase())) {
      return res.status(400).json({ message: "Valid supplier response is required" });
    }

    const rows = await q(
      `
      SELECT id
      FROM purchase_orders
      WHERE id = ?
        AND supplier_id = ?
      LIMIT 1
      `,
      [id, supplierId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Purchase order not found" });
    }

    await q(
      `
      INSERT INTO supplier_po_responses
        (purchase_order_id, supplier_id, response_status, feedback_notes, responded_at)
      VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        response_status = VALUES(response_status),
        feedback_notes = VALUES(feedback_notes),
        responded_at = NOW(),
        updated_at = CURRENT_TIMESTAMP
      `,
      [id, supplierId, String(response_status).toLowerCase(), feedback_notes || null]
    );

    res.json({ message: "Purchase order response saved successfully" });
  } catch (err) {
    console.error("respondToSupplierOrder error:", err);
    res.status(500).json({
      message: "Failed to save purchase order response",
      error: err.message,
    });
  }
};

const getSupplierReturns = async (req, res) => {
  try {
    await ensureSupplierPortalTables();

    const supplierId = Number(req.user?.supplier_id || 0);
    if (!supplierId) return res.json([]);

    const returnMeta = await getGoodsReturnMeta();

    const reasonSelect = returnMeta.reasonCol
      ? `r.${returnMeta.reasonCol} AS reason`
      : `NULL AS reason`;

    const notesSelect = returnMeta.notesCol
      ? `r.${returnMeta.notesCol} AS notes`
      : `NULL AS notes`;

    const deductionSelect = returnMeta.deductionCol
      ? `COALESCE(r.${returnMeta.deductionCol}, 0) AS deduction_amount`
      : `0 AS deduction_amount`;

    const linkedPoJoin = returnMeta.poIdCol
      ? `LEFT JOIN purchase_orders po ON po.id = r.${returnMeta.poIdCol}`
      : ``;

    const linkedPoSelect = returnMeta.poIdCol
      ? `po.po_number AS linked_po_number`
      : `NULL AS linked_po_number`;

    const rows = await q(
      `
      SELECT
        r.id,
        CONCAT('RN-', LPAD(r.id, 3, '0')) AS return_number,
        r.created_at,
        r.${returnMeta.qtyCol} AS quantity,
        ${reasonSelect},
        ${notesSelect},
        ${deductionSelect},
        i.name AS item_name,
        i.code AS item_code,
        ib.batch_code,
        ${linkedPoSelect},
        srr.response_status AS supplier_response_status,
        srr.feedback_notes AS supplier_response_notes,
        srr.responded_at AS supplier_responded_at
      FROM goods_returns r
      JOIN items i ON r.item_id = i.id
      LEFT JOIN inventory_batches ib ON r.batch_id = ib.id
      ${linkedPoJoin}
      LEFT JOIN supplier_return_responses srr
        ON srr.goods_return_id = r.id
       AND srr.supplier_id = r.supplier_id
      WHERE r.supplier_id = ?
      ORDER BY r.id DESC
      `,
      [supplierId]
    );

    res.json(rows);
  } catch (err) {
    console.error("getSupplierReturns error:", err);
    res.status(500).json({
      message: "Failed to load supplier return notes",
      error: err.message,
    });
  }
};

const getSupplierReturnById = async (req, res) => {
  try {
    await ensureSupplierPortalTables();

    const supplierId = Number(req.user?.supplier_id || 0);
    const { id } = req.params;

    if (!supplierId) {
      return res.status(403).json({ message: "Supplier account is not linked properly" });
    }

    const returnMeta = await getGoodsReturnMeta();

    const reasonSelect = returnMeta.reasonCol
      ? `r.${returnMeta.reasonCol} AS reason`
      : `NULL AS reason`;

    const notesSelect = returnMeta.notesCol
      ? `r.${returnMeta.notesCol} AS notes`
      : `NULL AS notes`;

    const deductionSelect = returnMeta.deductionCol
      ? `COALESCE(r.${returnMeta.deductionCol}, 0) AS deduction_amount`
      : `0 AS deduction_amount`;

    const linkedPoJoin = returnMeta.poIdCol
      ? `LEFT JOIN purchase_orders po ON po.id = r.${returnMeta.poIdCol}`
      : ``;

    const linkedPoSelect = returnMeta.poIdCol
      ? `po.po_number AS linked_po_number`
      : `NULL AS linked_po_number`;

    const rows = await q(
      `
      SELECT
        r.id,
        CONCAT('RN-', LPAD(r.id, 3, '0')) AS return_number,
        r.created_at,
        r.${returnMeta.qtyCol} AS quantity,
        ${reasonSelect},
        ${notesSelect},
        ${deductionSelect},
        i.name AS item_name,
        i.code AS item_code,
        ib.batch_code,
        ${linkedPoSelect},
        srr.response_status AS supplier_response_status,
        srr.feedback_notes AS supplier_response_notes,
        srr.responded_at AS supplier_responded_at
      FROM goods_returns r
      JOIN items i ON r.item_id = i.id
      LEFT JOIN inventory_batches ib ON r.batch_id = ib.id
      ${linkedPoJoin}
      LEFT JOIN supplier_return_responses srr
        ON srr.goods_return_id = r.id
       AND srr.supplier_id = r.supplier_id
      WHERE r.id = ?
        AND r.supplier_id = ?
      LIMIT 1
      `,
      [id, supplierId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Return note not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("getSupplierReturnById error:", err);
    res.status(500).json({
      message: "Failed to load supplier return note",
      error: err.message,
    });
  }
};

const respondToSupplierReturn = async (req, res) => {
  try {
    await ensureSupplierPortalTables();

    const supplierId = Number(req.user?.supplier_id || 0);
    const { id } = req.params;
    const { response_status, feedback_notes } = req.body;

    if (!supplierId) {
      return res.status(403).json({ message: "Supplier account is not linked properly" });
    }

    if (!["acknowledged", "disputed"].includes(String(response_status || "").toLowerCase())) {
      return res.status(400).json({ message: "Valid supplier return response is required" });
    }

    const rows = await q(
      `
      SELECT id
      FROM goods_returns
      WHERE id = ?
        AND supplier_id = ?
      LIMIT 1
      `,
      [id, supplierId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Return note not found" });
    }

    await q(
      `
      INSERT INTO supplier_return_responses
        (goods_return_id, supplier_id, response_status, feedback_notes, responded_at)
      VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        response_status = VALUES(response_status),
        feedback_notes = VALUES(feedback_notes),
        responded_at = NOW(),
        updated_at = CURRENT_TIMESTAMP
      `,
      [id, supplierId, String(response_status).toLowerCase(), feedback_notes || null]
    );

    res.json({ message: "Return note response saved successfully" });
  } catch (err) {
    console.error("respondToSupplierReturn error:", err);
    res.status(500).json({
      message: "Failed to save return note response",
      error: err.message,
    });
  }
};

const getSupplierMessages = async (req, res) => {
  try {
    await ensureSupplierPortalTables();

    const supplierId = Number(req.user?.supplier_id || 0);
    if (!supplierId) return res.json([]);

    const rows = await q(
      `
      SELECT
        sm.id,
        sm.message_type,
        sm.subject,
        sm.message_body,
        sm.linked_kind,
        sm.linked_record_id,
        sm.sent_by,
        sm.status,
        sm.created_at,
        CASE
          WHEN sm.linked_kind = 'order' THEN po.po_number
          WHEN sm.linked_kind = 'return' THEN CONCAT('RN-', LPAD(gr.id, 3, '0'))
          ELSE NULL
        END AS linked_label
      FROM supplier_messages sm
      LEFT JOIN purchase_orders po
        ON sm.linked_kind = 'order'
       AND sm.linked_record_id = po.id
      LEFT JOIN goods_returns gr
        ON sm.linked_kind = 'return'
       AND sm.linked_record_id = gr.id
      WHERE sm.supplier_id = ?
      ORDER BY sm.id DESC
      `,
      [supplierId]
    );

    res.json(rows);
  } catch (err) {
    console.error("getSupplierMessages error:", err);
    res.status(500).json({
      message: "Failed to load supplier messages",
      error: err.message,
    });
  }
};

const createSupplierMessage = async (req, res) => {
  try {
    await ensureSupplierPortalTables();

    const supplierId = Number(req.user?.supplier_id || 0);
    const { message_type, subject, message_body, linked_kind, linked_record_id } = req.body;

    if (!supplierId) {
      return res.status(403).json({ message: "Supplier account is not linked properly" });
    }

    if (!message_type || !subject || !message_body) {
      return res.status(400).json({ message: "Message type, subject and message are required" });
    }

    const finalLinkedKind =
      linked_kind === "order" || linked_kind === "return" ? linked_kind : "none";
    const finalLinkedId =
      finalLinkedKind === "none" ? null : Number(linked_record_id || 0) || null;

    await q(
      `
      INSERT INTO supplier_messages
        (supplier_id, message_type, subject, message_body, linked_kind, linked_record_id, sent_by, status)
      VALUES (?, ?, ?, ?, ?, ?, 'You', 'Sent')
      `,
      [
        supplierId,
        String(message_type).trim(),
        String(subject).trim(),
        String(message_body).trim(),
        finalLinkedKind,
        finalLinkedId,
      ]
    );

    res.status(201).json({ message: "Message sent successfully" });
  } catch (err) {
    console.error("createSupplierMessage error:", err);
    res.status(500).json({
      message: "Failed to send supplier message",
      error: err.message,
    });
  }
};

module.exports = {
  getSupplierOrders,
  getSupplierOrderById,
  respondToSupplierOrder,
  getSupplierReturns,
  getSupplierReturnById,
  respondToSupplierReturn,
  getSupplierMessages,
  createSupplierMessage,
};