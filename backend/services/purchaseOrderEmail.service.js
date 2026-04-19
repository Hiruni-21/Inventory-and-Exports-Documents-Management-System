const nodemailer = require("nodemailer");

function createMailer() {
  const host = process.env.MAIL_HOST;
  const port = Number(process.env.MAIL_PORT || 587);
  const secure = String(process.env.MAIL_SECURE || "false") === "true";
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP configuration is incomplete. Set MAIL_HOST, MAIL_USER, and MAIL_PASS in backend/.env"
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

async function sendPurchaseOrderEmail({
  to,
  subject,
  html,
  pdfPath,
  pdfFileName,
}) {
  if (!to) {
    throw new Error("Recipient email is required");
  }

  const transporter = createMailer();

  const info = await transporter.sendMail({
    from: `"${process.env.MAIL_FROM_NAME || "Fresh World Exporters"}" <${
      process.env.MAIL_FROM_EMAIL || process.env.MAIL_USER
    }>`,
    to,
    subject,
    html,
    attachments: [
      {
        filename: pdfFileName,
        path: pdfPath,
      },
    ],
  });

  return info;
}

function buildPurchaseOrderEmailHtml({ supplierName, poNumber, requiredBy }) {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #1A2E22; line-height: 1.6;">
      <p>Dear ${supplierName || "Supplier"},</p>
      <p>Please find attached Purchase Order <strong>${poNumber}</strong> from Fresh World Exporters.</p>
      <p>Required By: <strong>${requiredBy || "-"}</strong></p>
      <p>Please review the attached document and proceed accordingly.</p>
      <p>Regards,<br/>Fresh World Exporters Procurement Team</p>
    </div>
  `;
}

module.exports = {
  createMailer,
  sendPurchaseOrderEmail,
  buildPurchaseOrderEmailHtml,
};