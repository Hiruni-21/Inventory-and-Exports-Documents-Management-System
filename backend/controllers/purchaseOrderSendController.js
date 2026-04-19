const fs = require("fs");
const path = require("path");
const db = require("../config/db");
const { generatePurchaseOrderPdf } = require("../services/purchaseOrderPdf.service");
const {
  sendPurchaseOrderEmail,
  buildPurchaseOrderEmailHtml,
} = require("../services/purchaseOrderEmail.service");
const {
  logPurchaseOrderCommunication,
} = require("../services/purchaseOrderCommunicationLog.service");

let whatsappService = null;
try {
  whatsappService = require("../services/purchaseOrderWhatsapp.service");
} catch (err) {
  whatsappService = null;
}

const q = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

let tableCache = {};
let poItemsMetaCache = null;

const getTableColumns = async (tableName) => {
  if (tableCache[tableName]) return tableCache[tableName];

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
  tableCache[tableName] = set;
  return set;
};

const tableExists = async (tableName) => {
  const rows = await q(
    `
      SELECT COUNT(*) AS total
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
    `,
    [tableName]
  );

  return Number(rows?.[0]?.total || 0) > 0;
};

const getPoItemsMeta = async () => {
  if (poItemsMetaCache) return poItemsMetaCache;

  const legacyExists = await tableExists("purchase_order_items");
  const tableName = legacyExists ? "purchase_order_items" : "po_items";
  const cols = await getTableColumns(tableName);

  poItemsMetaCache = {
    tableName,
    qtyCol: cols.has("quantity") ? "quantity" : "ordered_qty",
    unitCol: cols.has("unit") ? "unit" : null,
    priceCol: cols.has("unit_price")
      ? "unit_price"
      : cols.has("price")
      ? "price"
      : null,
    totalCol: cols.has("line_total") ? "line_total" : null,
  };

  return poItemsMetaCache;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-CA");
};

const buildCompanyConfig = () => ({
  name: process.env.COMPANY_NAME || "Fresh World Exporters Pvt Ltd",
  email: process.env.COMPANY_EMAIL || "",
  phone: process.env.COMPANY_PHONE || "",
  address: process.env.COMPANY_ADDRESS || "",
});

const cleanWhatsappNumber = (value) =>
  String(value || "").replace(/[^\d]/g, "");

const loadPurchaseOrderBundle = async (purchaseOrderId) => {
  const poRows = await q(
    `
      SELECT
        po.id,
        po.po_number,
        po.order_date,
        po.expected_date,
        po.payment_terms,
        po.notes,
        po.status,
        po.total_amount,
        po.supplier_id,
        s.supplier_code,
        s.supplier_name,
        s.contact_person,
        s.contact_number,
        s.whatsapp_number,
        s.email,
        s.address,
        s.city
      FROM purchase_orders po
      JOIN suppliers s ON s.id = po.supplier_id
      WHERE po.id = ?
      LIMIT 1
    `,
    [purchaseOrderId]
  );

  if (!poRows.length) {
    const error = new Error("Purchase order not found");
    error.statusCode = 404;
    throw error;
  }

  const po = poRows[0];
  const meta = await getPoItemsMeta();

  const priceExpr = meta.priceCol ? `COALESCE(poi.${meta.priceCol}, 0)` : `COALESCE(i.unit_cost, 0)`;
  const unitExpr = meta.unitCol ? `COALESCE(poi.${meta.unitCol}, i.unit)` : `i.unit`;
  const totalExpr = meta.totalCol
    ? `COALESCE(poi.${meta.totalCol}, 0)`
    : `COALESCE(poi.${meta.qtyCol}, 0) * ${priceExpr}`;

  const items = await q(
    `
      SELECT
        poi.id,
        poi.item_id,
        i.code AS item_code,
        i.name AS item_name,
        ${unitExpr} AS unit,
        COALESCE(poi.${meta.qtyCol}, 0) AS ordered_qty,
        ${priceExpr} AS unit_price,
        ${totalExpr} AS line_total
      FROM ${meta.tableName} poi
      JOIN items i ON i.id = poi.item_id
      WHERE poi.purchase_order_id = ?
      ORDER BY poi.id ASC
    `,
    [purchaseOrderId]
  );

  const computedTotal = items.reduce(
    (sum, item) => sum + Number(item.line_total || 0),
    0
  );

  return {
    po: {
      ...po,
      total_amount: Number(po.total_amount || computedTotal || 0),
    },
    supplier: {
    supplier_id: po.supplier_id,
    supplier_code: po.supplier_code,
    supplier_name: po.supplier_name,
    contact_person: po.contact_person,
    contact_number: po.contact_number,
    whatsapp_number: po.whatsapp_number,
    email: po.email,
    address: po.address,
    city: po.city,
    },    
    items,
    company: buildCompanyConfig(),
  };
};

const updatePoAsSent = async (purchaseOrderId, userId) => {
  const cols = await getTableColumns("purchase_orders");
  const sets = ["status = 'sent'"];

  if (cols.has("sent_by")) sets.push("sent_by = ?");
  if (cols.has("updated_at")) sets.push("updated_at = NOW()");

  const params = [];
  if (cols.has("sent_by")) params.push(userId || null);
  params.push(purchaseOrderId);

  await q(
    `UPDATE purchase_orders SET ${sets.join(", ")} WHERE id = ?`,
    params
  );
};

const ensurePdfForPo = async (purchaseOrderId) => {
  const bundle = await loadPurchaseOrderBundle(purchaseOrderId);
  const pdfInfo = await generatePurchaseOrderPdf(bundle);

  return {
    ...bundle,
    pdfInfo,
  };
};

const sendEmailInternal = async (req, purchaseOrderId) => {
  const bundle = await ensurePdfForPo(purchaseOrderId);
  const { po, supplier, pdfInfo } = bundle;

  if (!supplier.email) {
    const error = new Error("Supplier email is missing");
    error.statusCode = 400;
    throw error;
  }

  const subject = `Purchase Order ${po.po_number}`;
  const html = buildPurchaseOrderEmailHtml({
    supplierName: supplier.supplier_name,
    poNumber: po.po_number,
    requiredBy: formatDate(po.expected_date),
  });

  const info = await sendPurchaseOrderEmail({
    to: supplier.email,
    subject,
    html,
    pdfPath: pdfInfo.absPath,
    pdfFileName: pdfInfo.fileName,
  });

  await logPurchaseOrderCommunication({
    purchaseOrderId: po.id,
    supplierId: supplier.supplier_id,
    channel: "email",
    subject,
    fileUrl: pdfInfo.publicPath,
    providerMessageId: info?.messageId || null,
    status: "sent",
    userId: req.user?.id || null,
    userName:
      req.user?.full_name || req.user?.name || req.user?.email || "Fresh World ERP",
  });

  await updatePoAsSent(po.id, req.user?.id || null);

  return {
    po,
    supplier,
    pdfInfo,
    providerMessageId: info?.messageId || null,
  };
};

const sendWhatsappInternal = async (req, purchaseOrderId) => {
  if (!whatsappService) {
    const error = new Error(
      "WhatsApp service file is missing. Create backend/services/purchaseOrderWhatsapp.service.js first."
    );
    error.statusCode = 500;
    throw error;
  }

  const bundle = await ensurePdfForPo(purchaseOrderId);
  const { po, supplier, pdfInfo } = bundle;

  const to = cleanWhatsappNumber(
    supplier.whatsapp_number || supplier.contact_number
  );

  if (!to) {
    const error = new Error("Supplier WhatsApp number is missing");
    error.statusCode = 400;
    throw error;
  }

  if (
    !process.env.WHATSAPP_PHONE_NUMBER_ID ||
    !process.env.WHATSAPP_ACCESS_TOKEN
  ) {
    const error = new Error(
      "WhatsApp configuration is incomplete. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in backend/.env"
    );
    error.statusCode = 500;
    throw error;
  }

  const caption = `Fresh World Purchase Order ${po.po_number}`;

  let providerMessageId = null;

  if (
    process.env.WHATSAPP_PROVIDER === "meta" &&
    whatsappService.uploadMetaMedia &&
    whatsappService.sendMetaWhatsappDocument
  ) {
    const mediaId = await whatsappService.uploadMetaMedia(pdfInfo.absPath);
    const result = await whatsappService.sendMetaWhatsappDocument({
      to,
      mediaId,
      caption,
      fileName: pdfInfo.fileName,
    });
    providerMessageId = result?.messages?.[0]?.id || null;
  } else {
    const error = new Error(
      "Only Meta WhatsApp flow is wired in this controller right now."
    );
    error.statusCode = 500;
    throw error;
  }

  await logPurchaseOrderCommunication({
    purchaseOrderId: po.id,
    supplierId: supplier.supplier_id,
    channel: "whatsapp",
    subject: caption,
    fileUrl: pdfInfo.publicPath,
    providerMessageId,
    status: "sent",
    userId: req.user?.id || null,
    userName:
      req.user?.full_name || req.user?.name || req.user?.email || "Fresh World ERP",
  });

  await updatePoAsSent(po.id, req.user?.id || null);

  return {
    po,
    supplier,
    pdfInfo,
    providerMessageId,
  };
};

const renderPdf = async (req, res) => {
  try {
    const purchaseOrderId = Number(req.params.id || 0);
    const bundle = await ensurePdfForPo(purchaseOrderId);

    res.json({
      message: "Purchase order PDF generated",
      purchaseOrderId: bundle.po.id,
      poNumber: bundle.po.po_number,
      fileUrl: bundle.pdfInfo.publicPath,
      downloadUrl: `${process.env.BACKEND_BASE_URL}${bundle.pdfInfo.publicPath}`,
    });
  } catch (err) {
    console.error("renderPdf error:", err);
    res.status(err.statusCode || 500).json({
      message: err.message || "Failed to generate purchase order PDF",
    });
  }
};

const sendEmail = async (req, res) => {
  try {
    const purchaseOrderId = Number(req.params.id || 0);
    const result = await sendEmailInternal(req, purchaseOrderId);

    res.json({
      message: "Purchase order email sent successfully",
      purchaseOrderId: result.po.id,
      poNumber: result.po.po_number,
      fileUrl: result.pdfInfo.publicPath,
      providerMessageId: result.providerMessageId,
    });
  } catch (err) {
    console.error("sendEmail error:", err);
    res.status(err.statusCode || 500).json({
      message: err.message || "Failed to send purchase order email",
    });
  }
};

const sendWhatsapp = async (req, res) => {
  try {
    const purchaseOrderId = Number(req.params.id || 0);
    const result = await sendWhatsappInternal(req, purchaseOrderId);

    res.json({
      message: "Purchase order WhatsApp message sent successfully",
      purchaseOrderId: result.po.id,
      poNumber: result.po.po_number,
      fileUrl: result.pdfInfo.publicPath,
      providerMessageId: result.providerMessageId,
    });
  } catch (err) {
    console.error("sendWhatsapp error:", err);
    res.status(err.statusCode || 500).json({
      message: err.message || "Failed to send purchase order WhatsApp message",
    });
  }
};

const sendAll = async (req, res) => {
  try {
    const purchaseOrderId = Number(req.params.id || 0);
    const emailResult = await sendEmailInternal(req, purchaseOrderId);

    let whatsappResult = null;
    let whatsappError = null;

    try {
      whatsappResult = await sendWhatsappInternal(req, purchaseOrderId);
    } catch (err) {
      whatsappError = err.message || "WhatsApp send failed";
    }

    res.json({
      message: whatsappError
        ? "Email sent. WhatsApp failed."
        : "Purchase order sent by email and WhatsApp",
      purchaseOrderId: emailResult.po.id,
      poNumber: emailResult.po.po_number,
      fileUrl: emailResult.pdfInfo.publicPath,
      emailProviderMessageId: emailResult.providerMessageId,
      whatsappProviderMessageId: whatsappResult?.providerMessageId || null,
      whatsappError,
    });
  } catch (err) {
    console.error("sendAll error:", err);
    res.status(err.statusCode || 500).json({
      message: err.message || "Failed to send purchase order",
    });
  }
};

const getDocument = async (req, res) => {
  try {
    const purchaseOrderId = Number(req.params.id || 0);
    const bundle = await ensurePdfForPo(purchaseOrderId);

    if (!fs.existsSync(bundle.pdfInfo.absPath)) {
      return res.status(404).json({ message: "Purchase order PDF not found" });
    }

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${bundle.pdfInfo.fileName}"`
    );
    return res.sendFile(bundle.pdfInfo.absPath);
  } catch (err) {
    console.error("getDocument error:", err);
    res.status(err.statusCode || 500).json({
      message: err.message || "Failed to open purchase order PDF",
    });
  }
};

module.exports = {
  renderPdf,
  sendEmail,
  sendWhatsapp,
  sendAll,
  getDocument,
};