const fs = require("fs");
const db = require("../config/db");
const { generatePurchaseOrderPdf } = require("../services/purchaseOrderPdf.service");
const {
  sendPurchaseOrderEmail,
  buildPurchaseOrderEmailHtml,
} = require("../services/purchaseOrderEmail.service");
const logActivity = require("../utils/logActivity");

const q = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

const fmtDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("en-CA");
};

const buildCompanyConfig = () => ({
  name: process.env.COMPANY_NAME || "Fresh World Exporters",
  email: process.env.COMPANY_EMAIL || "",
  phone: process.env.COMPANY_PHONE || "",
  address: process.env.COMPANY_ADDRESS || "",
});

const loadPurchaseOrderBundle = async (purchaseOrderId) => {
  const poRows = await q(
    `
      SELECT
        po.id,
        po.po_number,
        po.supplier_id,
        po.order_date,
        po.required_by,
        po.payment_terms,
        po.notes,
        po.remarks,
        po.status,
        po.total_amount,
        po.created_at,
        s.supplier_code,
        s.supplier_name,
        s.contact_person,
        s.contact_number,
        s.whatsapp_number,
        s.email,
        s.address,
        s.city
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
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

  const items = await q(
    `
      SELECT
        poi.id,
        poi.item_id,
        i.code AS item_code,
        i.name AS item_name,
        i.unit,
        COALESCE(poi.quantity, 0) AS quantity,
        COALESCE(poi.unit_price, 0) AS unit_price,
        COALESCE(poi.quantity, 0) * COALESCE(poi.unit_price, 0) AS line_total
      FROM purchase_order_items poi
      LEFT JOIN items i ON i.id = poi.item_id
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

const updatePoAsSent = async (purchaseOrderId, req) => {
  const userId = req.user?.id || null;
  await q(
    `
      UPDATE purchase_orders
      SET status = 'sent',
          sent_by = ?,
          updated_at = NOW()
      WHERE id = ?
    `,
    [userId, purchaseOrderId]
  );
  
  const poRows = await q(`SELECT po_number FROM purchase_orders WHERE id = ?`, [purchaseOrderId]);
  if (poRows.length > 0) {
    logActivity({
      user_id: userId,
      user_name: req.user?.name || "System",
      module: "Purchase Orders",
      action: `Sent Purchase Order ${poRows[0].po_number}`,
      reference_type: "purchase_order",
      reference_id: purchaseOrderId,
      ip_address: req.ip,
    });
  }
};

const renderPdf = async (req, res) => {
  try {
    const purchaseOrderId = Number(req.params.id || 0);
    const bundle = await loadPurchaseOrderBundle(purchaseOrderId);
    const pdfInfo = await generatePurchaseOrderPdf(bundle);

    res.json({
      message: "Purchase order PDF generated successfully",
      purchaseOrderId: bundle.po.id,
      poNumber: bundle.po.po_number,
      fileUrl: pdfInfo.publicPath,
      documentUrl: `${process.env.BACKEND_BASE_URL || "http://localhost:5001"}${pdfInfo.publicPath}`,
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
    const bundle = await loadPurchaseOrderBundle(purchaseOrderId);

    const status = String(bundle.po.status || "").toLowerCase();

    if (status !== "approved" && status !== "sent") {
      return res.status(400).json({
        message: "Only approved purchase orders can be emailed",
      });
    }

    if (!bundle.supplier.email) {
      return res.status(400).json({
        message: "Supplier email is missing",
      });
    }

    const pdfInfo = await generatePurchaseOrderPdf(bundle);

    const requiredBy =
      bundle.po.required_by;

    const subject = `Fresh World Purchase Order ${bundle.po.po_number}`;

    const html = buildPurchaseOrderEmailHtml({
      supplierName: bundle.supplier.supplier_name,
      poNumber: bundle.po.po_number,
      requiredBy: fmtDate(requiredBy),
    });

    const info = await sendPurchaseOrderEmail({
      to: bundle.supplier.email,
      subject,
      html,
      pdfPath: pdfInfo.absPath,
      pdfFileName: pdfInfo.fileName,
    });

     await updatePoAsSent(bundle.po.id, req);

    const { sendNotification } = require("../utils/notificationHelper");
    sendNotification({
      role: "supplier",
      supplierId: bundle.po.supplier_id || bundle.supplier.id,
      title: "New Purchase Order Sent",
      message: `Purchase Order ${bundle.po.po_number} has been sent to you.`,
      type: "po_sent"
    }).catch(err => console.error("Supplier email PO sent notification error:", err.message));

    res.json({
      message: "Purchase order PDF emailed successfully",
      purchaseOrderId: bundle.po.id,
      poNumber: bundle.po.po_number,
      fileUrl: pdfInfo.publicPath,
      documentUrl: `${process.env.BACKEND_BASE_URL || "http://localhost:5001"}${pdfInfo.publicPath}`,
      recipientEmail: info.actualRecipient || bundle.supplier.email,
      providerMessageId: info.messageId || null,
    });
  } catch (err) {
    console.error("sendEmail error:", err);
    res.status(err.statusCode || 500).json({
      message: err.message || "Failed to send purchase order email",
    });
  }
};

const getDocument = async (req, res) => {
  try {
    const purchaseOrderId = Number(req.params.id || 0);
    const bundle = await loadPurchaseOrderBundle(purchaseOrderId);
    const pdfInfo = await generatePurchaseOrderPdf(bundle);

    if (!fs.existsSync(pdfInfo.absPath)) {
      return res.status(404).json({ message: "Purchase order PDF not found" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${pdfInfo.fileName}"`
    );

    return res.sendFile(pdfInfo.absPath);
  } catch (err) {
    console.error("getDocument error:", err);
    res.status(err.statusCode || 500).json({
      message: err.message || "Failed to open purchase order PDF",
    });
  }
};

const sendWhatsapp = async (req, res) => {
  res.status(501).json({
    message: "WhatsApp sending is not configured yet",
  });
};

const sendAll = async (req, res) => {
  return sendEmail(req, res);
};

module.exports = {
  renderPdf,
  sendEmail,
  sendWhatsapp,
  sendAll,
  getDocument,
};