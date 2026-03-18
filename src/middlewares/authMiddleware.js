import jwt from "jsonwebtoken";
import crypto from "crypto";
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

    // Deny explicitly blacklisted tokens (logout/password change hardening).
    if (redis.isReady()) {
      try {
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const isBlacklisted = await redis.get(`bl:token:${tokenHash}`);
        if (isBlacklisted) {
          return res.status(401).json({ message: "Unauthorized" });
        }
      } catch (_) {
        // Redis unavailable: continue with JWT verification.
      }
    }

    let decoded;
    try {
      // SECURITY FIX [VULN-007]: Restrict to HS256 to prevent alg:none bypass.
      decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    } catch (err) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Try Redis cache first (avoid DB hit on every request)
    const cacheKey = `auth:user:${decoded.id}`;
    let user = null;
    let fromCache = false;

    if (redis.isReady()) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          user = cached;
          fromCache = true;
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

    // SECURITY FIX [VULN-13]: Prevent lockout bypass via stale cache by re-checking lockUntil from DB when cache is used.
    if (fromCache) {
      const lockInfo = await User.findById(decoded.id).select("lockUntil").lean();
      if (lockInfo?.lockUntil && new Date(lockInfo.lockUntil) > new Date()) {
        if (redis.isReady()) {
          redis.del(cacheKey).catch(() => { });
        }
        return res.status(423).json({ message: "Account is temporarily locked. Please try again later." });
      }
    }

    // SECURITY FIX [VULN-13]: Enforce lockout guard before granting API access.
    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      return res.status(423).json({ message: "Account is temporarily locked. Please try again later." });
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
