const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const safe = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
};

const escapeHtml = (value) =>
  safe(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fmtDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);

  return date.toLocaleDateString("en-CA");
};

const money = (value) =>
  Number(value || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const fileSafe = (value) =>
  String(value || "purchase-order")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-");

const getLogoDataUri = () => {
  const possiblePaths = [
    process.env.COMPANY_LOGO_PATH,
    path.join(process.cwd(), "assets", "company-logo.png"),
    path.join(__dirname, "..", "assets", "company-logo.png"),
  ].filter(Boolean);

  for (const logoPath of possiblePaths) {
    try {
      if (fs.existsSync(logoPath)) {
        const ext = path.extname(logoPath).toLowerCase();
        const mimeType =
          ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";

        const image = fs.readFileSync(logoPath).toString("base64");

        console.log("PO PDF logo loaded from:", logoPath);

        return `data:${mimeType};base64,${image}`;
      }
    } catch (err) {
      console.error("Failed to load PO PDF logo:", logoPath, err.message);
    }
  }

  console.warn("PO PDF logo not found. Using FW fallback.");
  return "";
};
const buildPurchaseOrderHtml = ({ po, supplier, items, company }) => {
  const logoDataUri = getLogoDataUri();

  const taxRate = Number(process.env.PO_TAX_RATE || 0);
  const discountAmount = Number(process.env.PO_DISCOUNT_AMOUNT || 0);

  const subtotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity || item.ordered_qty || 0);
    const unitPrice = Number(item.unit_price || 0);
    const lineTotal = Number(item.line_total || qty * unitPrice || 0);
    return sum + lineTotal;
  }, 0);

  const taxAmount = subtotal * (taxRate / 100);
  const grandTotal = subtotal + taxAmount - discountAmount;

  const requiredBy =
    po.expected_delivery_date || po.required_by || po.expected_date || "";

  const poDate = po.order_date || po.created_at;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(po.po_number)}</title>

  <style>
    @page {
      size: A4;
      margin: 12mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: #ffffff;
      color: #17221b;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
    }

    .page {
      min-height: 273mm;
      border: 1px solid #d7e0da;
      padding: 28px 34px;
      display: flex;
      flex-direction: column;
    }

    .header {
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 24px;
      align-items: start;
      border-bottom: 5px solid #2f73c8;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo-box {
      width: 86px;
      height: 86px;
      border: 1px solid #d7e0da;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: #ffffff;
      flex-shrink: 0;
    }

    .logo-box img {
      max-width: 76px;
      max-height: 76px;
      object-fit: contain;
    }

    .logo-fallback {
      font-size: 22px;
      font-weight: 900;
      color: #0f3d24;
    }

    .company-name {
      font-size: 20px;
      font-weight: 900;
      color: #0f3d24;
      line-height: 1.2;
      margin-bottom: 6px;
    }

    .company-info {
      font-size: 11px;
      line-height: 1.55;
      color: #4a5f52;
    }

    .po-title-box {
      text-align: right;
    }

    .po-title {
      font-size: 30px;
      font-weight: 900;
      color: #2f73c8;
      letter-spacing: 4px;
      margin-bottom: 16px;
    }

    .po-meta {
      display: inline-block;
      min-width: 270px;
      text-align: left;
      background: #f2f7ff;
      border: 1px solid #d4e5fb;
      border-radius: 12px;
      padding: 14px 16px;
    }

    .meta-row {
      display: grid;
      grid-template-columns: 108px 1fr;
      gap: 10px;
      margin-bottom: 7px;
      font-size: 12px;
      line-height: 1.3;
    }

    .meta-row:last-child {
      margin-bottom: 0;
    }

    .meta-label {
      font-weight: 800;
      color: #162f22;
    }

    .section {
      margin-bottom: 22px;
    }

    .section-title {
      font-size: 12px;
      font-weight: 900;
      color: #0f3d24;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 9px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-title::before {
      content: "";
      width: 4px;
      height: 14px;
      background: #2f73c8;
      border-radius: 999px;
      display: inline-block;
    }

    .supplier-card {
      background: #eaf3ff;
      border: 1px solid #d4e5fb;
      border-radius: 14px;
      padding: 18px 22px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
    }

    .detail-row {
      display: grid;
      grid-template-columns: 118px 1fr;
      gap: 10px;
      margin-bottom: 8px;
      line-height: 1.45;
      font-size: 12px;
    }

    .detail-label {
      font-weight: 800;
      color: #1e3328;
    }

    .payment-strip {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
    }

    .mini-card {
      background: #ffffff;
      border: 1px solid #d7e0da;
      border-radius: 12px;
      padding: 13px 15px;
    }

    .mini-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 900;
      color: #557064;
      margin-bottom: 6px;
    }

    .mini-value {
      font-size: 13px;
      font-weight: 800;
      color: #10291a;
      line-height: 1.35;
    }

    .items-section {
      margin-top: 4px;
      margin-bottom: 24px;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .items-table th {
      background: #2f73c8;
      color: white;
      font-weight: 900;
      padding: 10px 8px;
      border: 1px solid #abc8eb;
      text-align: center;
      font-size: 11px;
    }

    .items-table td {
      padding: 12px 9px;
      border: 1px solid #d6d6d6;
      vertical-align: middle;
      font-size: 12px;
    }

    .items-table tbody tr:nth-child(even) {
      background: #fafafa;
    }

    .center {
      text-align: center;
    }

    .right {
      text-align: right;
    }

    .product-name {
      font-weight: 800;
      color: #111827;
    }

    .bottom-area {
      margin-top: auto;
      display: grid;
      grid-template-columns: 1fr 310px;
      gap: 24px;
      align-items: start;
    }

    .terms-box {
      background: #eef6ff;
      border: 1px solid #d4e5fb;
      border-radius: 12px;
      padding: 15px 18px;
      min-height: 150px;
      font-size: 11px;
      line-height: 1.5;
    }

    .terms-title {
      font-weight: 900;
      color: #0f3d24;
      margin-bottom: 7px;
    }

    .terms-box ol {
      margin: 0;
      padding-left: 16px;
    }

    .summary-box {
      border: 1px solid #d4d4d4;
      border-radius: 12px;
      overflow: hidden;
      background: white;
    }

    .summary-row {
      display: grid;
      grid-template-columns: 1fr 120px;
      gap: 10px;
      padding: 10px 14px;
      border-bottom: 1px solid #e0e0e0;
      font-size: 13px;
    }

    .summary-row:last-child {
      border-bottom: none;
    }

    .summary-label {
      font-weight: 800;
      text-align: right;
    }

    .summary-value {
      font-weight: 800;
      text-align: right;
    }

    .grand-row {
      background: #2f73c8;
      color: white;
      font-size: 15px;
      font-weight: 900;
    }

    .signature-box {
      margin-top: 18px;
      border: 1px solid #d4d4d4;
      border-radius: 12px;
      overflow: hidden;
    }

    .signature-title {
      background: #2f73c8;
      color: white;
      text-align: center;
      font-weight: 900;
      padding: 9px;
      font-size: 12px;
    }

    .signature-space {
      height: 82px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 10px;
      color: #777777;
      font-style: italic;
      font-size: 11px;
    }

    .footer {
      margin-top: 18px;
      padding-top: 12px;
      border-top: 1px solid #d7e0da;
      display: flex;
      justify-content: space-between;
      gap: 20px;
      font-size: 10.5px;
      color: #5c6c62;
    }

    .footer strong {
      color: #0f3d24;
    }
  </style>
</head>

<body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo-box">
          ${
            logoDataUri
              ? `<img src="${logoDataUri}" alt="Company Logo" />`
              : `<div class="logo-fallback">FW</div>`
          }
        </div>

        <div>
          <div class="company-name">${escapeHtml(company.name)}</div>
          <div class="company-info">${escapeHtml(company.address)}</div>
          <div class="company-info">${escapeHtml(company.phone)}</div>
          <div class="company-info">${escapeHtml(company.email)}</div>
        </div>
      </div>

      <div class="po-title-box">
        <div class="po-title">PURCHASE ORDER</div>

        <div class="po-meta">
          <div class="meta-row">
            <div class="meta-label">PO No</div>
            <div>${escapeHtml(po.po_number)}</div>
          </div>

          <div class="meta-row">
            <div class="meta-label">PO Date</div>
            <div>${escapeHtml(fmtDate(poDate))}</div>
          </div>

          <div class="meta-row">
            <div class="meta-label">Required By</div>
            <div>${escapeHtml(fmtDate(requiredBy))}</div>
          </div>

          <div class="meta-row">
            <div class="meta-label">Status</div>
            <div>${escapeHtml(po.status || "Approved")}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Supplier Details</div>

      <div class="supplier-card">
        <div>
          <div class="detail-row">
            <div class="detail-label">Supplier Name</div>
            <div>${escapeHtml(supplier.supplier_name)}</div>
          </div>

          <div class="detail-row">
            <div class="detail-label">Address</div>
            <div>${escapeHtml(supplier.address || supplier.city)}</div>
          </div>

          <div class="detail-row">
            <div class="detail-label">Contact</div>
            <div>${escapeHtml(supplier.contact_number || supplier.whatsapp_number)}</div>
          </div>
        </div>

        <div>
          <div class="detail-row">
            <div class="detail-label">Supplier Code</div>
            <div>${escapeHtml(supplier.supplier_code || supplier.supplier_id)}</div>
          </div>

          <div class="detail-row">
            <div class="detail-label">Email</div>
            <div>${escapeHtml(supplier.email)}</div>
          </div>

          <div class="detail-row">
            <div class="detail-label">Prepared By</div>
            <div>${escapeHtml(po.created_by_name || "Fresh World ERP")}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="payment-strip">
      <div class="mini-card">
        <div class="mini-label">Payment Terms</div>
        <div class="mini-value">${escapeHtml(po.payment_terms || "As agreed")}</div>
      </div>

      <div class="mini-card">
        <div class="mini-label">Delivery Method</div>
        <div class="mini-value">Supplier Delivery</div>
      </div>

      <div class="mini-card">
        <div class="mini-label">Delivery Location</div>
        <div class="mini-value">${escapeHtml(company.address)}</div>
      </div>
    </div>

    <div class="items-section">
      <div class="section-title">Order Items</div>

      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 46px;">S.No</th>
            <th>Product Name</th>
            <th style="width: 92px;">Quantity</th>
            <th style="width: 78px;">Unit</th>
            <th style="width: 105px;">Rate</th>
            <th style="width: 78px;">Tax</th>
            <th style="width: 125px;">Amount</th>
          </tr>
        </thead>

        <tbody>
          ${
            items.length > 0
              ? items
                  .map((item, index) => {
                    const qty = Number(item.quantity || item.ordered_qty || 0);
                    const unitPrice = Number(item.unit_price || 0);
                    const lineTotal = Number(item.line_total || qty * unitPrice || 0);

                    return `
                      <tr>
                        <td class="center">${index + 1}</td>
                        <td>
                          <div class="product-name">${escapeHtml(item.item_name || item.name)}</div>
                        </td>
                        <td class="center">${money(qty)}</td>
                        <td class="center">${escapeHtml(item.unit)}</td>
                        <td class="right">${money(unitPrice)}</td>
                        <td class="center">${money(taxRate)}%</td>
                        <td class="right">${money(lineTotal)}</td>
                      </tr>
                    `;
                  })
                  .join("")
              : `
                <tr>
                  <td colspan="7" class="center">No items found</td>
                </tr>
              `
          }
        </tbody>
      </table>
    </div>

    <div class="bottom-area">
      <div class="terms-box">
        <div class="terms-title">Terms and Conditions</div>
        <ol>
          <li>Please verify item quantity, quality, and delivery date before dispatch.</li>
          <li>Invoice should contain the purchase order number mentioned above.</li>
          <li>Any changes to the order must be confirmed with Fresh World before delivery.</li>
          <li>Delivery should be completed on or before the required date.</li>
          <li>Goods will be accepted after inspection by Fresh World operations team.</li>
        </ol>
      </div>

      <div>
        <div class="summary-box">
          <div class="summary-row">
            <div class="summary-label">Sub Total</div>
            <div class="summary-value">${money(subtotal)}</div>
          </div>

          <div class="summary-row">
            <div class="summary-label">Tax</div>
            <div class="summary-value">${money(taxAmount)}</div>
          </div>

          <div class="summary-row">
            <div class="summary-label">Discounts</div>
            <div class="summary-value">${money(discountAmount)}</div>
          </div>

          <div class="summary-row grand-row">
            <div class="summary-label">Grand Total</div>
            <div class="summary-value">${money(grandTotal)}</div>
          </div>
        </div>

        <div class="signature-box">
          <div class="signature-title">For ${escapeHtml(company.name)}</div>
          <div class="signature-space">Authorized signatory</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div>
        <strong>Remarks:</strong>
        ${escapeHtml(po.remarks || po.notes || "Please supply the listed items by the required date.")}
      </div>

      <div>
        <strong>Contact:</strong>
        ${escapeHtml(company.email || company.phone || "Fresh World Exporters")}
      </div>
    </div>
  </div>
</body>
</html>
`;
};

const generatePurchaseOrderPdf = async (bundle) => {
  const po = bundle.po || {};
  const supplier = bundle.supplier || {};
  const items = Array.isArray(bundle.items) ? bundle.items : [];

  const company = bundle.company || {
    name: process.env.COMPANY_NAME || "Fresh World Exporters",
    email: process.env.COMPANY_EMAIL || "",
    phone: process.env.COMPANY_PHONE || "",
    address: process.env.COMPANY_ADDRESS || "",
  };

  const outputDir = path.join(process.cwd(), "uploads", "purchase-orders");
  ensureDir(outputDir);

  const fileName = `${fileSafe(po.po_number)}-${Date.now()}.pdf`;
  const absPath = path.join(outputDir, fileName);
  const publicPath = `/uploads/purchase-orders/${fileName}`;

  const html = buildPurchaseOrderHtml({
    po,
    supplier,
    items,
    company,
  });

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    await page.pdf({
      path: absPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0px",
        right: "0px",
        bottom: "0px",
        left: "0px",
      },
    });
  } finally {
    await browser.close();
  }

  return {
    fileName,
    absPath,
    absolutePath: absPath,
    publicPath,
  };
};

module.exports = {
  buildPurchaseOrderHtml,
  generatePurchaseOrderPdf,
};