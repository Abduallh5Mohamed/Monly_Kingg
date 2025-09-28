export default function csrfProtection(req, res, next) {
  const method = req.method;
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return next();

  const publicPaths = [
    '/api/v1/auth/register',
    '/api/v1/auth/login',
    '/api/v1/auth/verify-email',
    '/api/v1/auth/resend-code',
    '/api/v1/auth/csrf-token'
  ];

  if (publicPaths.includes(req.path)) {
    return next();
  }

  const csrfCookie = req.cookies?.[process.env.CSRF_COOKIE_NAME || "XSRF-TOKEN"];
  const csrfHeader = req.get("X-XSRF-TOKEN");
  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ message: "Invalid CSRF token" });
  }
  next();
}
