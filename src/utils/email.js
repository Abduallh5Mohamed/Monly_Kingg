import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_PATH = path.join(__dirname, "../../public/assets/logo.png");
const EMAIL_DEBUG = String(process.env.EMAIL_DEBUG || "").toLowerCase() === "true";
const EMAIL_INLINE_LOGO = String(process.env.EMAIL_INLINE_LOGO || "").toLowerCase() === "true";

const STAMP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="340" height="340" viewBox="0 0 340 340">
  <defs>
    <style>
      .ring { fill: none; stroke: #dc2626; stroke-width: 12; }
      .ring2 { fill: none; stroke: #ef4444; stroke-width: 4; }
      .txt { font-family: Arial, Helvetica, sans-serif; font-weight: 800; fill: #dc2626; letter-spacing: 3px; }
      .sub { font-family: Arial, Helvetica, sans-serif; font-weight: 700; fill: #b91c1c; letter-spacing: 2px; }
    </style>
  </defs>
  <circle class="ring" cx="170" cy="170" r="145" />
  <circle class="ring2" cx="170" cy="170" r="122" />
  <text class="txt" x="170" y="128" text-anchor="middle" font-size="30">MONLYKING</text>
  <text class="txt" x="170" y="172" text-anchor="middle" font-size="38">OFFICIAL</text>
  <text class="sub" x="170" y="210" text-anchor="middle" font-size="24">TRANSACTION SEAL</text>
  <rect x="64" y="232" width="212" height="34" fill="none" stroke="#dc2626" stroke-width="3" rx="6" />
  <text class="sub" x="170" y="256" text-anchor="middle" font-size="18">VERIFIED</text>
</svg>`;

function stripHtml(html = "") {
  return String(html)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const sendEmail = async (to, subject, content) => {
  // Validate recipient
  if (!to || typeof to !== 'string' || !to.includes('@') || to.length > 254) {
    throw new Error(`Invalid email recipient: ${typeof to}`);
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: String(process.env.SMTP_USER || "").trim(),
      pass: String(process.env.SMTP_PASS || "").trim(),
    },
  });

  let body = String(content || "");
  const looksLikeHtml = /<[^>]+>/.test(body);
  const attachments = [];

  // Keep CID by default (best cross-client support). Optional inline base64 mode via EMAIL_INLINE_LOGO=true.
  if (looksLikeHtml && fs.existsSync(LOGO_PATH)) {
    if (EMAIL_INLINE_LOGO) {
      try {
        const logoBuffer = fs.readFileSync(LOGO_PATH);
        const logoBase64 = logoBuffer.toString("base64");
        const inlineDataUri = `data:image/png;base64,${logoBase64}`;
        body = body
          .replace(/src=\"cid:monlyking-logo\"/g, `src=\"${inlineDataUri}\"`)
          .replace(/src='cid:monlyking-logo'/g, `src='${inlineDataUri}'`);
      } catch {
        // Fallback to CID attachment below.
      }
    }

    attachments.push({
      filename: "logo.png",
      path: LOGO_PATH,
      cid: "monlyking-logo",
      contentDisposition: "inline",
    });
  }

  if (looksLikeHtml) {
    attachments.push({
      filename: "monlyking-stamp.svg",
      content: Buffer.from(STAMP_SVG, "utf8"),
      contentType: "image/svg+xml",
      cid: "monlyking-stamp",
      contentDisposition: "inline",
    });
  }

  const mailOptions = {
    from: `"MonlyKing" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text: looksLikeHtml ? stripHtml(body) : body,
    ...(looksLikeHtml ? { html: body } : {}),
    ...(attachments.length ? { attachments } : {}),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    if (EMAIL_DEBUG) {
      console.log("[Email] Sent", {
        to,
        subject,
        messageId: info?.messageId,
        accepted: info?.accepted,
        rejected: info?.rejected,
        response: info?.response,
        hasHtml: looksLikeHtml,
        hasLogoAttachment: attachments.length > 0,
        inlineLogoMode: EMAIL_INLINE_LOGO,
      });
    }
    return info;
  } catch (error) {
    console.error("[Email] Send failed", {
      to,
      subject,
      code: error?.code,
      command: error?.command,
      response: error?.response,
      responseCode: error?.responseCode,
      message: error?.message,
    });
    throw error;
  }
};
