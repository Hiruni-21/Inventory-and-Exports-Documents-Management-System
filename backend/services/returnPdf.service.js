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

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const fileSafe = (value) =>
  String(value || "return-note")
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

        return `data:${mimeType};base64,${image}`;
      }
    } catch (err) {
      console.error("Failed to load PO PDF logo:", logoPath, err.message);
    }
  }

  return "";
};

const buildReturnHtml = ({ returnNote, supplier, company }) => {
  const logoDataUri = getLogoDataUri();
  const returnNumber = returnNote.return_number || `RN-${String(returnNote.id).padStart(4, "0")}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(returnNumber)}</title>

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
      border-bottom: 5px solid #c82f2f;
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
      color: #c82f2f;
      letter-spacing: 4px;
      margin-bottom: 16px;
    }

    .po-meta {
      display: inline-block;
      min-width: 270px;
      text-align: left;
      background: #fff2f2;
      border: 1px solid #fbd4d4;
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
      background: #c82f2f;
      border-radius: 999px;
      display: inline-block;
    }

    .supplier-card {
      background: #fdfdfd;
      border: 1px solid #e0e0e0;
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

    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 24px;
    }

    .items-table th {
      background: #c82f2f;
      color: white;
      font-weight: 900;
      padding: 10px 8px;
      border: 1px solid #ebabab;
      text-align: left;
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

    .bottom-area {
      margin-top: auto;
      display: grid;
      grid-template-columns: 1fr 310px;
      gap: 24px;
      align-items: start;
    }

    .terms-box {
      background: #fffcf2;
      border: 1px solid #fbe6d4;
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

    .signature-box {
      border: 1px solid #d4d4d4;
      border-radius: 12px;
      overflow: hidden;
    }

    .signature-title {
      background: #c82f2f;
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
        <div class="po-title">RETURN NOTE</div>

        <div class="po-meta">
          <div class="meta-row">
            <div class="meta-label">RN No</div>
            <div>${escapeHtml(returnNumber)}</div>
          </div>

          <div class="meta-row">
            <div class="meta-label">Date</div>
            <div>${escapeHtml(fmtDate(returnNote.created_at))}</div>
          </div>

          <div class="meta-row">
            <div class="meta-label">Status</div>
            <div>${escapeHtml(returnNote.status || "draft")}</div>
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
            <div>${escapeHtml(returnNote.created_by_name || "Fresh World ERP")}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Returned Items</div>

      <table class="items-table">
        <thead>
          <tr>
            <th>Item Name</th>
            <th>Batch Code</th>
            <th>Return Quantity</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          ${(returnNote.items || [])
            .map(
              (item) => `
          <tr>
            <td><strong>${escapeHtml(item.item_name)}</strong></td>
            <td>${escapeHtml(item.batch_code)}</td>
            <td>${escapeHtml(item.quantity)}</td>
            <td>${escapeHtml(item.reason)}</td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>

    <div class="bottom-area">
      <div class="terms-box">
        <div class="terms-title">Notes & Adjustments</div>
        <p>${escapeHtml(returnNote.notes || "No additional notes provided.")}</p>
        <ol style="margin-top: 15px; padding-left: 16px;">
          <li>This document serves as an official notice of goods returned.</li>
          <li>Please reflect this return in your upcoming invoice or provide a credit note.</li>
        </ol>
      </div>

      <div>
        <div class="signature-box">
          <div class="signature-title">For ${escapeHtml(company.name)}</div>
          <div class="signature-space">Authorized signatory</div>
        </div>
      </div>
    </div>

    <div class="footer">
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

const generateReturnPdf = async (bundle) => {
  const returnNote = bundle.returnNote || {};
  const supplier = bundle.supplier || {};

  const company = bundle.company || {
    name: process.env.COMPANY_NAME || "Fresh World Exporters",
    email: process.env.COMPANY_EMAIL || "",
    phone: process.env.COMPANY_PHONE || "",
    address: process.env.COMPANY_ADDRESS || "",
  };

  const outputDir = path.join(process.cwd(), "uploads", "returns");
  ensureDir(outputDir);

  const returnNumber = returnNote.return_number || `RN-${String(returnNote.id).padStart(4, "0")}`;
  const fileName = `${fileSafe(returnNumber)}-${Date.now()}.pdf`;
  const absPath = path.join(outputDir, fileName);
  const publicPath = `/uploads/returns/${fileName}`;

  const html = buildReturnHtml({
    returnNote,
    supplier,
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
  buildReturnHtml,
  generateReturnPdf,
};
