import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
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
router.put("/:notificationId/read", markAsRead);
router.put("/read-all", markAllAsRead);

export default router;
