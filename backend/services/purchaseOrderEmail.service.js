const nodemailer = require("nodemailer");

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

const buildPurchaseOrderEmailHtml = ({ supplierName, poNumber, requiredBy }) => {
  const companyName = process.env.COMPANY_NAME || "Fresh World Exporters";
  const companyPhone = process.env.COMPANY_PHONE || "";
  const companyEmail = process.env.COMPANY_EMAIL || "";

  return `
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:0;background:#f6f8f5;font-family:Arial,Helvetica,sans-serif;color:#163322;">
        <div style="max-width:680px;margin:0 auto;padding:24px;">
          <div style="background:#ffffff;border:1px solid #d8e8df;border-radius:16px;overflow:hidden;">
            <div style="background:#0f3d24;color:#ffffff;padding:20px 24px;">
              <h2 style="margin:0;font-size:22px;">Purchase Order</h2>
              <p style="margin:6px 0 0;font-size:13px;color:#d7f3df;">
                ${escapeHtml(companyName)}
              </p>
            </div>

            <div style="padding:24px;">
              <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
                Dear ${escapeHtml(supplierName)},
              </p>

              <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
                Please find attached the purchase order PDF for your review and processing.
              </p>

              <table style="width:100%;border-collapse:collapse;margin:18px 0;background:#f8f7f2;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:12px 14px;font-weight:bold;border-bottom:1px solid #d8e8df;">PO Number</td>
                  <td style="padding:12px 14px;border-bottom:1px solid #d8e8df;">${escapeHtml(poNumber)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 14px;font-weight:bold;border-bottom:1px solid #d8e8df;">Required By</td>
                  <td style="padding:12px 14px;border-bottom:1px solid #d8e8df;">${escapeHtml(requiredBy)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 14px;font-weight:bold;">Company</td>
                  <td style="padding:12px 14px;">${escapeHtml(companyName)}</td>
                </tr>
              </table>

              <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
                Kindly confirm once the order is accepted or if there are any changes required.
              </p>

              <p style="font-size:15px;line-height:1.6;margin:0;">
                Thank you,<br/>
                <strong>${escapeHtml(companyName)}</strong>
              </p>
            </div>

            <div style="padding:16px 24px;background:#f8f7f2;border-top:1px solid #d8e8df;font-size:12px;color:#4a6858;">
              ${escapeHtml(companyPhone)} ${companyPhone && companyEmail ? " | " : ""} ${escapeHtml(companyEmail)}
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

const createTransporter = () => {
  const host = process.env.MAIL_HOST;
  const port = Number(process.env.MAIL_PORT || 587);
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "Email SMTP settings are missing. Please add MAIL_HOST, MAIL_PORT, MAIL_USER, and MAIL_PASS in backend/.env"
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: String(process.env.MAIL_SECURE || "false") === "true",
    auth: {
      user,
      pass,
    },
  });
};

const sendPurchaseOrderEmail = async ({
  to,
  subject,
  html,
  pdfPath,
  pdfFileName,
}) => {
  if (!to) {
    throw new Error("Supplier email is missing");
  }

  const transporter = createTransporter();

  const actualRecipient = process.env.PO_EMAIL_TEST_TO || to;

  const mailOptions = {
    from: {
      name: process.env.MAIL_FROM_NAME || "Fresh World Exporters",
      address: process.env.MAIL_FROM_EMAIL || process.env.MAIL_USER,
    },
    to: actualRecipient,
    subject,
    html,
    attachments: [
      {
        filename: pdfFileName || "purchase-order.pdf",
        path: pdfPath,
        contentType: "application/pdf",
      },
    ],
  };

  const info = await transporter.sendMail(mailOptions);

  return {
    messageId: info.messageId,
    actualRecipient,
  };
};

module.exports = {
  sendPurchaseOrderEmail,
  buildPurchaseOrderEmailHtml,
};