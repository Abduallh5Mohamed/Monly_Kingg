import jwt from "jsonwebtoken";
import User from "../modules/users/user.model.js";

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
      return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User not found for this token" });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

// Export with both names for compatibility
export const authenticateToken = authMiddleware;
