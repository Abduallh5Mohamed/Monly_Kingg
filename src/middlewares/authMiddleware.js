import jwt from "jsonwebtoken";
import User from "../modules/users/user.model.js";

export const authMiddleware = async (req, res, next) => {
  try {
    let token = null;

    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1].trim();
      console.log('🔑 Token from Authorization header');
    }

    // Check cookies if no header token
    const cookieName = process.env.ACCESS_TOKEN_COOKIE_NAME || "access_token";
    if (!token && req.cookies && req.cookies[cookieName]) {
      token = req.cookies[cookieName];
      if (typeof token === "string") token = token.trim().replace(/^"|"$/g, "");
      console.log('🍪 Token from cookie:', cookieName);
    }

    if (!token) {
      console.log('❌ No token found in request to:', req.path);
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token verified for user:', decoded.id);
    } catch (err) {
      console.log('❌ Invalid token:', err.message);
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      console.log('❌ User not found:', decoded.id);
      return res.status(401).json({ message: "User not found for this token" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('❌ Auth middleware error:', err);
    next(err);
  }
};

// Export with both names for compatibility
export const authenticateToken = authMiddleware;
