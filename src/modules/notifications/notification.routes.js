import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requireAdminOrMod } from "../../middlewares/roleMiddleware.js";
import { userWriteLimiter } from "../../middlewares/rateLimiter.js";
import {
    getMyNotifications,
    getUnreadCount,
    getPendingCounts,
    markAsRead,
    markAllAsRead,
} from "./notification.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getMyNotifications);
router.get("/unread-count", getUnreadCount);
router.get("/pending-counts", requireAdminOrMod, getPendingCounts);
router.put("/:notificationId/read", userWriteLimiter, markAsRead);
router.put("/read-all", userWriteLimiter, markAllAsRead);

export default router;
