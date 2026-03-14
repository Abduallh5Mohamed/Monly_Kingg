function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getFrontendBaseUrl() {
  return (process.env.FRONTEND_URL || "http://localhost:5000").replace(/\/$/, "");
}

export function getMonlyKingLogoUrl() {
  return `${getFrontendBaseUrl()}/assets/logo.png`;
}

export function buildEmailLayout({ title, subtitle = "", contentHtml }) {
  const safeTitle = escapeHtml(title);
  const safeSubtitle = escapeHtml(subtitle);
  const year = new Date().getFullYear();

  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${safeTitle}</title>
    </head>
    <body style="margin:0;padding:0;background:#0b1220;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b1220;padding:24px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#111827;border:1px solid #1f2937;border-radius:16px;overflow:hidden;">
              <tr>
                <td style="background:linear-gradient(90deg,#111827 0%,#1e3a8a 100%);padding:24px;text-align:center;">
                  <img src="${getMonlyKingLogoUrl()}" alt="MonlyKing" style="width:180px;max-width:100%;height:auto;display:block;margin:0 auto 12px;" />
                  <h1 style="margin:0;font-size:24px;line-height:1.3;color:#f9fafb;">${safeTitle}</h1>
                  ${safeSubtitle ? `<p style="margin:8px 0 0;font-size:14px;color:#cbd5e1;">${safeSubtitle}</p>` : ""}
                </td>
              </tr>
              <tr>
                <td style="padding:24px;">${contentHtml}</td>
              </tr>
              <tr>
                <td style="padding:16px 24px;border-top:1px solid #1f2937;color:#9ca3af;font-size:12px;line-height:1.6;">
                  <div>MonlyKing Store</div>
                  <div>Support: monlykingstore@gmail.com</div>
                  <div style="margin-top:6px;">&copy; ${year} MonlyKing. All rights reserved.</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

export function buildVerificationEmail({ username, code, expiresInMinutes = 10 }) {
  const safeUser = escapeHtml(username || "there");
  const safeCode = escapeHtml(code);

  return buildEmailLayout({
    title: "Verify Your MonlyKing Account",
    subtitle: "Secure your account in one step",
    contentHtml: `
      <p style="margin:0 0 12px;font-size:15px;color:#d1d5db;">Hi ${safeUser},</p>
      <p style="margin:0 0 16px;font-size:15px;color:#d1d5db;">Use this verification code to activate your account:</p>
      <div style="font-size:28px;font-weight:700;letter-spacing:4px;background:#0f172a;border:1px dashed #60a5fa;color:#f8fafc;padding:14px 18px;border-radius:10px;text-align:center;margin:0 0 16px;">${safeCode}</div>
      <p style="margin:0 0 10px;font-size:14px;color:#9ca3af;">This code expires in ${expiresInMinutes} minutes.</p>
      <p style="margin:0;font-size:13px;color:#94a3b8;">If you did not create this account, you can safely ignore this email.</p>
    `,
  });
}

export function buildLoginAlertEmail({ username, loginAt, ip, userAgent }) {
  const safeUser = escapeHtml(username || "there");
  const safeIp = escapeHtml(ip || "Unknown");
  const safeUserAgent = escapeHtml(userAgent || "Unknown device");

  return buildEmailLayout({
    title: "New Login Detected",
    subtitle: "MonlyKing account activity notification",
    contentHtml: `
      <p style="margin:0 0 14px;font-size:15px;color:#d1d5db;">Hi ${safeUser},</p>
      <p style="margin:0 0 18px;font-size:15px;color:#d1d5db;">A new login to your MonlyKing account was detected:</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#0f172a;border:1px solid #334155;border-radius:10px;overflow:hidden;">
        <tr><td style="padding:10px 12px;color:#94a3b8;font-size:13px;width:140px;">Time</td><td style="padding:10px 12px;color:#f8fafc;font-size:13px;">${escapeHtml(new Date(loginAt).toLocaleString())}</td></tr>
        <tr><td style="padding:10px 12px;color:#94a3b8;font-size:13px;border-top:1px solid #1e293b;">IP Address</td><td style="padding:10px 12px;color:#f8fafc;font-size:13px;border-top:1px solid #1e293b;">${safeIp}</td></tr>
        <tr><td style="padding:10px 12px;color:#94a3b8;font-size:13px;border-top:1px solid #1e293b;">Device</td><td style="padding:10px 12px;color:#f8fafc;font-size:13px;border-top:1px solid #1e293b;">${safeUserAgent}</td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">If this was not you, reset your password immediately.</p>
    `,
  });
}

export function buildTransactionInvoiceEmail({
  heading,
  intro,
  transactionId,
  status,
  listingTitle,
  amount,
  originalAmount,
  discountPercent,
  buyerName,
  buyerEmail,
  sellerName,
  sellerEmail,
  note,
  createdAt = new Date(),
}) {
  const currency = (value) => (typeof value === "number" ? `${value.toFixed(2)} EGP` : "-");

  return buildEmailLayout({
    title: heading,
    subtitle: "MonlyKing Transaction Invoice",
    contentHtml: `
      <p style="margin:0 0 14px;font-size:15px;color:#d1d5db;">${escapeHtml(intro)}</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#0f172a;border:1px solid #334155;border-radius:10px;overflow:hidden;">
        <tr><td style="padding:10px 12px;color:#94a3b8;font-size:13px;width:180px;">Invoice ID</td><td style="padding:10px 12px;color:#f8fafc;font-size:13px;">${escapeHtml(transactionId)}</td></tr>
        <tr><td style="padding:10px 12px;color:#94a3b8;font-size:13px;border-top:1px solid #1e293b;">Status</td><td style="padding:10px 12px;color:#f8fafc;font-size:13px;border-top:1px solid #1e293b;">${escapeHtml(status)}</td></tr>
        <tr><td style="padding:10px 12px;color:#94a3b8;font-size:13px;border-top:1px solid #1e293b;">Date</td><td style="padding:10px 12px;color:#f8fafc;font-size:13px;border-top:1px solid #1e293b;">${escapeHtml(new Date(createdAt).toLocaleString())}</td></tr>
        <tr><td style="padding:10px 12px;color:#94a3b8;font-size:13px;border-top:1px solid #1e293b;">Listing</td><td style="padding:10px 12px;color:#f8fafc;font-size:13px;border-top:1px solid #1e293b;">${escapeHtml(listingTitle || "-")}</td></tr>
        <tr><td style="padding:10px 12px;color:#94a3b8;font-size:13px;border-top:1px solid #1e293b;">Buyer</td><td style="padding:10px 12px;color:#f8fafc;font-size:13px;border-top:1px solid #1e293b;">${escapeHtml(buyerName || "-")} (${escapeHtml(buyerEmail || "-")})</td></tr>
        <tr><td style="padding:10px 12px;color:#94a3b8;font-size:13px;border-top:1px solid #1e293b;">Seller</td><td style="padding:10px 12px;color:#f8fafc;font-size:13px;border-top:1px solid #1e293b;">${escapeHtml(sellerName || "-")} (${escapeHtml(sellerEmail || "-")})</td></tr>
        <tr><td style="padding:10px 12px;color:#94a3b8;font-size:13px;border-top:1px solid #1e293b;">Original Amount</td><td style="padding:10px 12px;color:#f8fafc;font-size:13px;border-top:1px solid #1e293b;">${currency(originalAmount)}</td></tr>
        <tr><td style="padding:10px 12px;color:#94a3b8;font-size:13px;border-top:1px solid #1e293b;">Discount</td><td style="padding:10px 12px;color:#f8fafc;font-size:13px;border-top:1px solid #1e293b;">${typeof discountPercent === "number" ? `${discountPercent}%` : "-"}</td></tr>
        <tr><td style="padding:10px 12px;color:#93c5fd;font-size:13px;border-top:1px solid #1e293b;font-weight:700;">Final Amount</td><td style="padding:10px 12px;color:#bfdbfe;font-size:13px;border-top:1px solid #1e293b;font-weight:700;">${currency(amount)}</td></tr>
      </table>
      ${note ? `<p style="margin:14px 0 0;font-size:13px;color:#cbd5e1;">${escapeHtml(note)}</p>` : ""}
      <p style="margin:14px 0 0;font-size:12px;color:#94a3b8;">Account credentials are never included in invoice emails for security.</p>
    `,
  });
}
