import nodemailer from "nodemailer";

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
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const body = String(content || "");
  const looksLikeHtml = /<[^>]+>/.test(body);

  await transporter.sendMail({
    from: `"MonlyKing" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text: looksLikeHtml ? stripHtml(body) : body,
    ...(looksLikeHtml ? { html: body } : {}),
  });
};
