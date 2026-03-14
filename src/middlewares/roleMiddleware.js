// src/middlewares/roleMiddleware.js

/** Permission keys that can be assigned to moderators.
 *  "users" and "moderators" are intentionally excluded – those sections
 *  are admin-only and must never be delegated to moderators.
 */
export const PERMISSION_KEYS = [
  "orders", "products", "sellers", "seller_levels",
  "games", "chats", "analytics", "settings", "security",
  "notifications", "promotions", "ads", "discounts"
];

export const roleMiddleware = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role)
      return res.status(403).json({ message: "Forbidden" });
    next();
  };
};

// Admin-only middleware (strict)
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// Allow both admin and moderator into the admin panel
export const requireAdminOrMod = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
    return res.status(403).json({ message: "Admin or Moderator access required" });
  }
  next();
};

/** Admin-only sections that must never be delegated to moderators */
const ADMIN_ONLY_SECTIONS = ["users", "moderators"];

/**
 * Require a specific permission key.
 * Admins pass automatically; moderators must have the key in moderatorPermissions.
 * Admin-only sections ("users", "moderators") are blocked even if stored in DB.
 */
export const requirePermission = (permissionKey) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    // Admins have full access
    if (req.user.role === 'admin') return next();

    // Moderators need the specific permission AND it must NOT be admin-only
    if (req.user.role === 'moderator') {
      if (ADMIN_ONLY_SECTIONS.includes(permissionKey)) {
        return res.status(403).json({ message: "This section is restricted to admins only" });
      }
      const perms = req.user.moderatorPermissions || [];
      if (perms.includes(permissionKey)) return next();
    }

    return res.status(403).json({ message: "You don't have permission to access this section" });
  };
};
