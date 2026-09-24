const nodemailer = require("nodemailer");

// Email is optional: without SMTP settings the app still works and the
// admin is told that no email was sent.
const isMailConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 587);

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return transporter;
};

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);

const layout = (title, body) => `
  <div style="font-family:Arial,sans-serif;background:#f4f6fb;padding:32px 16px">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:#1d4ed8;color:#ffffff;padding:20px 28px;font-size:20px;font-weight:bold;letter-spacing:2px">SOLVEXA</div>
      <div style="padding:28px;color:#1f2937;font-size:15px;line-height:1.6">
        <h2 style="margin:0 0 14px;font-size:20px;color:#0f172a">${title}</h2>
        ${body}
      </div>
      <div style="padding:16px 28px;background:#f8fafc;color:#94a3b8;font-size:12px">
        This is an automated message from SOLVEXA. Please do not reply.
      </div>
    </div>
  </div>`;

/**
 * Sends the staff decision email.
 * Resolves to { sent: true } or { sent: false, reason }.
 */
const sendStaffDecisionEmail = async (user, decision, reason) => {
  if (!isMailConfigured()) {
    return { sent: false, reason: "Email is not set up on the server" };
  }

  const loginUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/`;
  const name = escapeHtml(user.name.split(" ")[0]);

  const message =
    decision === "approved"
      ? {
          subject: "You're selected — welcome to the SOLVEXA staff team",
          html: layout(
            `Congratulations, ${name}! 🎉`,
            `<p>Your application to join <b>SOLVEXA</b> as staff has been <b style="color:#15803d">approved</b>.</p>
             <p>You can now log in with the email and password you used when applying:</p>
             <p style="margin:22px 0">
               <a href="${loginUrl}" style="background:#059669;color:#ffffff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Open SOLVEXA</a>
             </p>
             <p>On the site, click <b>Staff</b> in the top menu, then log in. Reports assigned to you will appear in your Staff Workspace.</p>`
          ),
        }
      : {
          subject: "Update on your SOLVEXA staff application",
          html: layout(
            `Hello ${name},`,
            `<p>Thank you for applying to join the SOLVEXA staff team. After reviewing your application, we are unable to approve it at this time.</p>
             ${reason ? `<p style="padding:12px 14px;background:#fef2f2;border-radius:8px;color:#7f1d1d"><b>Reason:</b> ${escapeHtml(reason)}</p>` : ""}
             <p>If you believe this is a mistake, please contact the SOLVEXA administrator.</p>`
          ),
        };

  try {
    await getTransporter().sendMail({
      from: process.env.MAIL_FROM || `SOLVEXA <${process.env.SMTP_USER}>`,
      to: user.email,
      ...message,
    });

    return { sent: true };
  } catch (error) {
    console.error("Email send error:", error.message);
    return { sent: false, reason: "The email could not be sent" };
  }
};

module.exports = { isMailConfigured, sendStaffDecisionEmail };
