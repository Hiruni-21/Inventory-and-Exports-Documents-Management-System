const nodemailer = require("nodemailer");

/**
 * Send password reset email.
 * Currently simulated for console logging to satisfy the requirement of not implementing third-party/real email yet,
 * but architected separately for easy future SMTP or third-party integration.
 * 
 * @param {string} email Recipient email address
 * @param {string} resetToken Temporary token
 * @param {string} resetLink Password reset URL
 */
const sendPasswordResetEmail = async (email, resetToken, resetLink) => {
  // Console logging simulation
  console.log("================================================================================");
  console.log(`[EMAIL SERVICE] PASSWORD RESET REQUESTED`);
  console.log(`[EMAIL SERVICE] Recipient: ${email}`);
  console.log(`[EMAIL SERVICE] Reset Token: ${resetToken}`);
  console.log(`[EMAIL SERVICE] Expiration: 15 minutes`);
  console.log(`[EMAIL SERVICE] Reset Link: ${resetLink}`);
  console.log("================================================================================");

  // In the future, to switch to real SMTP/nodemailer, uncomment the following block:
  /*
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: String(process.env.MAIL_SECURE || "false") === "true",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  const mailOptions = {
    from: {
      name: process.env.MAIL_FROM_NAME || "Fresh World Exporters",
      address: process.env.MAIL_FROM_EMAIL || process.env.MAIL_USER,
    },
    to: email,
    subject: "Reset Your Password - Fresh World ERP",
    html: `
      <h2>Password Reset Request</h2>
      <p>You requested to reset your password. Click the link below to reset it. This link is valid for 15 minutes.</p>
      <p><a href="${resetLink}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;">Reset Password</a></p>
      <p>If you did not request this, please ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
  */

  return { success: true, message: "Email simulation successful" };
};

module.exports = {
  sendPasswordResetEmail,
};
