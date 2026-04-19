const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

const getTransporter = () => {
  const {
    MAIL_HOST,
    MAIL_PORT,
    MAIL_SECURE,
    MAIL_USER,
    MAIL_PASS,
  } = process.env;

  if (!MAIL_HOST || !MAIL_PORT || !MAIL_USER || !MAIL_PASS) {
    throw new Error(
      "Email config incomplete. Set MAIL_HOST, MAIL_PORT, MAIL_USER, and MAIL_PASS in backend/.env"
    );
  }

  return nodemailer.createTransport({
    host: MAIL_HOST,
    port: Number(MAIL_PORT),
    secure: String(MAIL_SECURE).toLowerCase() === "true",
    auth: {
      user: MAIL_USER,
      pass: MAIL_PASS,
    },
  });
};

const buildReturnHtml = (note) => {
  const companyName = process.env.COMPANY_NAME || "Fresh World Exporters Pvt Ltd";
  const companyEmail = process.env.COMPANY_EMAIL || "freshworldexporters@gmail.com";
  const companyPhone = process.env.COMPANY_PHONE || "+94775637348";
  const companyAddress =
    process.env.COMPANY_ADDRESS ||
    "Fresh World Export (Pvt) Ltd, No 101/2 Malapalla, Pannipitiya, Sri Lanka";

  const rows = (note.items || [])
    .map(
      (item, index) => `
        <tr>
          <td style="padding:8px;border:1px solid #dbe7df;">${index + 1}</td>
          <td style="padding:8px;border:1px solid #dbe7df;">${item.item_code || ""}</td>
          <td style="padding:8px;border:1px solid #dbe7df;">${item.item_name || ""}</td>
          <td style="padding:8px;border:1px solid #dbe7df;">${Number(item.quantity || 0).toFixed(2)} ${item.unit || ""}</td>
          <td style="padding:8px;border:1px solid #dbe7df;">${Number(item.unit_cost || 0).toLocaleString("en-LK", {
            style: "currency",
            currency: "LKR",
            minimumFractionDigits: 0,
          })}</td>
          <td style="padding:8px;border:1px solid #dbe7df;">${Number(item.line_total || 0).toLocaleString("en-LK", {
            style: "currency",
            currency: "LKR",
            minimumFractionDigits: 0,
          })}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#1f3a2c;background:#f7faf7;padding:24px;">
      <div style="max-width:960px;margin:0 auto;background:#ffffff;border:1px solid #dbe7df;border-radius:16px;overflow:hidden;">
        <div style="padding:28px 32px;border-bottom:1px solid #e5efe8;text-align:center;">
          <div style="font-size:34px;font-weight:800;letter-spacing:0.1em;color:#0f5132;">GOODS RETURN NOTE</div>
          <div style="margin-top:12px;font-size:18px;font-weight:700;color:#234d35;">${companyName}</div>
          <div style="margin-top:6px;font-size:14px;color:#516b5a;">${companyAddress}</div>
          <div style="margin-top:4px;font-size:14px;color:#516b5a;">${companyEmail} · ${companyPhone}</div>
        </div>

        <div style="padding:24px 32px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:20px;">
            <div style="background:#f6fbf7;border:1px solid #dbe7df;border-radius:14px;padding:16px;">
              <div style="font-size:12px;font-weight:700;color:#5b7562;letter-spacing:0.08em;">SUPPLIER</div>
              <div style="margin-top:8px;font-size:20px;font-weight:800;color:#173526;">${note.supplier_name || "—"}</div>
              <div style="margin-top:8px;font-size:14px;color:#2e4b3a;">${note.email || "—"}</div>
              <div style="margin-top:4px;font-size:14px;color:#2e4b3a;">${note.contact_number || "—"}</div>
              <div style="margin-top:4px;font-size:14px;color:#2e4b3a;">${note.address || "—"}</div>
            </div>

            <div style="background:#f6fbf7;border:1px solid #dbe7df;border-radius:14px;padding:16px;">
              <div style="display:grid;grid-template-columns:160px 1fr;row-gap:8px;font-size:14px;">
                <div style="font-weight:700;">Document No</div><div>${note.return_number || "—"}</div>
                <div style="font-weight:700;">Date</div><div>${note.return_date || "—"}</div>
                <div style="font-weight:700;">PO No</div><div>${note.po_number || "—"}</div>
                <div style="font-weight:700;">Reason</div><div>${note.reason || "—"}</div>
                <div style="font-weight:700;">Deduct From Payment</div><div>${note.deducted_from_supplier_payment ? "Yes" : "No"}</div>
              </div>
            </div>
          </div>

          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:#eaf5ed;color:#1b5334;">
                <th style="padding:10px;border:1px solid #dbe7df;text-align:left;">#</th>
                <th style="padding:10px;border:1px solid #dbe7df;text-align:left;">Item Code</th>
                <th style="padding:10px;border:1px solid #dbe7df;text-align:left;">Description</th>
                <th style="padding:10px;border:1px solid #dbe7df;text-align:left;">Quantity</th>
                <th style="padding:10px;border:1px solid #dbe7df;text-align:left;">Unit Price</th>
                <th style="padding:10px;border:1px solid #dbe7df;text-align:left;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div style="margin-top:18px;display:flex;justify-content:flex-end;">
            <div style="min-width:280px;border-top:1px solid #dbe7df;padding-top:10px;">
              <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;">
                <span>Subtotal</span>
                <strong>${Number(note.total_amount || 0).toLocaleString("en-LK", {
                  style: "currency",
                  currency: "LKR",
                  minimumFractionDigits: 0,
                })}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:18px;font-weight:800;color:#0f5132;">
                <span>Total Amount</span>
                <span>${Number(note.total_amount || 0).toLocaleString("en-LK", {
                  style: "currency",
                  currency: "LKR",
                  minimumFractionDigits: 0,
                })}</span>
              </div>
            </div>
          </div>

          <div style="margin-top:20px;border-top:1px solid #e5efe8;padding-top:16px;font-size:14px;color:#335442;">
            <div><strong>Remarks:</strong> ${note.remarks || "—"}</div>
            <div style="margin-top:6px;"><strong>Created By:</strong> ${note.created_by_name || "—"}</div>
            <div style="margin-top:6px;"><strong>Photos:</strong> ${note.photos?.length || 0} attached image(s)</div>
          </div>
        </div>
      </div>
    </div>
  `;
};

const sendReturnNoteEmail = async (note, overrideEmail = "") => {
  const transporter = getTransporter();

  const to = (overrideEmail || note.email || "").trim();
  if (!to) {
    throw new Error("Supplier email is missing for this return note");
  }

  const attachments = (note.photos || [])
    .map((photo) => {
      const relativePath = String(photo.file_path || "").replace(/^\/+/, "");
      const fullPath = path.join(process.cwd(), relativePath);
      if (!fs.existsSync(fullPath)) return null;

      return {
        filename: photo.original_name || photo.file_name,
        path: fullPath,
      };
    })
    .filter(Boolean);

  const info = await transporter.sendMail({
    from: `"${process.env.MAIL_FROM_NAME || "Fresh World Exporters"}" <${process.env.MAIL_FROM_EMAIL || process.env.MAIL_USER}>`,
    to,
    subject: `Goods Return Note ${note.return_number}`,
    html: buildReturnHtml(note),
    attachments,
  });

  return info;
};

module.exports = {
  sendReturnNoteEmail,
};