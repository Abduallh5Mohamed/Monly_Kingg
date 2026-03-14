import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import DOMPurify from 'isomorphic-dompurify';
import Chat from '../modules/chats/chat.model.js';
import User from '../modules/users/user.model.js';
import logger from '../utils/logger.js';
import redis from '../config/redis.js';

// Message length limits
const MAX_MESSAGE_LENGTH = 5000;

// Simple rate limiter for socket events
const socketRateLimits = new Map(); // key: `${userId}:${event}` -> { count, resetAt }
let rateLimitCleanupTimer = null;

function checkSocketRateLimit(userId, event, maxPerMinute = 30) {
    const key = `${userId}:${event}`;
    const now = Date.now();
    const entry = socketRateLimits.get(key);
    if (!entry || entry.resetAt < now) {
        socketRateLimits.set(key, { count: 1, resetAt: now + 60000 });
        return true;
    }
    entry.count++;
    return entry.count <= maxPerMinute;
}
// Cleanup stale entries every 5 minutes (clearable on shutdown)
rateLimitCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, val] of socketRateLimits) {
        if (val.resetAt < now) socketRateLimits.delete(key);
    }
}, 5 * 60 * 1000);

class SocketService {
    constructor() {
        this.io = null;
        this.userSockets = new Map(); // userId -> Set<socketId> (multi-tab support)
        this.redisAdapter = null;
    }

    async initialize(httpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: process.env.NODE_ENV === 'production'
                    ? process.env.ALLOWED_ORIGINS?.split(',')
                    : true,
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
                if (!decoded?.id) return next(new Error('Invalid token'));

                // Enforce token revocation parity with HTTP middleware.
                if (redis.isReady()) {
                    try {
                        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
                        const isBlacklisted = await redis.get(`bl:token:${tokenHash}`);
                        if (isBlacklisted) {
                            return next(new Error('Token revoked. Please login again.'));
                        }
                    } catch (_) {
                        // Redis unavailable — continue with normal auth flow.
                    }
                }

                // Use Redis cache (same as HTTP authMiddleware) to avoid DB hit on every connect
                const cacheKey = `auth:user:${decoded.id}`;
                let user = null;
                if (redis.isReady()) {
                    try { user = await redis.get(cacheKey); } catch { /* fallback to DB */ }
                }
                if (!user) {
                    user = await User.findById(decoded.id).select('-passwordHash -refreshTokens -authLogs').lean();
                    if (!user) return next(new Error('User not found'));
                    if (redis.isReady()) redis.set(cacheKey, user, 300).catch(() => { });
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

        // Store socket (multi-tab: use a Set of socket IDs)
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId).add(socket.id);
        this.setUserOnline(userId, socket.id);

        // Join personal room
        socket.join(`user:${userId}`);

        // If user is admin, join admin room for real-time notifications
        if (socket.user.role === 'admin') {
            socket.join('admin');
        }

        // Send user's chats (lightweight — no messages loaded)
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
            if (!chatId || typeof chatId !== 'string') return;

            // Validate chatId format to prevent DB errors
            if (!chatId.match(/^[0-9a-fA-F]{24}$/)) {
                return socket.emit('error', { message: 'Invalid chat ID' });
            }

            // Rate limit join_chat requests.
            if (!checkSocketRateLimit(socket.userId, 'join_chat', 10)) {
                return socket.emit('error', { message: 'Too many join requests. Slow down.' });
            }

            // Ensure the connecting user is actually part of the chat.
            const chat = await Chat.findOne({
                _id: chatId,
                participants: socket.userId
            }).select('_id').lean();

            if (!chat) {
                return socket.emit('error', { message: 'Access denied to this chat' });
            }

            socket.join(`chat:${chatId}`);

            socket.to(`chat:${chatId}`).emit('user_joined', {
                userId: socket.userId,
                username: socket.user.username
            });
        } catch (error) {
            logger.error(`handleJoinChat error: ${error.message}`);
            socket.emit('error', { message: 'Failed to join chat' });
        }
    }

    handleLeaveChat(socket, chatId) {
        socket.leave(`chat:${chatId}`);
        socket.to(`chat:${chatId}`).emit('user_left', { userId: socket.userId });
    }

    async handleSendMessage(socket, data) {
        try {
            const { chatId, content, type = 'text', fileUrl, tempId } = data;

            if (!chatId || !content) {
                return socket.emit('error', { message: 'Invalid message data' });
            }

            // Validate chatId format
            if (!chatId.match(/^[0-9a-fA-F]{24}$/)) {
                return socket.emit('error', { message: 'Invalid chat ID' });
            }

            // Rate limit messages (max 20/min)
            if (!checkSocketRateLimit(socket.userId, 'send_message', 20)) {
                return socket.emit('error', { message: 'You are sending messages too fast. Please slow down.' });
            }

            // Enforce message length limit
            if (typeof content !== 'string' || content.length > MAX_MESSAGE_LENGTH) {
                return socket.emit('error', { message: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` });
            }

            // Sanitize message content
            const sanitizedContent = DOMPurify.sanitize(content, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
            if (!sanitizedContent) {
                return socket.emit('error', { message: 'Message content is empty after sanitization' });
            }

            const now = new Date();
            const messageId = new (await import('mongoose')).default.Types.ObjectId();

            // Atomic update: $push message + $set lastMessage + $inc unread counts
            // This avoids loading the entire chat document (which grows with every message)
            const updateOps = {
                $push: {
                    messages: {
                        _id: messageId,
                        sender: socket.userId,
                        content: sanitizedContent,
                        type,
                        fileUrl: fileUrl ? DOMPurify.sanitize(fileUrl, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }) : undefined,
                        timestamp: now,
                        read: false,
                        delivered: true
                    }
                },
                $set: {
                    lastMessage: {
                        content: sanitizedContent,
                        sender: socket.userId,
                        timestamp: now,
                        messageType: type
                    },
                    updatedAt: now
                }
            };

            const chat = await Chat.findOneAndUpdate(
                { _id: chatId, participants: socket.userId },
                updateOps,
                { new: false, projection: { participants: 1 } } // Only return participants, not the full doc
            );

            if (!chat) {
                return socket.emit('error', { message: 'Chat not found' });
            }

            // Increment unread count for other participants
            const incOps = {};
            for (const pId of chat.participants) {
                const pid = pId.toString();
                if (pid !== socket.userId) {
                    incOps[`unreadCount.${pid}`] = 1;
                }
            }
            if (Object.keys(incOps).length > 0) {
                Chat.updateOne({ _id: chatId }, { $inc: incOps }).catch(() => { });
            }

            // Build message payload (sender info from socket — no DB populate needed)
            const messageToSend = {
                _id: messageId.toString(),
                sender: {
                    _id: socket.userId,
                    username: socket.user.username,
                    email: socket.user.email,
                    avatar: socket.user.avatar
                },
                content: sanitizedContent,
                type,
                fileUrl: fileUrl || undefined,
                timestamp: now,
                read: false,
                delivered: true
            };

            // Deliver to each participant's personal room (works even if they
            // haven't opened this chat). socket.to(room) excludes the sender.
            for (const participantId of chat.participants) {
                const pId = participantId.toString();
                if (pId !== socket.userId) {
                    this.io.to(`user:${pId}`).emit('new_message', { chatId, message: messageToSend });
                }
            }

            // Confirm to sender with tempId for placeholder replacement
            socket.emit('message_sent', {
                chatId,
                message: messageToSend,
                tempId: tempId || null
            });
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
            socket.to(`chat:${chatId}`).emit('message_delivered', { chatId, messageId });
        } catch (error) {
            // silent
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
        // Multi-tab: remove just this socket from the Set
        const sockets = this.userSockets.get(userId);
        if (sockets) {
            sockets.delete(socket.id);
            if (sockets.size === 0) {
                // Last tab closed — user is truly offline
                this.userSockets.delete(userId);
                this.setUserOffline(userId);
                socket.broadcast.emit('user_offline', { userId });
            }
        }
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
                .select('-messages') // Never load messages here — only metadata
                .lean();

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

    // Utilities — multi-tab aware
    sendToUser(userId, event, data) {
        // Use the personal room (all tabs join `user:${userId}`)
        this.io.to(`user:${userId}`).emit(event, data);
    }

    sendToChat(chatId, event, data) {
        this.io.to(`chat:${chatId}`).emit(event, data);
    }

    disconnectUser(userId) {
        try {
            if (!this.io || !userId) return;

            const userRoom = `user:${userId}`;
            const sockets = this.io.sockets.adapter.rooms.get(userRoom);
            if (sockets) {
                sockets.forEach((socketId) => {
                    const s = this.io.sockets.sockets.get(socketId);
                    if (s) {
                        s.emit('force_logout', { message: 'Session ended. Please login again.' });
                        s.disconnect(true);
                    }
                });
            }
        } catch (err) {
            logger.error(`disconnectUser error: ${err.message}`);
        }
    }

    // Admin notifications for deposits/withdrawals
    notifyAdminsNewDeposit(deposit) {
        this.io.to('admin').emit('new_deposit', deposit);
    }

    notifyAdminsNewWithdrawal(withdrawal) {
        this.io.to('admin').emit('new_withdrawal', withdrawal);
    }

    notifyAdminsDepositUpdate(deposit) {
        this.io.to('admin').emit('deposit_updated', deposit);
    }

    notifyAdminsWithdrawalUpdate(withdrawal) {
        this.io.to('admin').emit('withdrawal_updated', withdrawal);
    }

    notifyUserDepositStatus(userId, deposit) {
        this.sendToUser(userId, 'deposit_status_updated', deposit);
    }

    notifyUserWithdrawalStatus(userId, withdrawal) {
        this.sendToUser(userId, 'withdrawal_status_updated', withdrawal);
    }

    // ── Transaction / Escrow events ─────────────────────────────────────────

    // Seller: a buyer just purchased your listing
    notifySellerNewPurchase(sellerId, payload) {
        logger.info(`📢 Notifying seller ${sellerId} of new purchase: ${payload.transactionId}`);
        this.sendToUser(sellerId, 'new_purchase', payload);
    }

    // Buyer: seller submitted credentials
    notifyBuyerCredentialsSent(buyerId, payload) {
        logger.info(`📢 Notifying buyer ${buyerId} credentials sent: ${payload.transactionId}`);
        this.sendToUser(buyerId, 'credentials_sent', payload);
    }

    // Seller: buyer confirmed receipt
    notifySellerPurchaseConfirmed(sellerId, payload) {
        logger.info(`📢 Notifying seller ${sellerId} purchase confirmed: ${payload.transactionId}`);
        this.sendToUser(sellerId, 'purchase_confirmed', payload);
    }

    // Admin: buyer opened dispute
    notifyAdminsDispute(payload) {
        logger.info(`📢 Notifying admins of dispute: ${payload.transactionId}`);
        this.io.to('admin').emit('new_dispute', payload);
    }

    // Buyer/Seller: admin resolved dispute
    notifyDisputeResolved(userId, payload) {
        logger.info(`📢 Notifying user ${userId} dispute resolved: ${payload.transactionId}`);
        this.sendToUser(userId, 'dispute_resolved', payload);
    }

    // Seller: auto-confirmed after 48h
    notifySellerAutoConfirmed(sellerId, payload) {
        logger.info(`📢 Notifying seller ${sellerId} auto-confirmed: ${payload.transactionId}`);
        this.sendToUser(sellerId, 'auto_confirmed', payload);
    }

    // Both: broadcast updated pending-transactions count
    notifyTransactionUpdate(userId, payload) {
        this.sendToUser(userId, 'transaction_updated', payload);
    }
}

export default new SocketService();
