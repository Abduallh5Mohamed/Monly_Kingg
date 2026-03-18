import crypto from "crypto";

export default function csrfProtection(req, res, next) {
  const method = req.method;
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return next();

  // SECURITY FIX [VULN-M05]: Consolidated to a single normalized path set to eliminate
  // duplicate maintenance risk (previously had /v1/auth/... AND /auth/... duplicates).
  const publicPaths = new Set([
    '/auth/register',
    '/auth/login',
    '/auth/refresh',
    '/auth/verify-email',
    '/auth/resend-code',
    '/auth/forgot-password',
    '/auth/verify-reset-token',
    '/auth/reset-password',
    '/auth/csrf-token',
    '/auth/google',
    '/auth/google/callback',
    '/support/messages',
  ]);

  // Normalize once: strip /api/v1 or /api prefix, then strip query string
  const normalizedPath = (req.originalUrl || "")
    .split("?")[0]
    .replace(/^\/api(?:\/v1)?/, "");

  if (publicPaths.has(normalizedPath)) {
    return next();
  }

  // Pattern-based public routes (e.g., ad click tracking)
  // SECURITY FIX [VULN-M05]: Use strict ObjectId pattern instead of loose [a-f0-9]+
  const publicPatterns = [
    /^\/ads\/[a-f0-9]{24}\/click$/  // POST /ads/:id/click
  ];

  if (publicPatterns.some(pattern => pattern.test(normalizedPath))) {
    return next();
  }

  const csrfCookie = req.cookies?.[process.env.CSRF_COOKIE_NAME || "XSRF-TOKEN"];
  const csrfHeader = req.get("X-XSRF-TOKEN");

  // SECURITY FIX [H-01]: Use constant-time token comparison to reduce timing attack surface.
  const isTokenMismatch =
    !csrfCookie ||
    !csrfHeader ||
    csrfCookie.length !== csrfHeader.length ||
    !crypto.timingSafeEqual(Buffer.from(csrfCookie), Buffer.from(csrfHeader));

  if (isTokenMismatch) {
    return res.status(403).json({ message: "Invalid CSRF token" });
  }

  next();
}
