import express from "express";
import {
    getUserChats,
    getChatMessages,
    sendMessage,
    createChat,
    createSupportChat,
    deleteChat,
    getOnlineUsers
} from "./chat.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";

const router = express.Router();

// All chat routes require authentication
router.use(authMiddleware);

// Get all user chats
router.get("/", getUserChats);

// Get online users
router.get("/online", getOnlineUsers);

// Create or get chat with user
router.post("/", createChat);

// Create support chat
router.post("/support", createSupportChat);

// Send message to chat (MUST be before /:chatId route)
router.post("/:chatId/messages", sendMessage);

// Get chat messages
router.get("/:chatId", getChatMessages);

// Delete chat
router.delete("/:chatId", deleteChat);

export default router;
