import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { userWriteLimiter } from "../../middlewares/rateLimiter.js";
import {
    getMyNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
} from "./notification.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getMyNotifications);
router.get("/unread-count", getUnreadCount);
router.put("/:notificationId/read", userWriteLimiter, markAsRead);
router.put("/read-all", userWriteLimiter, markAllAsRead);

export default router;
