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
    '/v1/auth/reset-password',
    '/v1/auth/csrf-token',
    '/v1/users/complete-profile'
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
