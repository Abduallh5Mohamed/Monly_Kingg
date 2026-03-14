import Chat from "./chat.model.js";
import User from "../users/user.model.js";
import mongoose from "mongoose";
import logger from "../../utils/logger.js";
import socketService from "../../services/socketService.js";

const UPLOAD_URL_PATTERN = /^\/uploads\/[a-zA-Z0-9/_\-.]+$/;
const ALLOWED_MESSAGE_TYPES = new Set(['text', 'image', 'video', 'audio', 'file']);

const isValidUploadUrl = (value) => typeof value === "string" && UPLOAD_URL_PATTERN.test(value.trim());

/* ---------------- Send Message (HTTP fallback — socket is preferred) ---------------- */
export const sendMessage = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user._id;
        const { content, fileUrl } = req.body;
        // SECURITY FIX: [LOW-03] Strict whitelist for message type values.
        const type = ALLOWED_MESSAGE_TYPES.has(req.body.type) ? req.body.type : 'text';
        const attachmentTypes = new Set(['image', 'video', 'audio', 'file']);

        if (!content) {
            return res.status(400).json({ success: false, message: "Message content is required" });
        }

        let normalizedContent = content;
        let normalizedFileUrl = fileUrl;

        if (attachmentTypes.has(type)) {
            const attachmentUrl = typeof fileUrl === 'string' && fileUrl.trim() ? fileUrl.trim() : String(content).trim();
            if (!isValidUploadUrl(attachmentUrl)) {
                return res.status(400).json({ success: false, message: "Invalid file URL" });
            }

            normalizedContent = attachmentUrl;
            normalizedFileUrl = attachmentUrl;
        }

        // Limit message length to prevent abuse
        if (String(normalizedContent).length > 5000) {
            return res.status(400).json({ success: false, message: "Message too long (max 5000 characters)" });
        }

        const now = new Date();
        const msgId = new mongoose.Types.ObjectId();

        // Atomic push — no full-document load
        const chat = await Chat.findOneAndUpdate(
            { _id: chatId, participants: userId },
            {
                $push: {
                    messages: { _id: msgId, sender: userId, content: normalizedContent, type, fileUrl: normalizedFileUrl, timestamp: now, read: false, delivered: true }
                },
                $set: {
                    lastMessage: { content: normalizedContent, sender: userId, timestamp: now, messageType: type }
                }
            },
            { new: false, projection: { participants: 1 } }
        ).lean();

        if (!chat) {
            return res.status(404).json({ success: false, message: "Chat not found" });
        }

        // Increment unread for other participants (separate op — avoids conflicts with $push)
        const otherParticipants = chat.participants.filter(p => p.toString() !== userId.toString());
        if (otherParticipants.length) {
            const incObj = {};
            for (const pid of otherParticipants) incObj[`unreadCount.${pid}`] = 1;
            Chat.updateOne({ _id: chatId }, { $inc: incObj }).catch(() => { });
        }

        // Build response with sender info from req.user (already authenticated)
        const savedMessage = {
            _id: msgId.toString(),
            sender: {
                _id: userId.toString(),
                username: req.user.username,
                email: req.user.email,
                avatar: req.user.avatar
            },
            content: normalizedContent,
            type,
            fileUrl: normalizedFileUrl,
            timestamp: now,
            read: false,
            delivered: true
        };

        // Broadcast via Socket.IO
        if (socketService.io) {
            for (const pid of otherParticipants) {
                socketService.io.to(`user:${pid}`).emit('new_message', { chatId, message: savedMessage });
            }
        }

        res.json({ success: true, data: { message: savedMessage } });
    } catch (error) {
        logger.error(`Send message error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to send message" });
    }
};

/* ---------------- Get User Chats ---------------- */
export const getUserChats = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 20 } = req.query;

        const chats = await Chat.find({
            participants: userId,
            isActive: true,
            hiddenFor: { $ne: userId } // Exclude chats hidden by this user
        })
            .populate('participants', 'username email avatar role')
            .populate('lastMessage.sender', 'username avatar')
            .sort({ 'lastMessage.timestamp': -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .select('-messages') // Don't load messages
            .lean();

        // Add unread count for this user
        const chatsWithUnread = chats.map(chat => ({
            ...chat,
            unreadCount: chat.unreadCount?.[userId.toString()] || 0
        }));

        const total = await Chat.countDocuments({
            participants: userId,
            isActive: true,
            hiddenFor: { $ne: userId }
        });

        res.json({
            success: true,
            data: {
                chats: chatsWithUnread,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        logger.error(`Get user chats error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Failed to fetch chats"
        });
    }
};

/* ---------------- Get Chat Messages (paginated, no N+1 populate) ---------------- */
export const getChatMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user._id;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const skip = (page - 1) * limit;

        // Use aggregation to paginate messages server-side instead of loading the entire array
        const result = await Chat.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(chatId), participants: new mongoose.Types.ObjectId(userId) } },
            {
                $project: {
                    participants: 1,
                    type: 1,
                    lastMessage: 1,
                    deletedMessagesFor: 1,
                    totalMessages: { $size: { $ifNull: ['$messages', []] } },
                    messages: { $slice: ['$messages', skip, limit] },
                }
            }
        ]);

        if (!result.length) {
            return res.status(404).json({ success: false, message: "Chat not found" });
        }

        const chat = result[0];

        // Populate participants
        const participantDocs = await User.find(
            { _id: { $in: chat.participants } },
            'username email avatar role'
        ).lean();

        const participantMap = {};
        for (const p of participantDocs) {
            participantMap[p._id.toString()] = { _id: p._id, username: p.username, email: p.email, avatar: p.avatar };
        }

        const userIdStr = userId.toString();

        // Filter out soft-deleted messages
        const deletedMsgIds = chat.deletedMessagesFor?.[userIdStr] || [];
        const deletedSet = new Set(deletedMsgIds.map(id => id.toString()));

        const pageMessages = (chat.messages || [])
            .filter(msg => !deletedSet.has(msg._id.toString()))
            .map(msg => ({
                ...msg,
                sender: participantMap[msg.sender.toString()] || { _id: msg.sender }
            }));

        const totalMessages = chat.totalMessages || 0;

        res.json({
            success: true,
            data: {
                chat: { _id: chat._id, type: chat.type, participants: participantDocs, lastMessage: chat.lastMessage },
                messages: pageMessages,
                pagination: { page, limit, total: totalMessages, pages: Math.ceil(totalMessages / limit) }
            }
        });
    } catch (error) {
        logger.error(`Get chat messages error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to fetch messages" });
    }
};

/* ---------------- Create or Get Chat ---------------- */
export const createChat = async (req, res) => {
    try {
        const userId = req.user._id;
        const { participantId, recipientId, type = 'direct' } = req.body;

        // Support both participantId and recipientId
        const otherUserId = participantId || recipientId;

        if (!otherUserId) {
            return res.status(400).json({
                success: false,
                message: "Participant ID or Recipient ID is required"
            });
        }

        // Validate participant exists
        const participant = await User.findById(otherUserId);
        if (!participant) {
            return res.status(404).json({
                success: false,
                message: "Participant not found"
            });
        }

        // Check if chat exists
        let chat = await Chat.findOne({
            type,
            participants: { $all: [userId, otherUserId], $size: 2 }
        })
            .populate('participants', 'username email avatar role')
            .populate('lastMessage.sender', 'username avatar');

        if (!chat) {
            // Create new chat
            chat = new Chat({
                type,
                participants: [userId, otherUserId],
                messages: [],
                isActive: true
            });

            // Save to trigger pre-save hook for chatNumber generation
            await chat.save();

            await chat.populate('participants', 'username email avatar role');

            logger.info(`New chat created: ${chat._id}`);

            // Notify via socket
            socketService.sendToUser(otherUserId.toString(), 'new_chat', { chat });
        }

        res.json({
            success: true,
            data: chat
        });
    } catch (error) {
        logger.error(`Create chat error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Failed to create chat",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/* ---------------- Create Support Chat ---------------- */
export const createSupportChat = async (req, res) => {
    try {
        const userId = req.user._id;

        // Check if support chat exists
        let chat = await Chat.findOne({
            type: 'support',
            participants: userId
        })
            .populate('participants', 'username email avatar role');

        if (!chat) {
            // Create support chat
            chat = await Chat.create({
                type: 'support',
                participants: [userId],
                messages: [{
                    sender: userId,
                    content: 'Hello! How can I help you today?',
                    type: 'text',
                    timestamp: new Date(),
                    read: false,
                    delivered: true
                }],
                lastMessage: {
                    content: 'Hello! How can I help you today?',
                    sender: userId,
                    timestamp: new Date(),
                    type: 'text'
                },
                isActive: true
            });

            await chat.populate('participants', 'username email avatar role');
        }

        res.json({
            success: true,
            data: chat
        });
    } catch (error) {
        logger.error(`Create support chat error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Failed to create support chat"
        });
    }
};

/* ---------------- Delete Chat (Soft Delete — atomic) ---------------- */
export const deleteChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user._id;

        const result = await Chat.updateOne(
            { _id: chatId, participants: userId },
            { $addToSet: { hiddenFor: userId } }
        );

        if (!result.matchedCount) {
            return res.status(404).json({ success: false, message: "Chat not found" });
        }

        res.json({ success: true, message: "Chat deleted successfully" });
    } catch (error) {
        logger.error(`Delete chat error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to delete chat" });
    }
};

/* ---------------- Delete Message (Soft Delete — atomic) ---------------- */
export const deleteMessage = async (req, res) => {
    try {
        const { chatId, messageId } = req.params;
        const userId = req.user._id;
        const userIdStr = userId.toString();

        const result = await Chat.updateOne(
            { _id: chatId, participants: userId, 'messages._id': messageId },
            { $addToSet: { [`deletedMessagesFor.${userIdStr}`]: messageId } }
        );

        if (!result.matchedCount) {
            return res.status(404).json({ success: false, message: "Chat or message not found" });
        }

        res.json({ success: true, message: "Message deleted successfully" });
    } catch (error) {
        logger.error(`Delete message error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to delete message" });
    }
};

/* ---------------- Get Online Users ---------------- */
export const getOnlineUsers = async (req, res) => {
    try {
        const onlineUserIds = await socketService.getOnlineUsers();

        res.json({
            success: true,
            data: {
                onlineUsers: onlineUserIds,
                count: onlineUserIds.length
            }
        });
    } catch (error) {
        logger.error(`Get online users error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Failed to fetch online users"
        });
    }
};
