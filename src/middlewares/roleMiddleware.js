// src/middlewares/roleMiddleware.js
export const roleMiddleware = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role)
      return res.status(403).json({ message: "Forbidden" });
    next();
  };
};

// Admin middleware - specific middleware for admin access
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
};
