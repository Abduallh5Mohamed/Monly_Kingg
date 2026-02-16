import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import DOMPurify from 'isomorphic-dompurify';
import Chat from '../modules/chats/chat.model.js';
import User from '../modules/users/user.model.js';
import logger from '../utils/logger.js';
import redis from '../config/redis.js';

// Message length limits
const MAX_MESSAGE_LENGTH = 5000;

// Simple rate limiter for socket events
const socketRateLimits = new Map(); // key: `${userId}:${event}` -> { count, resetAt }
function checkSocketRateLimit(userId, event, maxPerMinute = 30) {
    const key = `${userId}:${event}`;
    const now = Date.now();
    const entry = socketRateLimits.get(key);
    if (!entry || entry.resetAt < now) {
        socketRateLimits.set(key, { count: 1, resetAt: now + 60000 });
        return true;
    }
    entry.count++;
    if (entry.count > maxPerMinute) return false;
    return true;
}
// Cleanup stale entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of socketRateLimits) {
        if (val.resetAt < now) socketRateLimits.delete(key);
    }
}, 5 * 60 * 1000);

class SocketService {
    constructor() {
        this.io = null;
        this.userSockets = new Map(); // userId -> socketId
        this.redisAdapter = null;
    }

    async initialize(httpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: process.env.NODE_ENV === 'production'
                    ? process.env.ALLOWED_ORIGINS?.split(',')
                    : ['http://localhost:3000', 'http://localhost:5000'],
                credentials: true
            },
            pingTimeout: 60000,
            pingInterval: 25000,
            transports: ['websocket', 'polling'],
            // Performance optimizations
            maxHttpBufferSize: 1e6, // 1MB
            connectTimeout: 10000,
            perMessageDeflate: {
                threshold: 1024 // Only compress messages > 1KB
            }
        });

        // Setup Redis Adapter for horizontal scaling (temporarily disabled)
        // try {
        //     const redisConfig = {
        //         url: process.env.REDIS_URL || 'redis://localhost:6379'
        //     };

        //     // Only add password if provided
        //     if (process.env.REDIS_PASSWORD) {
        //         redisConfig.password = process.env.REDIS_PASSWORD;
        //     }

        //     const pubClient = createClient(redisConfig);
        //     const subClient = pubClient.duplicate();

        //     await Promise.all([
        //         pubClient.connect(),
        //         subClient.connect()
        //     ]);

        //     this.io.adapter(createAdapter(pubClient, subClient));
        //     this.redisAdapter = { pubClient, subClient };
        //     logger.info('✅ Socket.IO Redis Adapter initialized');
        // } catch (error) {
        //     logger.warn(`⚠️  Socket.IO Redis Adapter failed: ${error.message}. Running in standalone mode.`);
        // }

        // Authentication middleware — supports httpOnly cookies, auth token, and header
        this.io.use(async (socket, next) => {
            try {
                // 1. Try auth.token passed by client
                let token = socket.handshake.auth?.token;

                // 2. Try Authorization header
                if (!token) {
                    token = socket.handshake.headers.authorization?.split(' ')[1];
                }

                // 3. Parse httpOnly cookies from the handshake (primary method)
                if (!token && socket.handshake.headers.cookie) {
                    const cookies = socket.handshake.headers.cookie
                        .split(';')
                        .reduce((acc, c) => {
                            const [key, ...v] = c.trim().split('=');
                            acc[key] = v.join('=');
                            return acc;
                        }, {});
                    token = cookies['access_token'];
                }

                if (!token) {
                    return next(new Error('Authentication required'));
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id).select('-passwordHash');

                if (!user) {
                    return next(new Error('User not found'));
                }

                socket.userId = user._id.toString();
                socket.user = user;
                next();
            } catch (error) {
                logger.error(`Socket auth error: ${error.message}`);
                next(new Error('Invalid token'));
            }
        });

        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });

        logger.info('✅ Socket.IO initialized');
        return this.io;
    }

    handleConnection(socket) {
        const userId = socket.userId;
        logger.info(`🔌 User connected: ${userId} (${socket.user.email})`);

        // Store socket
        this.userSockets.set(userId, socket.id);
        this.setUserOnline(userId, socket.id);

        // Join personal room
        socket.join(`user:${userId}`);

        // If user is admin, join admin room for real-time notifications
        if (socket.user.role === 'admin') {
            socket.join('admin');
            logger.info(`👑 Admin ${userId} joined admin room`);
        }

        // Send user's chats
        this.sendUserChats(socket);

        // Event handlers
        socket.on('join_chat', (chatId) => this.handleJoinChat(socket, chatId));
        socket.on('leave_chat', (chatId) => this.handleLeaveChat(socket, chatId));
        socket.on('send_message', (data) => this.handleSendMessage(socket, data));
        socket.on('typing', (data) => this.handleTyping(socket, data));
        socket.on('stop_typing', (data) => this.handleStopTyping(socket, data));
        socket.on('mark_read', (data) => this.handleMarkRead(socket, data));
        socket.on('message_delivered', (data) => this.handleMessageDelivered(socket, data));
        socket.on('get_online_users', () => this.handleGetOnlineUsers(socket));
        socket.on('disconnect', () => this.handleDisconnect(socket));
    }

    async handleJoinChat(socket, chatId) {
        try {
            const chat = await Chat.findOne({
                _id: chatId,
                participants: socket.userId
            });

            if (!chat) {
                return socket.emit('error', { message: 'Chat not found' });
            }

            socket.join(`chat:${chatId}`);
            logger.info(`User ${socket.userId} joined chat ${chatId}`);

            socket.to(`chat:${chatId}`).emit('user_joined', {
                userId: socket.userId,
                username: socket.user.username
            });
        } catch (error) {
            logger.error(`Join chat error: ${error.message}`);
            socket.emit('error', { message: 'Failed to join chat' });
        }
    }

    handleLeaveChat(socket, chatId) {
        socket.leave(`chat:${chatId}`);
        socket.to(`chat:${chatId}`).emit('user_left', { userId: socket.userId });
    }

    async handleSendMessage(socket, data) {
        try {
            const { chatId, content, type = 'text', fileUrl } = data;

            if (!chatId || !content) {
                return socket.emit('error', { message: 'Invalid message data' });
            }

            // ✅ SECURITY: Rate limit messages (max 20/min)
            if (!checkSocketRateLimit(socket.userId, 'send_message', 20)) {
                return socket.emit('error', { message: 'You are sending messages too fast. Please slow down.' });
            }

            // ✅ SECURITY: Enforce message length limit
            if (typeof content !== 'string' || content.length > MAX_MESSAGE_LENGTH) {
                return socket.emit('error', { message: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` });
            }

            // ✅ SECURITY: Sanitize message content to prevent stored XSS
            const sanitizedContent = DOMPurify.sanitize(content, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
            if (!sanitizedContent) {
                return socket.emit('error', { message: 'Message content is empty after sanitization' });
            }

            const chat = await Chat.findOne({
                _id: chatId,
                participants: socket.userId
            });

            if (!chat) {
                return socket.emit('error', { message: 'Chat not found' });
            }

            // Create message
            const message = {
                sender: socket.userId,
                content: sanitizedContent,
                type,
                fileUrl: fileUrl ? DOMPurify.sanitize(fileUrl, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }) : undefined,
                timestamp: new Date(),
                read: false,
                delivered: true
            };

            // Add to chat
            await chat.addMessage(message);
            await chat.populate('messages.sender', 'username email avatar');

            const savedMessage = chat.messages[chat.messages.length - 1];

            // Convert to plain object with _id
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

            // Broadcast to chat
            this.io.to(`chat:${chatId}`).emit('new_message', {
                chatId,
                message: messageToSend
            });

            // Confirm to sender
            socket.emit('message_sent', {
                chatId,
                message: messageToSend
            });

            // Cache for offline users
            const onlineUsers = await this.getOnlineUsers();
            for (const participantId of chat.participants) {
                const pId = participantId.toString();
                if (pId !== socket.userId && !onlineUsers.includes(pId)) {
                    await this.cacheOfflineMessage(pId, { chatId, message: savedMessage });
                }
            }

            logger.info(`Message sent in chat ${chatId} by ${socket.userId}`);
        } catch (error) {
            logger.error(`Send message error: ${error.message}`);
            socket.emit('error', { message: 'Failed to send message' });
        }
    }

    handleTyping(socket, data) {
        const { chatId } = data;
        socket.to(`chat:${chatId}`).emit('user_typing', {
            userId: socket.userId,
            username: socket.user.username
        });
    }

    handleStopTyping(socket, data) {
        const { chatId } = data;
        socket.to(`chat:${chatId}`).emit('user_stop_typing', {
            userId: socket.userId
        });
    }

    async handleMarkRead(socket, data) {
        try {
            const { chatId } = data;
            const chat = await Chat.findOne({
                _id: chatId,
                participants: socket.userId
            });

            if (!chat) return;

            await chat.markAsRead(socket.userId);

            socket.to(`chat:${chatId}`).emit('messages_read', {
                chatId,
                readBy: socket.userId
            });
        } catch (error) {
            logger.error(`Mark read error: ${error.message}`);
        }
    }

    handleMessageDelivered(socket, data) {
        try {
            const { chatId, messageId } = data;

            // Notify sender that message was delivered
            socket.to(`chat:${chatId}`).emit('message_delivered', {
                chatId,
                messageId
            });

            logger.info(`Message ${messageId} delivered in chat ${chatId}`);
        } catch (error) {
            logger.error(`Message delivered error: ${error.message}`);
        }
    }

    async handleGetOnlineUsers(socket) {
        try {
            const onlineUsers = await this.getOnlineUsers();
            socket.emit('online_users', onlineUsers);
        } catch (error) {
            logger.error(`Get online users error: ${error.message}`);
        }
    }

    handleDisconnect(socket) {
        const userId = socket.userId;
        logger.info(`🔌 User disconnected: ${userId}`);
        this.userSockets.delete(userId);
        this.setUserOffline(userId);
        socket.broadcast.emit('user_offline', { userId });
    }

    async sendUserChats(socket) {
        try {
            const chats = await Chat.find({
                participants: socket.userId,
                isActive: true
            })
                .populate('participants', 'username email avatar role')
                .populate('lastMessage.sender', 'username')
                .sort({ 'lastMessage.timestamp': -1 })
                .limit(50)
                .select('-messages')
                .lean();

            logger.info(`📬 Sending ${chats.length} chats to user ${socket.userId}`);

            // Log first chat participants for debugging
            if (chats.length > 0) {
                logger.info(`👥 First chat participants: ${chats[0].participants.map(p => `${p.username} (${p._id})`).join(', ')}`);
            }

            socket.emit('user_chats', chats);
        } catch (error) {
            logger.error(`Send user chats error: ${error.message}`);
        }
    }

    // Redis presence
    async setUserOnline(userId, socketId) {
        try {
            const client = redis.getClient();
            if (client) {
                await client.hSet('online_users', userId, socketId);
                await client.expire('online_users', 3600);
            }
        } catch (error) {
            logger.error(`Set user online error: ${error.message}`);
        }
    }

    async setUserOffline(userId) {
        try {
            const client = redis.getClient();
            if (client) {
                await client.hDel('online_users', userId);
            }
        } catch (error) {
            logger.error(`Set user offline error: ${error.message}`);
        }
    }

    async getOnlineUsers() {
        try {
            const client = redis.getClient();
            if (client) {
                const onlineUsers = await client.hGetAll('online_users');
                return Object.keys(onlineUsers);
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    async cacheOfflineMessage(userId, messageData) {
        try {
            const client = redis.getClient();
            if (client) {
                await client.lPush(`offline_messages:${userId}`, JSON.stringify(messageData));
                await client.expire(`offline_messages:${userId}`, 86400);
            }
        } catch (error) {
            logger.error(`Cache offline message error: ${error.message}`);
        }
    }

    // Utilities
    sendToUser(userId, event, data) {
        const socketId = this.userSockets.get(userId);
        if (socketId) {
            this.io.to(socketId).emit(event, data);
        }
    }

    sendToChat(chatId, event, data) {
        this.io.to(`chat:${chatId}`).emit(event, data);
    }

    // Admin notifications for deposits/withdrawals
    notifyAdminsNewDeposit(deposit) {
        logger.info(`📢 Notifying admins of new deposit: ${deposit._id}`);
        this.io.to('admin').emit('new_deposit', deposit);
    }

    notifyAdminsNewWithdrawal(withdrawal) {
        logger.info(`📢 Notifying admins of new withdrawal: ${withdrawal._id}`);
        this.io.to('admin').emit('new_withdrawal', withdrawal);
    }

    notifyAdminsDepositUpdate(deposit) {
        logger.info(`📢 Notifying admins of deposit update: ${deposit._id}`);
        this.io.to('admin').emit('deposit_updated', deposit);
    }

    notifyAdminsWithdrawalUpdate(withdrawal) {
        logger.info(`📢 Notifying admins of withdrawal update: ${withdrawal._id}`);
        this.io.to('admin').emit('withdrawal_updated', withdrawal);
    }

    // Notify user about their deposit/withdrawal status
    notifyUserDepositStatus(userId, deposit) {
        logger.info(`📢 Notifying user ${userId} of deposit status: ${deposit.status}`);
        this.sendToUser(userId, 'deposit_status_updated', deposit);
    }

    notifyUserWithdrawalStatus(userId, withdrawal) {
        logger.info(`📢 Notifying user ${userId} of withdrawal status: ${withdrawal.status}`);
        this.sendToUser(userId, 'withdrawal_status_updated', withdrawal);
    }
}

export default new SocketService();
