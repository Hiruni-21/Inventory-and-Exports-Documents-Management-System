const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatMoney = (value) =>
  Number(value || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return date.toLocaleDateString("en-CA");
};

function buildPurchaseOrderHtml({
  company = {},
  supplier = {},
  po = {},
  items = [],
  totals = {},
  logoUrl = "",
}) {
  const rowsHtml = items
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.item_code || "-")}</td>
          <td>${escapeHtml(item.item_name || "-")}</td>
          <td>${escapeHtml(item.unit || "-")}</td>
          <td style="text-align:right;">${Number(item.ordered_qty || 0).toFixed(2)}</td>
          <td style="text-align:right;">${formatMoney(item.unit_price || 0)}</td>
          <td style="text-align:right;">${formatMoney(item.line_total || 0)}</td>
        </tr>
      `
    )
    .join("");

  const subtotal = totals.subtotal ?? po.total_amount ?? 0;
  const total = totals.total ?? po.total_amount ?? 0;

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(po.po_number || "Purchase Order")}</title>
    <style>
      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        padding: 28px;
        font-family: Arial, Helvetica, sans-serif;
        color: #1A2E22;
        background: #ffffff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .page {
        width: 100%;
      }

      .header {
        text-align: center;
        margin-bottom: 22px;
      }

      .logo-wrap {
        height: 72px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 8px;
      }

      .logo {
        max-height: 72px;
        max-width: 220px;
        object-fit: contain;
      }

      .doc-title {
        font-size: 28px;
        font-weight: 700;
        letter-spacing: 4px;
        color: #0F3D24;
        margin: 0 0 10px;
      }

      .company-line {
        font-size: 13px;
        color: #4A6858;
        line-height: 1.5;
      }

      .info-box {
        border: 1px solid #D8E8DF;
        border-radius: 14px;
        overflow: hidden;
        margin-bottom: 18px;
      }

      .info-head {
        background: #EAF8EF;
        padding: 10px 14px;
        font-size: 12px;
        font-weight: 700;
        color: #1E7242;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .info-body {
        padding: 16px;
      }

      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px 24px;
      }

      .field {
        min-height: 40px;
      }

      .label {
        font-size: 11px;
        font-weight: 700;
        color: #4A6858;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: 6px;
      }

      .value {
        font-size: 14px;
        color: #1A2E22;
        line-height: 1.5;
        word-break: break-word;
      }

      .po-meta {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 18px;
      }

      .po-meta-card {
        border: 1px solid #D8E8DF;
        border-radius: 14px;
        padding: 16px;
      }

      .po-meta-card .big {
        font-size: 22px;
        font-weight: 800;
        color: #0F3D24;
        line-height: 1.1;
      }

      .po-meta-card .small {
        margin-top: 6px;
        font-size: 12px;
        color: #4A6858;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      thead th {
        background: #EAF8EF;
        color: #1E7242;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        padding: 11px 10px;
        border: 1px solid #D8E8DF;
        text-align: left;
      }

      tbody td {
        padding: 11px 10px;
        border: 1px solid #D8E8DF;
        font-size: 13px;
        color: #1A2E22;
        vertical-align: top;
      }

      .totals-wrap {
        width: 320px;
        margin-left: auto;
        margin-top: 16px;
      }

      .totals-row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 10px 0;
        border-bottom: 1px solid #D8E8DF;
        font-size: 14px;
      }

      .totals-row strong {
        color: #0F3D24;
      }

      .totals-grand {
        font-size: 18px;
        font-weight: 800;
      }

      .notes-box {
        margin-top: 18px;
        border: 1px solid #D8E8DF;
        border-radius: 14px;
        overflow: hidden;
      }

      .notes-body {
        padding: 14px 16px;
        font-size: 13px;
        color: #1A2E22;
        line-height: 1.6;
        white-space: pre-wrap;
      }

      .footer {
        margin-top: 26px;
        font-size: 12px;
        color: #4A6858;
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="header">
        <div class="logo-wrap">
          ${logoUrl ? `<img src="${logoUrl}" alt="Company Logo" class="logo" />` : ""}
        </div>
        <h1 class="doc-title">PURCHASE ORDER</h1>
        <div class="company-line">${escapeHtml(company.name || "Fresh World Exporters Pvt Ltd")}</div>
        <div class="company-line">${escapeHtml(company.address || "Manning Market, Colombo, Sri Lanka")}</div>
        <div class="company-line">${escapeHtml(company.email || "")}${company.phone ? ` · ${escapeHtml(company.phone)}` : ""}</div>
      </div>

      <div class="po-meta">
        <div class="po-meta-card">
          <div class="big">${escapeHtml(po.po_number || "-")}</div>
          <div class="small">PO Number</div>
        </div>
        <div class="po-meta-card">
          <div class="big">${formatDate(po.order_date)}</div>
          <div class="small">Order Date</div>
        </div>
      </div>

      <div class="info-box">
        <div class="info-head">Supplier & Order Details</div>
        <div class="info-body">
          <div class="grid">
            <div class="field">
              <div class="label">Supplier Name</div>
              <div class="value">${escapeHtml(supplier.supplier_name || "-")}</div>
            </div>
            <div class="field">
              <div class="label">Required By</div>
              <div class="value">${formatDate(po.expected_date)}</div>
            </div>

            <div class="field">
              <div class="label">Contact Person</div>
              <div class="value">${escapeHtml(supplier.contact_person || "-")}</div>
            </div>
            <div class="field">
              <div class="label">Payment Terms</div>
              <div class="value">${escapeHtml(po.payment_terms || "-")}</div>
            </div>

            <div class="field">
              <div class="label">Mobile</div>
              <div class="value">${escapeHtml(supplier.contact_number || "-")}</div>
            </div>
            <div class="field">
              <div class="label">WhatsApp</div>
              <div class="value">${escapeHtml(supplier.whatsapp_number || "-")}</div>
            </div>

            <div class="field">
              <div class="label">Email</div>
              <div class="value">${escapeHtml(supplier.email || "-")}</div>
            </div>
            <div class="field">
              <div class="label">District</div>
              <div class="value">${escapeHtml(supplier.city || "-")}</div>
            </div>

            <div class="field" style="grid-column: 1 / -1;">
              <div class="label">Address</div>
              <div class="value">${escapeHtml(supplier.address || "-")}</div>
            </div>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 48px;">#</th>
            <th style="width: 120px;">Item Code</th>
            <th>Item Name</th>
            <th style="width: 90px;">Unit</th>
            <th style="width: 100px; text-align:right;">Qty</th>
            <th style="width: 120px; text-align:right;">Rate (LKR)</th>
            <th style="width: 130px; text-align:right;">Amount (LKR)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || `
            <tr>
              <td colspan="7" style="text-align:center; color:#4A6858;">No items found</td>
            </tr>
          `}
        </tbody>
      </table>

      <div class="totals-wrap">
        <div class="totals-row">
          <span>Subtotal</span>
          <span>LKR ${formatMoney(subtotal)}</span>
        </div>
        <div class="totals-row totals-grand">
          <strong>Total</strong>
          <strong>LKR ${formatMoney(total)}</strong>
        </div>
      </div>

      <div class="notes-box">
        <div class="info-head">Notes</div>
        <div class="notes-body">${escapeHtml(po.notes || "-")}</div>
      </div>

      <div class="footer">
        This purchase order was generated from the Fresh World ERP system.
      </div>
    </div>
  </body>
</html>
  `;
}

module.exports = { buildPurchaseOrderHtml };