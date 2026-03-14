import express from "express";
import {
    getAllUsers,
    getUserDetail,
    getAdminStats,
    updateUserRole,
    deleteUser,
    getRecentActivity,
    toggleUserStatus,
    getAllChats,
    getChatDetails,
    getChatStatistics,
    getSiteSettings,
    updateSiteSettings,
    getEarnedCommission,
    getAdminListings,
    getAdminListingStats,
    deleteAdminListing,
    updateAdminListingStatus,
    getAdminGames,
    getAdminGameStats,
    createAdminGame,
    updateAdminGame,
    deleteAdminGame,
    toggleAdminGameStatus,
    adminInstantRelease,
    toggleCommissionExempt,
    getExemptSellers,
    getModerators,
    createModerator,
    setModeratorPermissions,
    removeModerator,
    getMyPermissions,
    changePassword
} from "./admin.controller.js";
import { requireAdmin, requireAdminOrMod, requirePermission } from "../../middlewares/roleMiddleware.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { adminLimiter } from "../../middlewares/rateLimiter.js";
import { validateObjectId } from "../../middlewares/validateObjectId.js";
import cacheRoutes from "./cache.routes.js";
import sellerLevelRoutes from "../seller-levels/sellerLevel.routes.js";
import securityRoutes from "./security.routes.js";

const router = express.Router();

// Apply authentication and rate limiting to all admin routes
router.use(authMiddleware);
router.use(requireAdminOrMod);   // admin OR moderator can enter
router.use(adminLimiter);

// ── My permissions (for sidebar filtering) ──────────────────────
router.get("/my-permissions", getMyPermissions);

// ── User management (admin-only – never delegated to moderators) ────
router.get("/users", requireAdmin, getAllUsers);
// SECURITY FIX [M-01]: Validate all ObjectId params before controller logic.
router.get("/users/:userId/detail", requireAdmin, validateObjectId("userId"), getUserDetail);
router.put("/users/:userId/role", requireAdmin, validateObjectId("userId"), updateUserRole);
router.delete("/users/:userId", requireAdmin, validateObjectId("userId"), deleteUser);
router.put("/users/:userId/toggle-status", requireAdmin, validateObjectId("userId"), toggleUserStatus);

// ── Statistics and analytics ────────────────────────────────────
router.get("/stats", requirePermission("analytics"), getAdminStats);
router.get("/activity", requirePermission("analytics"), getRecentActivity);

// ── Chat monitoring ─────────────────────────────────────────────
router.get("/chats/statistics", requirePermission("chats"), getChatStatistics);
router.get("/chats/:chatId", requirePermission("chats"), validateObjectId("chatId"), getChatDetails);
router.get("/chats", requirePermission("chats"), getAllChats);

// ── Seller levels management ────────────────────────────────────
router.use("/seller-levels", requirePermission("seller_levels"), sellerLevelRoutes);

// ── Cache management ────────────────────────────────────────────
router.use("/cache", requireAdmin, cacheRoutes);

// ── Security management ─────────────────────────────────────────
router.use("/security", requirePermission("security"), securityRoutes);

// ── Site settings ───────────────────────────────────────────────
router.get("/settings", requirePermission("settings"), getSiteSettings);
router.put("/settings", requirePermission("settings"), updateSiteSettings);

// ── Change password (own account) ───────────────────────────────
router.put("/change-password", changePassword);

// ── Commission & earnings ───────────────────────────────────────
router.get("/commission", requirePermission("analytics"), getEarnedCommission);

// ── Instant payout release ──────────────────────────────────────
router.post("/transactions/:id/instant-release", requirePermission("orders"), validateObjectId("id"), adminInstantRelease);

// ── Commission exemption ────────────────────────────────────────
router.get("/exempt-sellers", requirePermission("sellers"), getExemptSellers);
router.put("/users/:userId/commission-exempt", requirePermission("sellers"), validateObjectId("userId"), toggleCommissionExempt);

// ── Listings management ─────────────────────────────────────────
router.get("/listings/stats", requirePermission("products"), getAdminListingStats);
router.get("/listings", requirePermission("products"), getAdminListings);
router.delete("/listings/:id", requirePermission("products"), validateObjectId("id"), deleteAdminListing);
router.put("/listings/:id/status", requirePermission("products"), validateObjectId("id"), updateAdminListingStatus);

// ── Games management ────────────────────────────────────────────
router.get("/games/stats", requirePermission("games"), getAdminGameStats);
router.get("/games", requirePermission("games"), getAdminGames);
router.post("/games", requirePermission("games"), createAdminGame);
router.put("/games/:id", requirePermission("games"), validateObjectId("id"), updateAdminGame);
router.delete("/games/:id", requirePermission("games"), validateObjectId("id"), deleteAdminGame);
router.put("/games/:id/toggle-status", requirePermission("games"), validateObjectId("id"), toggleAdminGameStatus);

// ── Moderator management (admin-only) ──────────────────────────
router.get("/moderators", requireAdmin, getModerators);
router.post("/moderators", requireAdmin, createModerator);
router.put("/moderators/:userId/permissions", requireAdmin, validateObjectId("userId"), setModeratorPermissions);
router.delete("/moderators/:userId", requireAdmin, validateObjectId("userId"), removeModerator);

export default router;