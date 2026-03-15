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
  const explicitLogoUrl = process.env.EMAIL_LOGO_URL;
  if (explicitLogoUrl) {
    return explicitLogoUrl;
  }
  return "cid:monlyking-logo";
}

export function buildEmailLayout({ title, subtitle = "", contentHtml }) {
  const safeTitle = escapeHtml(title);
  const safeSubtitle = escapeHtml(subtitle);
  const year = new Date().getFullYear();
  const logoUrl = getMonlyKingLogoUrl();

  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${safeTitle}</title>
      <meta name="color-scheme" content="dark" />
      <meta name="supported-color-schemes" content="dark" />
    </head>
    <body style="margin:0;padding:0;background:#070e1d;font-family:'Segoe UI',Tahoma,Arial,Helvetica,sans-serif;color:#e5e7eb;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#070e1d;padding:26px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:650px;border-radius:18px;overflow:hidden;background:#0f172a;border:1px solid #22304a;box-shadow:0 18px 38px rgba(2,8,23,.55);">
              <tr>
                <td style="padding:0;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                    <tr>
                      <td style="padding:26px 26px 22px;background:linear-gradient(130deg,#0f1c38 0%,#1f3d8f 52%,#182c61 100%);border-bottom:1px solid rgba(203,213,225,.2);text-align:center;">
                        <img src="${logoUrl}" alt="MonlyKing" style="width:198px;max-width:100%;height:auto;display:block;margin:0 auto 12px;" />
                        <h1 style="margin:0;font-size:38px;line-height:1;color:#f8fafc;font-weight:800;letter-spacing:.01em;">${safeTitle}</h1>
                        ${safeSubtitle ? `<p style="margin:9px 0 0;font-size:18px;line-height:1.4;color:#dbe7ff;">${safeSubtitle}</p>` : ""}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:24px 26px;background:#0f172a;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                    <tr>
                      <td style="padding:20px;border:1px solid #2e3d58;border-radius:14px;background:linear-gradient(180deg,#101d35 0%,#0f172a 100%);">
                        ${contentHtml}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:15px 26px 22px;border-top:1px solid #22304a;color:#95a8c5;font-size:12px;line-height:1.8;background:#0d1527;">
                  <div style="font-weight:700;color:#f1f5f9;letter-spacing:.02em;">MonlyKing Store</div>
                  <div style="margin-top:2px;">Support: monlykingstore@gmail.com</div>
                  <div style="margin-top:8px;color:#72829d;">&copy; ${year} MonlyKing. All rights reserved.</div>
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
      <p style="margin:0 0 16px;font-size:15px;color:#d1d5db;">Use this one-time verification code to activate your account:</p>
      <div style="font-size:30px;font-weight:800;letter-spacing:5px;background:linear-gradient(90deg,#0f172a 0%,#12213f 100%);border:1px dashed #38bdf8;color:#f8fafc;padding:14px 18px;border-radius:12px;text-align:center;margin:0 0 16px;">${safeCode}</div>
      <p style="margin:0 0 10px;font-size:14px;color:#9ca3af;">This code expires in <strong style="color:#cbd5e1;">${expiresInMinutes} minutes</strong>.</p>
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
      <p style="margin:0 0 14px;font-size:22px;color:#e2e8f0;">Hi ${safeUser},</p>
      <p style="margin:0 0 18px;font-size:16px;color:#d1d5db;">A new login to your MonlyKing account was detected:</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#0f1a32;border:1px solid #334155;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:11px 12px;color:#9db0cc;font-size:14px;width:140px;">Time</td><td style="padding:11px 12px;color:#f8fafc;font-size:14px;">${escapeHtml(new Date(loginAt).toLocaleString())}</td></tr>
        <tr><td style="padding:11px 12px;color:#9db0cc;font-size:14px;border-top:1px solid #21314c;">IP Address</td><td style="padding:11px 12px;color:#f8fafc;font-size:14px;border-top:1px solid #21314c;">${safeIp}</td></tr>
        <tr><td style="padding:11px 12px;color:#9db0cc;font-size:14px;border-top:1px solid #21314c;">Device</td><td style="padding:11px 12px;color:#f8fafc;font-size:14px;border-top:1px solid #21314c;">${safeUserAgent}</td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:14px;color:#a4b4cd;">If this was not you, reset your password immediately.</p>
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
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0 0 12px;">
        <tr>
          <td align="center" style="padding:2px 0 6px;">
            <img src="cid:monlyking-stamp" alt="MonlyKing Official Stamp" style="display:block;width:160px;max-width:100%;height:auto;margin:0 auto;" />
            <div style="margin-top:6px;color:#ef4444;font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;">Official MonlyKing Seal</div>
          </td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#0f172a;border:1px solid #334155;border-radius:10px;overflow:hidden;">
        <tr>
          <td colspan="2" align="center" style="padding:10px 12px;color:#31415d;font-size:22px;line-height:1;font-weight:900;letter-spacing:.2em;text-transform:uppercase;">
            MONLYKING WATERMARK
          </td>
        </tr>
        <tr><td style="padding:10px 12px;color:#94a3b8;font-size:13px;width:180px;">Invoice ID</td><td style="padding:10px 12px;color:#f8fafc;font-size:13px;">${escapeHtml(transactionId)}</td></tr>
        <tr><td style="padding:10px 12px;color:#94a3b8;font-size:13px;border-top:1px solid #1e293b;">Status</td><td style="padding:10px 12px;color:#f8fafc;font-size:13px;border-top:1px solid #1e293b;">${escapeHtml(status)}</td></tr>
        <tr><td style="padding:10px 12px;color:#94a3b8;font-size:13px;border-top:1px solid #1e293b;">Date</td><td style="padding:10px 12px;color:#f8fafc;font-size:13px;border-top:1px solid #1e293b;">${escapeHtml(new Date(createdAt).toLocaleString())}</td></tr>
        <tr><td style="padding:10px 12px;color:#94a3b8;font-size:13px;border-top:1px solid #1e293b;">Listing</td><td style="padding:10px 12px;color:#f8fafc;font-size:13px;border-top:1px solid #1e293b;">${escapeHtml(listingTitle || "-")}</td></tr>
        <tr><td style="padding:10px 12px;color:#94a3b8;font-size:13px;border-top:1px solid #1e293b;">Buyer</td><td style="padding:10px 12px;color:#f8fafc;font-size:13px;border-top:1px solid #1e293b;">${escapeHtml(buyerName || "-")} </td></tr>
        <tr><td style="padding:10px 12px;color:#94a3b8;font-size:13px;border-top:1px solid #1e293b;">Seller</td><td style="padding:10px 12px;color:#f8fafc;font-size:13px;border-top:1px solid #1e293b;">${escapeHtml(sellerName || "-")}</td></tr>
        <tr><td style="padding:10px 12px;color:#94a3b8;font-size:13px;border-top:1px solid #1e293b;">Original Amount</td><td style="padding:10px 12px;color:#f8fafc;font-size:13px;border-top:1px solid #1e293b;">${currency(originalAmount)}</td></tr>
        <tr><td style="padding:10px 12px;color:#94a3b8;font-size:13px;border-top:1px solid #1e293b;">Discount</td><td style="padding:10px 12px;color:#f8fafc;font-size:13px;border-top:1px solid #1e293b;">${typeof discountPercent === "number" ? `${discountPercent}%` : "-"}</td></tr>
        <tr><td style="padding:10px 12px;color:#93c5fd;font-size:13px;border-top:1px solid #1e293b;font-weight:700;">Final Amount</td><td style="padding:10px 12px;color:#bfdbfe;font-size:13px;border-top:1px solid #1e293b;font-weight:700;">${currency(amount)}</td></tr>
      </table>
      ${note ? `<p style="margin:14px 0 0;font-size:13px;color:#cbd5e1;">${escapeHtml(note)}</p>` : ""}
      <p style="margin:14px 0 0;font-size:12px;color:#94a3b8;">Account credentials are never included in invoice emails for security.</p>
    `,
  });
}
