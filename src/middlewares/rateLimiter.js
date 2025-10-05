import rateLimit from "express-rate-limit";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Production-ready: 10,000 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skip: (req) => {
    // Skip rate limiting for Socket.IO connections and health checks
    return req.path.includes('/socket.io/') || req.path === '/health';
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

// more strict limiter for resend endpoint
export const resendLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // max 5 per minute per IP (increased for better UX)
  standardHeaders: true,
  message: {
    success: false,
    message: "Too many verification code requests. Please wait 1 minute before trying again."
  }
});

// Strict rate limiter for password reset to prevent enumeration and spam
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // max 3 password reset attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many password reset attempts. Please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});
