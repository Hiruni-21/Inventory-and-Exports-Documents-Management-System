const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const { buildPurchaseOrderHtml } = require("../templates/purchaseOrderTemplate");

const sanitizeFileName = (value) =>
  String(value || "purchase-order")
    .replace(/[<>:"/\\|?*]+/g, "-")
    .replace(/\s+/g, "-")
    .trim();

const resolveLogoPath = () => {
  const envPath = process.env.COMPANY_LOGO_PATH || "assets/company-logo.png";

  const candidates = [
    envPath,
    path.resolve(process.cwd(), envPath),
    path.resolve(process.cwd(), envPath.replace(/^backend[\\/]/, "")),
    path.resolve(__dirname, "..", envPath),
    path.resolve(__dirname, "..", envPath.replace(/^backend[\\/]/, "")),
    path.resolve(__dirname, "..", "assets", "company-logo.png"),
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
};

async function generatePurchaseOrderPdf({ po, supplier, items, company }) {
  const uploadsDir = path.join(__dirname, "..", "uploads", "purchase-orders");
  fs.mkdirSync(uploadsDir, { recursive: true });

  const safeFileName = `${sanitizeFileName(po.po_number)}.pdf`;
  const absPath = path.join(uploadsDir, safeFileName);
  const publicPath = `/uploads/purchase-orders/${safeFileName}`;

  let logoUrl = "";
  const logoPath = resolveLogoPath();

  if (logoPath) {
    const ext = path.extname(logoPath).toLowerCase();
    const mime =
      ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".webp"
        ? "image/webp"
        : "image/png";

    const logoBase64 = fs.readFileSync(logoPath).toString("base64");
    logoUrl = `data:${mime};base64,${logoBase64}`;
  }

  const html = buildPurchaseOrderHtml({
    company,
    supplier,
    po,
    items,
    totals: {
      subtotal: Number(po.total_amount || 0),
      total: Number(po.total_amount || 0),
    },
    logoUrl,
  });

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");

    await page.pdf({
      path: absPath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "14mm",
        right: "10mm",
        bottom: "14mm",
        left: "10mm",
      },
    });
  } finally {
    await browser.close();
  }

  return {
    absPath,
    publicPath,
    fileName: safeFileName,
  };
}

module.exports = { generatePurchaseOrderPdf };