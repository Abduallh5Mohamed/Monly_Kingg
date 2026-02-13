import jwt from "jsonwebtoken";
import User from "../modules/users/user.model.js";
import redis from "../config/redis.js";

export const authMiddleware = async (req, res, next) => {
  try {
    let token = null;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1].trim();
    }

    // Check cookies if no header token
    const cookieName = process.env.ACCESS_TOKEN_COOKIE_NAME || "access_token";
    if (!token && req.cookies && req.cookies[cookieName]) {
      token = req.cookies[cookieName];
      if (typeof token === "string") token = token.trim().replace(/^"|"$/g, "");
    }

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Try Redis cache first (avoid DB hit on every request)
    const cacheKey = `auth:user:${decoded.id}`;
    let user = null;

    if (redis.isReady()) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          user = cached;
        }
      } catch (_) {
        // Cache error - fall through to DB
      }
    }

    if (!user) {
      user = await User.findById(decoded.id)
        .select('-passwordHash -verificationCode -verificationCodeValidation -refreshTokens -authLogs')
        .lean();

      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Cache for 5 minutes (auth context doesn't need long TTL)
      if (redis.isReady()) {
        redis.set(cacheKey, user, 300).catch(() => { });
      }
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
};

// Export with both names for compatibility
export const authenticateToken = authMiddleware;
export const protect = authMiddleware;

export default authMiddleware;
