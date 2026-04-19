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

const formatMultiLineHtml = (value) =>
  String(value || "")
    .split("|")
    .map((line) => escapeHtml(line.trim()))
    .filter(Boolean)
    .join("<br/>");

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
          <td class="num">${Number(item.ordered_qty || 0).toFixed(2)}</td>
          <td class="num">${formatMoney(item.unit_price || 0)}</td>
          <td class="num">${formatMoney(item.line_total || 0)}</td>
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
        padding: 24px;
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
        margin-bottom: 18px;
      }

      .logo-wrap {
        height: 64px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 6px;
      }

      .logo {
        max-height: 64px;
        max-width: 210px;
        object-fit: contain;
      }

      .doc-title {
        margin: 0 0 10px;
        font-size: 26px;
        line-height: 1.1;
        font-weight: 800;
        letter-spacing: 5px;
        color: #0F3D24;
      }

      .company-name {
        font-size: 11px;
        color: #355a49;
        line-height: 1.5;
        font-weight: 500;
      }

      .company-address {
        font-size: 11px;
        color: #355a49;
        line-height: 1.55;
        margin-top: 2px;
      }

      .company-contact {
        font-size: 11px;
        color: #355a49;
        line-height: 1.5;
        margin-top: 4px;
      }

      .meta-cards {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        margin-bottom: 16px;
      }

      .meta-card {
        border: 1px solid #cfe2d7;
        border-radius: 16px;
        padding: 14px 16px;
      }

      .meta-big {
        font-size: 15px;
        line-height: 1.15;
        font-weight: 800;
        color: #0F3D24;
        margin-bottom: 4px;
      }

      .meta-label {
        font-size: 9px;
        line-height: 1.2;
        color: #5d7c6d;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

        .supplier-order-box {
        background: #eaf8ef;
        border: 1px solid #d8e8df;
        border-radius: 0;
        padding: 18px 22px;
        margin-bottom: 18px;
        }
      .supplier-order-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 32px;
      }

      .detail-table {
        width: 100%;
        border-collapse: collapse;
      }

      .detail-table td {
        padding: 4px 0;
        vertical-align: top;
        font-size: 11px;
        line-height: 1.45;
        color: #1A2E22;
      }

        .detail-table td.label {
        width: 140px;
        font-weight: 700;
        color: #1E7242;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        white-space: nowrap;
        padding-right: 14px;
        }
      .detail-table td.value {
        font-weight: 400;
        color: #1A2E22;
        word-break: break-word;
      }

      .po-section-title {
        margin: 0 0 8px;
        font-size: 10px;
        font-weight: 700;
        color: #5d7c6d;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      table.items-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
      }

      .items-table thead th {
        background: #eaf8ef;
        color: #1E7242;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        padding: 9px 8px;
        border: 1px solid #d8e8df;
        text-align: left;
      }

      .items-table tbody td {
        padding: 9px 8px;
        border: 1px solid #d8e8df;
        font-size: 11px;
        color: #1A2E22;
        vertical-align: top;
      }

      .num {
        text-align: right;
      }

      .totals-wrap {
        width: 290px;
        margin-left: auto;
        margin-top: 14px;
      }

      .totals-row {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        padding: 8px 0;
        border-bottom: 1px solid #d8e8df;
        font-size: 12px;
        color: #1A2E22;
      }

      .totals-grand {
        font-size: 15px;
        font-weight: 800;
        color: #0F3D24;
      }

      .notes-box {
        margin-top: 16px;
        border: 1px solid #d8e8df;
        border-radius: 14px;
        overflow: hidden;
      }

      .notes-head {
        background: #eaf8ef;
        padding: 8px 14px;
        font-size: 10px;
        font-weight: 700;
        color: #1E7242;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .notes-body {
        padding: 12px 14px;
        font-size: 11px;
        line-height: 1.55;
        color: #1A2E22;
        white-space: pre-wrap;
      }

      .footer {
        margin-top: 18px;
        font-size: 10px;
        color: #5d7c6d;
        line-height: 1.5;
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
        <div class="company-name">${escapeHtml(company.name || "Fresh World Export (Pvt) Ltd")}</div>
        <div class="company-address">${formatMultiLineHtml(company.address || "")}</div>
        <div class="company-contact">
          ${escapeHtml(company.email || "")}${company.phone ? ` · ${escapeHtml(company.phone)}` : ""}
        </div>
      </div>

      <div class="meta-cards">
        <div class="meta-card">
          <div class="meta-big">${escapeHtml(po.po_number || "-")}</div>
          <div class="meta-label">PO Number</div>
        </div>
        <div class="meta-card">
          <div class="meta-big">${formatDate(po.order_date)}</div>
          <div class="meta-label">PO Date</div>
        </div>
      </div>

      <div class="supplier-order-box">
        <div class="supplier-order-grid">
          <div>
            <table class="detail-table">
              <tr>
                <td class="label">Supplier Name:</td>
                <td class="value">${escapeHtml(supplier.supplier_name || "-")}</td>
              </tr>
              <tr>
                <td class="label">Address:</td>
                <td class="value">${escapeHtml(supplier.address || "-")}</td>
              </tr>
              <tr>
                <td class="label">District:</td>
                <td class="value">${escapeHtml(supplier.city || "-")}</td>
              </tr>
              <tr>
                <td class="label">Contact:</td>
                <td class="value">${escapeHtml(supplier.contact_number || "-")}</td>
              </tr>
              <tr>
                <td class="label">WhatsApp:</td>
                <td class="value">${escapeHtml(supplier.whatsapp_number || "-")}</td>
              </tr>
              <tr>
                <td class="label">Email:</td>
                <td class="value">${escapeHtml(supplier.email || "-")}</td>
              </tr>
            </table>
          </div>

          <div>
            <table class="detail-table">
              <tr>
                <td class="label">Supplier Code:</td>
                <td class="value">${escapeHtml(supplier.supplier_code || "-")}</td>
              </tr>
              <tr>
                <td class="label">PO No:</td>
                <td class="value">${escapeHtml(po.po_number || "-")}</td>
              </tr>
              <tr>
                <td class="label">PO Date:</td>
                <td class="value">${formatDate(po.order_date)}</td>
              </tr>
              <tr>
                <td class="label">Required By:</td>
                <td class="value">${formatDate(po.expected_date)}</td>
              </tr>
              <tr>
                <td class="label">Payment Terms:</td>
                <td class="value">${escapeHtml(po.payment_terms || "-")}</td>
              </tr>
              <tr>
                <td class="label">Contact Person:</td>
                <td class="value">${escapeHtml(supplier.contact_person || "-")}</td>
              </tr>
            </table>
          </div>
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 42px;">#</th>
            <th style="width: 100px;">Item Code</th>
            <th>Item Name</th>
            <th style="width: 72px;">Unit</th>
            <th style="width: 84px;" class="num">Qty</th>
            <th style="width: 110px;" class="num">Rate (LKR)</th>
            <th style="width: 118px;" class="num">Amount (LKR)</th>
          </tr>
        </thead>
        <tbody>
          ${
            rowsHtml ||
            `
            <tr>
              <td colspan="7" style="text-align:center; color:#5d7c6d;">No items found</td>
            </tr>
          `
          }
        </tbody>
      </table>

      <div class="totals-wrap">
        <div class="totals-row">
          <span>Subtotal</span>
          <span>LKR ${formatMoney(subtotal)}</span>
        </div>
        <div class="totals-row totals-grand">
          <span>Total</span>
          <span>LKR ${formatMoney(total)}</span>
        </div>
      </div>

      <div class="notes-box">
        <div class="notes-head">Notes</div>
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