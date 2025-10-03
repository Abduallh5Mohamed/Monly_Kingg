import Chat from "./chat.model.js";
import User from "../users/user.model.js";
import logger from "../../utils/logger.js";
import socketService from "../../services/socketService.js";

/* ---------------- Send Message ---------------- */
export const sendMessage = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user._id;
        const { content, type = 'text', fileUrl } = req.body;

        if (!content) {
            return res.status(400).json({
                success: false,
                message: "Message content is required"
            });
        }

        const chat = await Chat.findOne({
            _id: chatId,
            participants: userId
        });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found"
            });
        }

        // Create message
        const message = {
            sender: userId,
            content,
            type,
            fileUrl,
            timestamp: new Date(),
            read: false,
            delivered: true
        };

        // Add message and save
        await chat.addMessage(message);

        // Reload chat with populated fields
        const updatedChat = await Chat.findById(chatId)
            .populate('messages.sender', 'username email avatar')
            .populate('participants', 'username email avatar role');

        const savedMessage = updatedChat.messages[updatedChat.messages.length - 1];

        logger.info(`Message sent in chat ${chatId} by ${req.user.email}`);

        // Broadcast via Socket.IO if available
        if (socketService.io) {
            const messageToSend = {
                _id: savedMessage._id.toString(),
                sender: {
                    _id: savedMessage.sender._id.toString(),
                    username: savedMessage.sender.username,
                    email: savedMessage.sender.email,
                    avatar: savedMessage.sender.avatar
                },
                content: savedMessage.content,
                type: savedMessage.type,
                fileUrl: savedMessage.fileUrl,
                timestamp: savedMessage.timestamp,
                read: savedMessage.read || false,
                delivered: savedMessage.delivered || true
            };

            socketService.io.to(`chat:${chatId}`).emit('new_message', {
                chatId,
                message: messageToSend
            });
        }

        res.json({
            success: true,
            data: {
                message: savedMessage
            }
        });
    } catch (error) {
        logger.error(`Send message error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Failed to send message"
        });
    }
};

/* ---------------- Get User Chats ---------------- */
export const getUserChats = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 20 } = req.query;

        const chats = await Chat.find({
            participants: userId,
            isActive: true
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
            isActive: true
        });

        logger.info(`User ${req.user.email} fetched ${chats.length} chats`);

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

/* ---------------- Get Chat Messages ---------------- */
export const getChatMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user._id;
        const { page = 1, limit = 50 } = req.query;

        const chat = await Chat.findOne({
            _id: chatId,
            participants: userId
        })
            .populate('messages.sender', 'username email avatar')
            .populate('participants', 'username email avatar role')
            .lean();

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found"
            });
        }

        // Paginate messages (oldest first - normal order)
        const allMessages = chat.messages || [];
        const totalMessages = allMessages.length;
        const messages = allMessages
            .slice((page - 1) * limit, page * limit);

        logger.info(`User ${req.user.email} fetched ${messages.length} messages from chat ${chatId}`);

        res.json({
            success: true,
            data: {
                chat: {
                    _id: chat._id,
                    type: chat.type,
                    participants: chat.participants,
                    lastMessage: chat.lastMessage
                },
                messages,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalMessages,
                    pages: Math.ceil(totalMessages / limit)
                }
            }
        });
    } catch (error) {
        logger.error(`Get chat messages error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Failed to fetch messages"
        });
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
            chat = await Chat.create({
                type,
                participants: [userId, otherUserId],
                messages: [],
                isActive: true
            });

            await chat.populate('participants', 'username email avatar role');

            logger.info(`✅ New chat created with participants: ${userId} (creator) and ${otherUserId} (recipient)`);

            // Notify via socket
            socketService.sendToUser(otherUserId.toString(), 'new_chat', { chat });
        } else {
            logger.info(`📝 Existing chat found: ${chat._id}`);
        }

        // Log participants for debugging
        logger.info(`👥 Chat participants: ${chat.participants.map(p => `${p.username} (${p._id})`).join(', ')}`);

        logger.info(`Chat created/retrieved between ${userId} and ${otherUserId}`);

        res.json({
            success: true,
            data: chat
        });
    } catch (error) {
        logger.error(`Create chat error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Failed to create chat"
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
                    content: 'مرحباً! كيف يمكنني مساعدتك اليوم؟',
                    type: 'text',
                    timestamp: new Date(),
                    read: false,
                    delivered: true
                }],
                lastMessage: {
                    content: 'مرحباً! كيف يمكنني مساعدتك اليوم؟',
                    sender: userId,
                    timestamp: new Date(),
                    type: 'text'
                },
                isActive: true
            });

            await chat.populate('participants', 'username email avatar role');
        }

        logger.info(`Support chat created for ${req.user.email}`);

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

/* ---------------- Delete Chat ---------------- */
export const deleteChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user._id;

        const chat = await Chat.findOne({
            _id: chatId,
            participants: userId
        });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found"
            });
        }

        // Soft delete
        chat.isActive = false;
        await chat.save();

        logger.info(`User ${req.user.email} deleted chat ${chatId}`);

        res.json({
            success: true,
            message: "Chat deleted successfully"
        });
    } catch (error) {
        logger.error(`Delete chat error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Failed to delete chat"
        });
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
