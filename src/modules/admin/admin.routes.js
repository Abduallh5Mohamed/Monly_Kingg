import express from "express";
import {
    getAllUsers,
    getAdminStats,
    updateUserRole,
    deleteUser,
    getRecentActivity,
    toggleUserStatus
} from "./admin.controller.js";
import { requireAdmin } from "../../middlewares/roleMiddleware.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

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

export default router;