import crypto from "crypto";

export default function csrfProtection(req, res, next) {
  const method = req.method;
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return next();

  const publicPaths = [
    '/v1/auth/register',
    '/v1/auth/login',
    '/v1/auth/refresh',
    '/v1/auth/verify-email',
    '/v1/auth/resend-code',
    '/v1/auth/forgot-password',
    '/v1/auth/verify-reset-token',
    '/v1/auth/reset-password',
    '/v1/auth/csrf-token',
    '/v1/auth/google',
    '/v1/auth/google/callback',
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
    '/auth/google/callback'
  ];

  const normalizedOriginalPath = (req.originalUrl || "").replace(/^\/api/, "");

  // Exact path match
  if (publicPaths.includes(req.path) || publicPaths.includes(normalizedOriginalPath)) {
    return next();
  }

  // Pattern-based public routes (e.g., ad click tracking)
  const publicPatterns = [
    /^\/v1\/ads\/[a-f0-9]+\/click$/  // POST /v1/ads/:id/click
  ];

  if (publicPatterns.some(pattern => pattern.test(req.path))) {
    return next();
  }

  const csrfCookie = req.cookies?.[process.env.CSRF_COOKIE_NAME || "XSRF-TOKEN"];
  const csrfHeader = req.get("X-XSRF-TOKEN");

  // SECURITY FIX: [HIGH-01] Use constant-time token comparison to reduce timing attack surface.
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
