import rateLimit from "express-rate-limit";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs (increased for Socket.IO)
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for Socket.IO connections
    return req.path.includes('/socket.io/');
  }
});

// more strict limiter for resend endpoint
export const resendLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // max 3 per minute per IP
  message: { message: "Too many requests, please try again later." }
});
