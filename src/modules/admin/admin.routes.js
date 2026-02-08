import express from "express";
import {
    getAllUsers,
    getAdminStats,
    updateUserRole,
    deleteUser,
    getRecentActivity,
    toggleUserStatus,
    getAllChats,
    getChatDetails,
    getChatStatistics
} from "./admin.controller.js";
import { requireAdmin } from "../../middlewares/roleMiddleware.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import cacheRoutes from "./cache.routes.js";

const router = express.Router();

// Apply authentication to all admin routes
router.use(authMiddleware);
router.use(requireAdmin);

// User management routes
router.get("/users", getAllUsers);
router.put("/users/:userId/role", updateUserRole);
router.delete("/users/:userId", deleteUser);
router.put("/users/:userId/toggle-status", toggleUserStatus);

// Statistics and analytics routes
router.get("/stats", getAdminStats);
router.get("/activity", getRecentActivity);

// Chat monitoring routes (IMPORTANT: specific routes before dynamic params)
router.get("/chats/statistics", getChatStatistics);
router.get("/chats/:chatId", getChatDetails);
router.get("/chats", getAllChats);

// Cache management routes
router.use("/cache", cacheRoutes);

export default router;