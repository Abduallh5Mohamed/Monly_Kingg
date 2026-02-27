import express from "express";
import {
    getUserChats,
    getChatMessages,
    sendMessage,
    createChat,
    createSupportChat,
    deleteChat,
    deleteMessage,
    getOnlineUsers
} from "./chat.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { chatMessageLimiter, userWriteLimiter } from "../../middlewares/rateLimiter.js";

const router = express.Router();

// All chat routes require authentication
router.use(authMiddleware);

// Get all user chats
router.get("/", getUserChats);

// Get online users
router.get("/online", getOnlineUsers);

// Create or get chat with user
router.post("/", userWriteLimiter, createChat);

// Create support / user chats
router.post("/support", userWriteLimiter, createSupportChat);

// Send message to chat (MUST be before /:chatId route)
router.post("/:chatId/messages", chatMessageLimiter, sendMessage);

// Delete message from chat (soft delete — admin can still see)
router.delete("/:chatId/messages/:messageId", userWriteLimiter, deleteMessage);

// Get chat messages
router.get("/:chatId", getChatMessages);

// Delete chat (soft delete — admin can still see)
router.delete("/:chatId", userWriteLimiter, deleteChat);

export default router;
