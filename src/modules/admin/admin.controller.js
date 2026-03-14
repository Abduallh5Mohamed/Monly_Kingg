import User from "../users/user.model.js";
import Chat from "../chats/chat.model.js";
import Transaction from "../transactions/transaction.model.js";
import Deposit from "../deposits/deposit.model.js";
import Withdrawal from "../withdrawals/withdrawal.model.js";
import Listing from "../listings/listing.model.js";
import Game from "../games/game.model.js";
import SellerRequest from "../sellers/sellerRequest.model.js";
import SiteSettings from "./siteSettings.model.js";
import AuditLog from "./auditLog.model.js";
import logger from "../../utils/logger.js";
import cacheService from "../../services/cacheService.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import redis from "../../config/redis.js";
import { PERMISSION_KEYS } from "../../middlewares/roleMiddleware.js";
import escapeRegex from "../../utils/escapeRegex.js";

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);

/* ---------------- Get All Users ---------------- */
export const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, role = "all" } = req.query;
        const search = (req.query.search || "").trim().slice(0, 100);

        // Build filter
        const filter = {};
        if (search) {
            filter.$or = [
                { email: { $regex: escapeRegex(search), $options: 'i' } },
                { username: { $regex: escapeRegex(search), $options: 'i' } }
            ];
        }
        if (role !== "all") {
            filter.role = role;
        }

        // Get users with pagination
        const skip = (page - 1) * limit;
        const users = await User.find(filter)
            .select("-passwordHash -verificationCode -passwordResetToken")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count
        const total = await User.countDocuments(filter);

        logger.info(`Admin fetched users: page ${page}, ${users.length} users`);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalUsers: total,
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            }
        });
    } catch (error) {
        logger.error(`Admin get users error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Failed to fetch users"
        });
    }
};

/* ---------------- Get Admin Stats ---------------- */
export const getAdminStats = async (req, res) => {
    try {
        // Try cache first (3-minute TTL)
        const cached = await cacheService.getCachedAdminStats();
        if (cached) {
            return res.json({ success: true, data: cached, cached: true });
        }

        // Get user statistics
        const totalUsers = await User.countDocuments();
        const verifiedUsers = await User.countDocuments({ verified: true });
        const adminUsers = await User.countDocuments({ role: "admin" });
        const newUsersToday = await User.countDocuments({
            createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        });

        // Get user registration trend (last 7 days)
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const count = await User.countDocuments({
                createdAt: { $gte: date, $lt: nextDate }
            });

            last7Days.push({
                date: date.toISOString().split('T')[0],
                count
            });
        }

        // Calculate growth percentage
        const yesterdayUsers = await User.countDocuments({
            createdAt: {
                $gte: new Date(new Date().setDate(new Date().getDate() - 1)),
                $lt: new Date(new Date().setHours(0, 0, 0, 0))
            }
        });

        const userGrowth = yesterdayUsers > 0 ?
            ((newUsersToday - yesterdayUsers) / yesterdayUsers * 100).toFixed(1) :
            newUsersToday > 0 ? 100 : 0;

        const stats = {
            totalUsers,
            verifiedUsers,
            adminUsers,
            newUsersToday,
            userGrowth: parseFloat(userGrowth),
            verificationRate: totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(1) : 0,
            registrationTrend: last7Days
        };

        // Cache the stats for 3 minutes
        await cacheService.cacheAdminStats(stats);

        logger.info(`Admin fetched stats: ${totalUsers} total users`);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error(`Admin get stats error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Failed to fetch statistics"
        });
    }
};

/* ---------------- Update User Role ---------------- */
export const updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        if (!["user", "admin"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role. Moderators must be created via the Moderators page."
            });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { role },
            { new: true }
        ).select("-passwordHash -verificationCode -passwordResetToken");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Clear user from cache
        await cacheService.invalidateUser(userId);

        // Log the action
        user.authLogs.push({
            action: "role_update",
            success: true,
            ip: req.ip,
            userAgent: `Admin: ${req.user.email}`
        });
        await user.save();

        logger.info(`Admin ${req.user.email} updated role of ${user.email} to ${role}`);

        res.json({
            success: true,
            message: "User role updated successfully",
            data: user
        });
    } catch (error) {
        logger.error(`Admin update user role error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Failed to update user role"
        });
    }
};

/* ---------------- Delete User ---------------- */
export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        // Don't allow deleting yourself
        if (userId === req.user._id.toString() || userId === req.user.id) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete your own account"
            });
        }

        const user = await User.findByIdAndDelete(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Clear user from cache
        await cacheService.invalidateUser(userId);

        logger.info(`Admin ${req.user.email} deleted user ${user.email}`);

        res.json({
            success: true,
            message: "User deleted successfully"
        });
    } catch (error) {
        logger.error(`Admin delete user error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Failed to delete user"
        });
    }
};

/* ---------------- Get Recent Activity ---------------- */
export const getRecentActivity = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        // Get recent users with their auth logs
        const recentUsers = await User.find()
            .select("email username role verified createdAt authLogs")
            .sort({ createdAt: -1 })
            .limit(parseInt(limit) * 2); // Get more to filter

        // Extract recent activities
        const activities = [];

        recentUsers.forEach(user => {
            // Add registration activity
            activities.push({
                type: "registration",
                user: {
                    email: user.email,
                    username: user.username,
                    role: user.role
                },
                timestamp: user.createdAt,
                description: `New user registered: ${user.username}`
            });

            // Add auth logs
            if (user.authLogs && user.authLogs.length > 0) {
                user.authLogs.slice(-3).forEach(log => {
                    activities.push({
                        type: log.action,
                        user: {
                            email: user.email,
                            username: user.username,
                            role: user.role
                        },
                        timestamp: log.timestamp || log.createdAt,
                        description: `User ${log.action.replace('_', ' ')}: ${user.username}`,
                        success: log.success,
                        ip: log.ip
                    });
                });
            }
        });

        // Sort by timestamp and limit
        const sortedActivities = activities
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, parseInt(limit));

        res.json({
            success: true,
            data: sortedActivities
        });
    } catch (error) {
        logger.error(`Admin get recent activity error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Failed to fetch recent activity"
        });
    }
};

/* ---------------- Toggle User Status ---------------- */
export const toggleUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Toggle verified status
        user.verified = !user.verified;

        // Log the action
        user.authLogs.push({
            action: user.verified ? "account_activated" : "account_deactivated",
            success: true,
            ip: req.ip,
            userAgent: `Admin: ${req.user.email}`
        });

        await user.save();

        // Clear user from cache
        await cacheService.invalidateUser(userId);

        logger.info(`Admin ${req.user.email} ${user.verified ? 'activated' : 'deactivated'} user ${user.email}`);

        res.json({
            success: true,
            message: `User ${user.verified ? 'activated' : 'deactivated'} successfully`,
            data: {
                userId: user._id,
                verified: user.verified
            }
        });
    } catch (error) {
        logger.error(`Admin toggle user status error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Failed to toggle user status"
        });
    }
};

/* ---------------- Get All Chats (Admin Monitoring) ---------------- */
export const getAllChats = async (req, res) => {
    try {
        const { page = 1, limit = 20, type = 'all', search = '' } = req.query;

        // Build filter
        const filter = { isActive: true };
        if (type !== 'all') {
            filter.type = type;
        }

        // Search by chat number, participant email/username
        if (search) {
            // Check if search is a 9-digit number (chat number)
            if (/^\d{9}$/.test(search)) {
                filter.chatNumber = search;
            } else {
                // Search by participant email/username
                const safeSearch = escapeRegex(String(search).trim().slice(0, 100));
                const users = await User.find({
                    $or: [
                        { email: { $regex: safeSearch, $options: 'i' } },
                        { username: { $regex: safeSearch, $options: 'i' } }
                    ]
                }).select('_id');

                const userIds = users.map(u => u._id);
                filter.participants = { $in: userIds };
            }
        }

        const skip = (page - 1) * limit;

        const chats = await Chat.find(filter)
            .populate('participants', 'username email avatar role verified')
            .populate('lastMessage.sender', 'username email avatar')
            .sort({ 'lastMessage.timestamp': -1, updatedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('-messages') // Don't load messages for list view
            .lean();

        const total = await Chat.countDocuments(filter);

        // Add message count and participant info
        const chatsWithStats = chats.map(chat => {
            const participantNames = chat.participants
                .map(p => p.username || p.email)
                .join(' & ');

            return {
                ...chat,
                participantNames,
                messageCount: 0 // Will be loaded when viewing specific chat
            };
        });

        logger.info(`Admin ${req.user.email} fetched ${chats.length} chats for monitoring`);

        res.json({
            success: true,
            data: {
                chats: chatsWithStats,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalChats: total,
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            }
        });
    } catch (error) {
        logger.error(`Admin get all chats error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Failed to fetch chats"
        });
    }
};

/* ---------------- Get Chat Details (Admin Monitoring) ---------------- */
export const getChatDetails = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const chat = await Chat.findById(chatId)
            .populate('participants', 'username email avatar role verified createdAt')
            .lean();

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found"
            });
        }

        // Get all sender IDs from messages
        const senderIds = [...new Set((chat.messages || []).map(m => m.sender).filter(Boolean))];

        // Populate senders
        const User = mongoose.model('User');
        const senders = await User.find({ _id: { $in: senderIds } })
            .select('username email avatar role')
            .lean();

        // Create sender map for quick lookup
        const senderMap = new Map(senders.map(s => [s._id.toString(), s]));

        // Paginate messages and populate sender data
        const allMessages = (chat.messages || []).map(msg => ({
            ...msg,
            sender: msg.sender ? senderMap.get(msg.sender.toString()) || null : null
        }));
        const totalMessages = allMessages.length;
        const messages = allMessages
            .slice((page - 1) * limit, page * limit);

        logger.info(`Admin ${req.user.email} viewed chat ${chatId} with ${totalMessages} messages`);

        res.json({
            success: true,
            data: {
                chat: {
                    _id: chat._id,
                    chatNumber: chat.chatNumber,
                    type: chat.type,
                    participants: chat.participants,
                    lastMessage: chat.lastMessage,
                    isActive: chat.isActive,
                    createdAt: chat.createdAt,
                    updatedAt: chat.updatedAt
                },
                messages,
                stats: {
                    totalMessages,
                    participantCount: chat.participants.length,
                    createdAt: chat.createdAt,
                    lastActivity: chat.lastMessage?.timestamp || chat.updatedAt
                },
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalMessages / limit),
                    totalMessages,
                    hasNext: page * limit < totalMessages,
                    hasPrev: page > 1
                }
            }
        });
    } catch (error) {
        logger.error(`Admin get chat details error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Failed to fetch chat details"
        });
    }
};

/* ---------------- Get Chat Statistics (Admin) ---------------- */
export const getChatStatistics = async (req, res) => {
    try {
        const totalChats = await Chat.countDocuments({ isActive: true });
        const directChats = await Chat.countDocuments({ type: 'direct', isActive: true });
        const supportChats = await Chat.countDocuments({ type: 'support', isActive: true });
        const groupChats = await Chat.countDocuments({ type: 'group', isActive: true });

        // Get chats with activity in last 24 hours
        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const activeChatsToday = await Chat.countDocuments({
            isActive: true,
            'lastMessage.timestamp': { $gte: last24Hours }
        });

        // Get most active chats
        const mostActiveChats = await Chat.find({ isActive: true })
            .populate('participants', 'username email avatar')
            .sort({ 'lastMessage.timestamp': -1 })
            .limit(5)
            .select('-messages')
            .lean();

        logger.info(`Admin ${req.user.email} fetched chat statistics`);

        res.json({
            success: true,
            data: {
                totalChats,
                chatsByType: {
                    direct: directChats,
                    support: supportChats,
                    group: groupChats
                },
                activeChatsToday,
                activityRate: totalChats > 0 ? ((activeChatsToday / totalChats) * 100).toFixed(1) : 0,
                mostActiveChats: mostActiveChats.map(chat => ({
                    _id: chat._id,
                    participants: chat.participants,
                    participantNames: chat.participants.map(p => p.username || p.email).join(' & '),
                    lastMessage: chat.lastMessage,
                    type: chat.type
                }))
            }
        });
    } catch (error) {
        logger.error(`Admin get chat statistics error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Failed to fetch chat statistics"
        });
    }
};

/* ---------------- Get Full User Detail (Admin) ---------------- */
export const getUserDetail = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID" });
        }

        // Get user with sensitive fields for admin
        const user = await User.findById(userId)
            .select("+authLogs +failedLoginAttempts +lockUntil")
            .lean();

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Remove password hash for safety
        delete user.passwordHash;
        delete user.verificationCode;
        delete user.forgotPasswordCode;
        delete user.passwordResetToken;

        // Seller request (ID verification)
        const sellerRequest = await SellerRequest.findOne({ user: userId })
            .select("fullName idType +idImage +faceImageFront +faceImageLeft +faceImageRight status rejectionReason applicationCount rejectionHistory reviewedAt createdAt")
            .populate("reviewedBy", "username")
            .lean();

        // Transaction stats
        const [txAsBuyer, txAsSeller, txDisputed] = await Promise.all([
            Transaction.countDocuments({ buyer: userId }),
            Transaction.countDocuments({ seller: userId }),
            Transaction.countDocuments({ $or: [{ buyer: userId }, { seller: userId }], status: "disputed" }),
        ]);

        // Recent transactions (last 10)
        const recentTransactions = await Transaction.find({
            $or: [{ buyer: userId }, { seller: userId }]
        })
            .select("amount status createdAt buyer seller")
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("buyer", "username")
            .populate("seller", "username")
            .lean();

        // Deposit history
        const [depositStats, recentDeposits] = await Promise.all([
            Deposit.aggregate([
                { $match: { user: new mongoose.Types.ObjectId(userId) } },
                { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" } } }
            ]),
            Deposit.find({ user: userId })
                .select("amount status paymentMethod senderFullName senderPhoneOrEmail depositDate receiptImage createdAt adminNote")
                .sort({ createdAt: -1 })
                .limit(20)
                .lean(),
        ]);

        // Withdrawal history
        const [withdrawalStats, recentWithdrawals] = await Promise.all([
            Withdrawal.aggregate([
                { $match: { user: new mongoose.Types.ObjectId(userId) } },
                { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" } } }
            ]),
            Withdrawal.find({ user: userId })
                .select("amount method countryCode phoneNumber status rejectionReason reviewedBy reviewedAt createdAt")
                .sort({ createdAt: -1 })
                .limit(20)
                .populate("reviewedBy", "username")
                .lean(),
        ]);

        // Active listings count
        const [listingsActive, listingsSold, listingsTotal] = await Promise.all([
            Listing.countDocuments({ seller: userId, status: "available" }),
            Listing.countDocuments({ seller: userId, status: "sold" }),
            Listing.countDocuments({ seller: userId }),
        ]);

        // Extract unique IPs from auth logs and refresh tokens
        const ipSet = new Set();
        if (user.authLogs) {
            user.authLogs.forEach(log => {
                if (log.ip) ipSet.add(log.ip);
            });
        }
        if (user.refreshTokens) {
            user.refreshTokens.forEach(rt => {
                if (rt.ip) ipSet.add(rt.ip);
            });
        }

        // Get last login info
        const lastLogin = user.authLogs
            ?.filter(l => l.action === 'login' && l.success)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;

        // Build response
        const result = {
            // Core Profile
            _id: user._id,
            username: user.username,
            email: user.email,
            fullName: user.fullName || null,
            phone: user.phone || null,
            address: user.address || null,
            avatar: user.avatar,
            bio: user.bio || null,
            role: user.role,
            verified: user.verified,
            profileCompleted: user.profileCompleted,
            googleId: user.googleId || null,
            isSeller: user.isSeller,
            sellerApprovedAt: user.sellerApprovedAt || null,
            isOnline: user.isOnline,
            lastSeenAt: user.lastSeenAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,

            // Wallet
            wallet: user.wallet || { balance: 0, hold: 0 },

            // Stats
            stats: user.stats || { totalVolume: 0, level: 1, successfulTrades: 0, failedTrades: 0 },

            // 2FA
            twoFA: { enabled: user.twoFA?.enabled || false },

            // Security
            security: {
                failedLoginAttempts: user.failedLoginAttempts || 0,
                lockUntil: user.lockUntil || null,
                lastUsernameChange: user.lastUsernameChange,
                lastPhoneChange: user.lastPhoneChange,
                lastLogin: lastLogin ? {
                    ip: lastLogin.ip,
                    userAgent: lastLogin.userAgent,
                    at: lastLogin.createdAt,
                } : null,
                knownIPs: [...ipSet],
                authLogs: (user.authLogs || []).slice(-30).reverse(), // last 30 logs, newest first
            },

            // Active sessions (non-revoked tokens)
            activeSessions: (user.refreshTokens || [])
                .filter(rt => !rt.revoked && new Date(rt.expiresAt) > new Date())
                .map(rt => ({
                    ip: rt.ip,
                    userAgent: rt.userAgent,
                    createdAt: rt.createdAt,
                    expiresAt: rt.expiresAt,
                })),

            // Seller verification
            sellerRequest: sellerRequest || null,

            // Transactions
            transactions: {
                asBuyer: txAsBuyer,
                asSeller: txAsSeller,
                disputed: txDisputed,
                recent: recentTransactions,
            },

            // Deposits
            deposits: {
                stats: depositStats,
                recent: recentDeposits,
            },

            // Withdrawals
            withdrawals: {
                stats: withdrawalStats,
                recent: recentWithdrawals,
            },

            // Listings
            listings: {
                total: listingsTotal,
                active: listingsActive,
                sold: listingsSold,
            },

            // Badges
            badges: user.badges || [],
        };

        res.json({ success: true, data: result });
    } catch (error) {
        logger.error(`Admin get user detail error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to fetch user detail" });
    }
};

/* ============================================================================
 * CHANGE PASSWORD (for the logged-in admin / mod)
 * ========================================================================= */
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "Current and new password are required" });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: "New password must be at least 8 characters" });
        }

        const user = await User.findById(req.user._id).select("+passwordHash +refreshTokens");
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const match = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!match) return res.status(400).json({ success: false, message: "Current password is incorrect" });

        user.passwordHash = await bcrypt.hash(newPassword, 12);

        // Revoke all refresh tokens on password change.
        if (Array.isArray(user.refreshTokens)) {
            user.refreshTokens.forEach((rt) => {
                rt.revoked = true;
                rt.revokedAt = new Date();
                rt.replacedByToken = null;
            });
        }

        await user.save();

        // Invalidate cached user so tokens re-validated
        await cacheService.invalidateUser(user._id);

        // Blacklist the current access token for its remaining lifetime.
        const accessToken = req.cookies?.access_token || req.headers.authorization?.split(" ")[1];
        if (accessToken && redis.isReady()) {
            try {
                const decoded = jwt.decode(accessToken);
                const remainingTTL = decoded?.exp ? Math.max(0, decoded.exp - Math.floor(Date.now() / 1000)) : 900;
                if (remainingTTL > 0) {
                    const tokenHash = crypto.createHash("sha256").update(accessToken).digest("hex");
                    await redis.set(`bl:token:${tokenHash}`, 1, remainingTTL);
                }
            } catch (_) {
                // non-fatal
            }
        }

        logger.info(`Admin/Mod ${user._id} changed their password`);
        res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
        logger.error(`Change password error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to change password" });
    }
};

/* ============================================================================
 * SITE SETTINGS — Full Platform Configuration
 * ========================================================================= */

/* ---------------- Get Site Settings ---------------- */
export const getSiteSettings = async (req, res) => {
    try {
        const settings = await SiteSettings.getSingleton();
        res.json({
            success: true,
            data: {
                // Platform info
                siteName: settings.siteName,
                siteUrl: settings.siteUrl,
                siteDescription: settings.siteDescription,
                supportEmail: settings.supportEmail,
                supportPhone: settings.supportPhone,
                // System
                maintenanceMode: settings.maintenanceMode,
                autoBackup: settings.autoBackup,
                userRegistration: settings.userRegistration,
                // Notifications
                orderNotifications: settings.orderNotifications,
                userRegNotifications: settings.userRegNotifications,
                marketingEmails: settings.marketingEmails,
                browserNotifications: settings.browserNotifications,
                chatNotifications: settings.chatNotifications,
                // Security
                twoFactorAuth: settings.twoFactorAuth,
                sessionTimeout: settings.sessionTimeout,
                // Commission (kept for backward compat)
                commissionPercent: settings.commissionPercent,
                sellerPayoutDelayDays: settings.sellerPayoutDelayDays,
                adminCommissionBalance: settings.adminCommissionBalance,
                updatedAt: settings.updatedAt,
            },
        });
    } catch (error) {
        logger.error(`Admin get site settings error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to fetch settings" });
    }
};

/* ---------------- Update Site Settings ---------------- */
export const updateSiteSettings = async (req, res) => {
    try {
        const settings = await SiteSettings.getSingleton();

        // ── String fields ────────────────────────────────────────────────
        const stringFields = ["siteName", "siteUrl", "siteDescription", "supportEmail", "supportPhone"];
        for (const key of stringFields) {
            if (req.body[key] !== undefined) {
                settings[key] = String(req.body[key]).trim();
            }
        }

        // ── Boolean fields ───────────────────────────────────────────────
        const boolFields = [
            "maintenanceMode", "autoBackup", "userRegistration",
            "orderNotifications", "userRegNotifications", "marketingEmails",
            "browserNotifications", "chatNotifications",
            "twoFactorAuth", "sessionTimeout",
        ];
        for (const key of boolFields) {
            if (req.body[key] !== undefined) {
                settings[key] = Boolean(req.body[key]);
            }
        }

        // ── Commission (number) ──────────────────────────────────────────
        if (req.body.commissionPercent !== undefined) {
            const val = parseFloat(req.body.commissionPercent);
            if (isNaN(val) || val < 0 || val > 100) {
                return res.status(400).json({ success: false, message: "Commission must be between 0 and 100" });
            }
            settings.commissionPercent = val;
        }

        if (req.body.sellerPayoutDelayDays !== undefined) {
            const val = parseInt(req.body.sellerPayoutDelayDays);
            if (isNaN(val) || val < 0 || val > 90) {
                return res.status(400).json({ success: false, message: "Payout delay must be between 0 and 90 days" });
            }
            settings.sellerPayoutDelayDays = val;
        }

        settings.lastUpdatedBy = req.user._id;
        await settings.save();

        logger.info(`Admin updated site settings by user ${req.user._id}`);

        res.json({
            success: true,
            message: "Settings updated successfully",
            data: {
                siteName: settings.siteName,
                siteUrl: settings.siteUrl,
                siteDescription: settings.siteDescription,
                supportEmail: settings.supportEmail,
                supportPhone: settings.supportPhone,
                maintenanceMode: settings.maintenanceMode,
                autoBackup: settings.autoBackup,
                userRegistration: settings.userRegistration,
                orderNotifications: settings.orderNotifications,
                userRegNotifications: settings.userRegNotifications,
                marketingEmails: settings.marketingEmails,
                browserNotifications: settings.browserNotifications,
                chatNotifications: settings.chatNotifications,
                twoFactorAuth: settings.twoFactorAuth,
                sessionTimeout: settings.sessionTimeout,
                commissionPercent: settings.commissionPercent,
                sellerPayoutDelayDays: settings.sellerPayoutDelayDays,
                adminCommissionBalance: settings.adminCommissionBalance,
            },
        });
    } catch (error) {
        logger.error(`Admin update site settings error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to update settings" });
    }
};

/* ---------------- Get Earned Commission Stats ---------------- */
export const getEarnedCommission = async (req, res) => {
    try {
        const { page = 1, limit = 30 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const settings = await SiteSettings.getSingleton();

        // Get all transactions with commission > 0
        const filter = { commissionAmount: { $gt: 0 } };

        const [transactions, total] = await Promise.all([
            Transaction.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .select("buyer seller listing amount commissionPercent commissionAmount sellerNetAmount payoutStatus paidOutAt status createdAt")
                .populate("listing", "title price")
                .populate("buyer", "username")
                .populate("seller", "username"),
            Transaction.countDocuments(filter),
        ]);

        // Aggregate total commission earned
        const [stats] = await Transaction.aggregate([
            { $match: { commissionAmount: { $gt: 0 } } },
            {
                $group: {
                    _id: null,
                    totalCommission: { $sum: "$commissionAmount" },
                    totalTransactions: { $sum: 1 },
                    avgCommission: { $avg: "$commissionAmount" },
                },
            },
        ]);

        // Commission over last 7 days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const [dayStats] = await Transaction.aggregate([
                {
                    $match: {
                        commissionAmount: { $gt: 0 },
                        createdAt: { $gte: date, $lt: nextDate },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$commissionAmount" },
                        count: { $sum: 1 },
                    },
                },
            ]);

            last7Days.push({
                date: date.toISOString().split("T")[0],
                total: dayStats?.total || 0,
                count: dayStats?.count || 0,
            });
        }

        // Pending payouts
        const pendingPayouts = await Transaction.countDocuments({ payoutStatus: "pending_payout" });
        const pendingPayoutsAmount = await Transaction.aggregate([
            { $match: { payoutStatus: "pending_payout" } },
            { $group: { _id: null, total: { $sum: "$sellerNetAmount" } } },
        ]);

        res.json({
            success: true,
            data: {
                adminCommissionBalance: settings.adminCommissionBalance,
                totalCommission: stats?.totalCommission || 0,
                totalTransactionsWithCommission: stats?.totalTransactions || 0,
                avgCommission: +(stats?.avgCommission || 0).toFixed(2),
                commissionTrend: last7Days,
                pendingPayouts,
                pendingPayoutsAmount: pendingPayoutsAmount[0]?.total || 0,
                currentCommissionPercent: settings.commissionPercent,
                currentPayoutDelay: settings.sellerPayoutDelayDays,
                transactions,
                pagination: { total, page: parseInt(page), limit: parseInt(limit) },
            },
        });
    } catch (error) {
        logger.error(`Admin get earned commission error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to fetch commission data" });
    }
};

/* ─────────── Admin Listings Management ─────────── */

/**
 * GET /api/v1/admin/listings
 * Get all listings with pagination, search, and filters
 */
export const getAdminListings = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = "",
            status = "all",
            game = "all",
            sort = "newest"
        } = req.query;

        const filter = {};

        // Status filter
        if (status !== "all") {
            filter.status = status;
        }

        // Game filter
        if (game !== "all") {
            filter.game = game;
        }

        // Search filter
        if (search) {
            filter.$or = [
                { title: { $regex: escapeRegex(search), $options: "i" } },
                { description: { $regex: escapeRegex(search), $options: "i" } },
            ];
        }

        // Sort options
        let sortOption = { createdAt: -1 };
        if (sort === "oldest") sortOption = { createdAt: 1 };
        else if (sort === "price_asc") sortOption = { price: 1 };
        else if (sort === "price_desc") sortOption = { price: -1 };
        else if (sort === "title") sortOption = { title: 1 };

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [listings, total] = await Promise.all([
            Listing.find(filter)
                .populate("game", "name")
                .populate("seller", "username email avatar")
                .sort(sortOption)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Listing.countDocuments(filter),
        ]);

        // Get sales count for each listing from transactions
        const listingIds = listings.map(l => l._id);
        const salesAgg = await Transaction.aggregate([
            {
                $match: {
                    listing: { $in: listingIds },
                    status: { $in: ["completed", "auto_confirmed"] }
                }
            },
            {
                $group: {
                    _id: "$listing",
                    salesCount: { $sum: 1 },
                    totalRevenue: { $sum: "$amount" }
                }
            }
        ]);

        const salesMap = {};
        for (const s of salesAgg) {
            salesMap[s._id.toString()] = { salesCount: s.salesCount, totalRevenue: s.totalRevenue };
        }

        // Enrich listings with sales data
        const enrichedListings = listings.map(listing => ({
            ...listing,
            sales: salesMap[listing._id.toString()]?.salesCount || 0,
            revenue: salesMap[listing._id.toString()]?.totalRevenue || 0,
        }));

        logger.info(`Admin fetched listings: page ${page}, ${listings.length} listings`);

        res.json({
            success: true,
            data: {
                listings: enrichedListings,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    total,
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            }
        });
    } catch (error) {
        logger.error(`Admin get listings error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to fetch listings" });
    }
};

/**
 * GET /api/v1/admin/listings/stats
 * Get listing statistics for the admin dashboard
 */
export const getAdminListingStats = async (req, res) => {
    try {
        const [totalListings, availableListings, soldListings, inProgressListings] = await Promise.all([
            Listing.countDocuments({}),
            Listing.countDocuments({ status: "available" }),
            Listing.countDocuments({ status: "sold" }),
            Listing.countDocuments({ status: "in_progress" }),
        ]);

        // Total sales and revenue from completed transactions
        const revenueAgg = await Transaction.aggregate([
            { $match: { status: { $in: ["completed", "auto_confirmed"] } } },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: 1 },
                    totalRevenue: { $sum: "$amount" },
                    totalCommission: { $sum: "$commissionAmount" }
                }
            }
        ]);

        const stats = revenueAgg[0] || { totalSales: 0, totalRevenue: 0, totalCommission: 0 };

        res.json({
            success: true,
            data: {
                totalListings,
                availableListings,
                soldListings,
                inProgressListings,
                totalSales: stats.totalSales,
                totalRevenue: stats.totalRevenue,
                totalCommission: stats.totalCommission,
            }
        });
    } catch (error) {
        logger.error(`Admin listing stats error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to fetch listing stats" });
    }
};

/**
 * DELETE /api/v1/admin/listings/:id
 * Admin force-delete a listing
 */
export const deleteAdminListing = async (req, res) => {
    try {
        const { id } = req.params;

        const listing = await Listing.findById(id);
        if (!listing) {
            return res.status(404).json({ success: false, message: "Listing not found" });
        }

        // Check if there are active transactions for this listing
        const activeTransaction = await Transaction.findOne({
            listing: id,
            status: { $in: ["waiting_seller", "waiting_buyer", "disputed"] }
        });

        if (activeTransaction) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete listing with active transactions"
            });
        }

        await Listing.findByIdAndDelete(id);

        logger.info(`Admin deleted listing ${id}`);

        res.json({ success: true, message: "Listing deleted successfully" });
    } catch (error) {
        logger.error(`Admin delete listing error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to delete listing" });
    }
};

/**
 * PUT /api/v1/admin/listings/:id/status
 * Admin update listing status
 */
export const updateAdminListingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!["available", "sold", "in_progress"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const listing = await Listing.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        ).populate("game", "name").populate("seller", "username email");

        if (!listing) {
            return res.status(404).json({ success: false, message: "Listing not found" });
        }

        logger.info(`Admin updated listing ${id} status to ${status}`);

        res.json({ success: true, data: listing, message: "Status updated" });
    } catch (error) {
        logger.error(`Admin update listing status error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to update listing status" });
    }
};

/* ========== GAMES MANAGEMENT ========== */

/**
 * GET /api/v1/admin/games
 * Get all games with listing counts and revenue
 */
export const getAdminGames = async (req, res) => {
    try {
        const { search = "", status = "all" } = req.query;

        const filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: escapeRegex(search), $options: "i" } },
                { category: { $regex: escapeRegex(search), $options: "i" } },
            ];
        }
        if (status !== "all") {
            filter.status = status;
        }

        const games = await Game.find(filter).sort({ createdAt: -1 }).lean();

        // Get listing counts and revenue per game
        const gameIds = games.map((g) => g._id);

        const [listingCounts, revenuePipeline] = await Promise.all([
            Listing.aggregate([
                { $match: { game: { $in: gameIds } } },
                { $group: { _id: "$game", count: { $sum: 1 } } },
            ]),
            Transaction.aggregate([
                { $match: { status: { $in: ["completed", "auto_confirmed"] } } },
                {
                    $lookup: {
                        from: "listings",
                        localField: "listing",
                        foreignField: "_id",
                        as: "listingData",
                    },
                },
                { $unwind: "$listingData" },
                { $match: { "listingData.game": { $in: gameIds } } },
                {
                    $group: {
                        _id: "$listingData.game",
                        revenue: { $sum: "$amount" },
                        sales: { $sum: 1 },
                    },
                },
            ]),
        ]);

        const countMap = {};
        listingCounts.forEach((c) => (countMap[c._id.toString()] = c.count));

        const revenueMap = {};
        revenuePipeline.forEach((r) => {
            revenueMap[r._id.toString()] = { revenue: r.revenue, sales: r.sales };
        });

        const enriched = games.map((g) => ({
            ...g,
            listingsCount: countMap[g._id.toString()] || 0,
            revenue: revenueMap[g._id.toString()]?.revenue || 0,
            sales: revenueMap[g._id.toString()]?.sales || 0,
        }));

        res.json({ success: true, data: enriched });
    } catch (error) {
        logger.error(`Admin get games error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to fetch games" });
    }
};

/**
 * GET /api/v1/admin/games/stats
 */
export const getAdminGameStats = async (req, res) => {
    try {
        const [totalGames, activeGames, inactiveGames, totalListings] = await Promise.all([
            Game.countDocuments({}),
            Game.countDocuments({ status: "active" }),
            Game.countDocuments({ status: "inactive" }),
            Listing.countDocuments({}),
        ]);

        const revenueAgg = await Transaction.aggregate([
            { $match: { status: { $in: ["completed", "auto_confirmed"] } } },
            { $group: { _id: null, totalRevenue: { $sum: "$amount" }, totalCommission: { $sum: "$commissionAmount" } } },
        ]);

        const stats = revenueAgg[0] || { totalRevenue: 0, totalCommission: 0 };

        res.json({
            success: true,
            data: { totalGames, activeGames, inactiveGames, totalListings, totalRevenue: stats.totalRevenue, totalCommission: stats.totalCommission },
        });
    } catch (error) {
        logger.error(`Admin game stats error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to fetch game stats" });
    }
};

/**
 * POST /api/v1/admin/games
 * Create a new game
 */
export const createAdminGame = async (req, res) => {
    try {
        const { name, category, icon, status: gameStatus, fields } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: "Game name is required" });
        }

        // Check duplicate
        const existing = await Game.findOne({ name: { $regex: `^${escapeRegex(name.trim())}$`, $options: "i" } });
        if (existing) {
            return res.status(409).json({ success: false, message: "A game with this name already exists" });
        }

        // Generate slug
        const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

        // Validate fields if provided
        const validTypes = ["email", "password", "phone", "number", "text"];
        const gameFields = Array.isArray(fields) && fields.length > 0
            ? fields.filter(f => f.name && f.name.trim()).map(f => ({
                name: f.name.trim(),
                type: validTypes.includes(f.type) ? f.type : "text",
                required: f.required !== false,
                placeholder: f.placeholder?.trim() || "",
            }))
            : undefined; // let Mongoose default kick in (Email + Password)

        const gameData = {
            name: name.trim(),
            slug,
            category: category?.trim() || "",
            icon: icon?.trim() || "",
            status: gameStatus || "active",
        };
        if (gameFields) gameData.fields = gameFields;

        const game = await Game.create(gameData);

        // Invalidate games cache
        try { await cacheService.invalidateGamesCache(); } catch (_) { }

        logger.info(`Admin created game: ${game.name} (${game._id})`);
        res.status(201).json({ success: true, data: game, message: "Game created successfully" });
    } catch (error) {
        logger.error(`Admin create game error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to create game" });
    }
};

/**
 * PUT /api/v1/admin/games/:id
 * Update game details
 */
export const updateAdminGame = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, icon, status: gameStatus, fields } = req.body;

        const game = await Game.findById(id);
        if (!game) {
            return res.status(404).json({ success: false, message: "Game not found" });
        }

        if (name && name.trim() !== game.name) {
            const existing = await Game.findOne({ name: { $regex: `^${escapeRegex(name.trim())}$`, $options: "i" }, _id: { $ne: id } });
            if (existing) {
                return res.status(409).json({ success: false, message: "A game with this name already exists" });
            }
            game.name = name.trim();
            game.slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        }
        if (category !== undefined) game.category = category.trim();
        if (icon !== undefined) game.icon = icon.trim();
        if (gameStatus && ["active", "inactive"].includes(gameStatus)) game.status = gameStatus;

        // Handle fields update
        if (Array.isArray(fields)) {
            const validTypes = ["email", "password", "phone", "number", "text"];
            game.fields = fields.filter(f => f.name && f.name.trim()).map(f => ({
                name: f.name.trim(),
                type: validTypes.includes(f.type) ? f.type : "text",
                required: f.required !== false,
                placeholder: f.placeholder?.trim() || "",
            }));
        }

        await game.save();

        try { await cacheService.invalidateGamesCache(); } catch (_) { }

        logger.info(`Admin updated game: ${game.name} (${game._id})`);
        res.json({ success: true, data: game, message: "Game updated successfully" });
    } catch (error) {
        logger.error(`Admin update game error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to update game" });
    }
};

/**
 * DELETE /api/v1/admin/games/:id
 */
export const deleteAdminGame = async (req, res) => {
    try {
        const { id } = req.params;

        const game = await Game.findById(id);
        if (!game) {
            return res.status(404).json({ success: false, message: "Game not found" });
        }

        // Check if there are listings using this game
        const listingCount = await Listing.countDocuments({ game: id });
        if (listingCount > 0) {
            return res.status(400).json({ success: false, message: `Cannot delete: ${listingCount} listings are using this game. Deactivate it instead.` });
        }

        await Game.findByIdAndDelete(id);

        try { await cacheService.invalidateGamesCache(); } catch (_) { }

        logger.info(`Admin deleted game: ${game.name} (${game._id})`);
        res.json({ success: true, message: "Game deleted successfully" });
    } catch (error) {
        logger.error(`Admin delete game error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to delete game" });
    }
};

/**
 * PUT /api/v1/admin/games/:id/toggle-status
 */
export const toggleAdminGameStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const game = await Game.findById(id);
        if (!game) {
            return res.status(404).json({ success: false, message: "Game not found" });
        }

        game.status = game.status === "active" ? "inactive" : "active";
        await game.save();

        try { await cacheService.invalidateGamesCache(); } catch (_) { }

        logger.info(`Admin toggled game ${game.name} to ${game.status}`);
        res.json({ success: true, data: game, message: `Game ${game.status === "active" ? "activated" : "deactivated"} successfully` });
    } catch (error) {
        logger.error(`Admin toggle game status error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to toggle game status" });
    }
};

/* ============================================================================
 * INSTANT PAYOUT RELEASE — Admin Force-Release Pending Payouts
 * ========================================================================= */

/**
 * POST /api/v1/admin/transactions/:id/instant-release
 * Force-release a pending_payout transaction immediately, crediting the seller.
 */
export const adminInstantRelease = async (req, res) => {
    try {
        const { id } = req.params;
        const tx = await Transaction.findById(id);

        if (!tx) {
            return res.status(404).json({ success: false, message: "Transaction not found" });
        }
        if (tx.payoutStatus !== "pending_payout") {
            return res.status(400).json({ success: false, message: `Cannot release — current payout status is "${tx.payoutStatus}"` });
        }

        const sellerId = tx.seller.toString();
        const sellerNetAmount = tx.sellerNetAmount || tx.amount;

        // Credit seller wallet
        const updatedSeller = await User.findByIdAndUpdate(
            sellerId,
            { $inc: { "wallet.balance": sellerNetAmount } },
            { new: true }
        );

        if (updatedSeller) {
            cacheService.cacheUser?.(updatedSeller)?.catch(() => { });
        }

        // Update transaction
        tx.payoutStatus = "paid_out";
        tx.paidOutAt = new Date();
        tx.timeline.push({
            event: "instant_release",
            note: `Admin force-released ${sellerNetAmount} EGP to seller wallet immediately (skipped hold period).`,
        });
        await tx.save();

        try {
            await AuditLog.create({
                admin: req.user._id,
                performedBy: req.user._id,
                category: "user_management",
                action: "wallet_instant_release",
                targetModel: "Transaction",
                targetId: tx._id,
                targetUser: sellerId,
                details: {
                    transactionId: tx._id.toString(),
                    sellerId,
                    amountReleased: sellerNetAmount,
                    previousPayoutStatus: "pending_payout",
                    newPayoutStatus: "paid_out",
                },
                metadata: {
                    transactionId: tx._id.toString(),
                    sellerId,
                    amountReleased: sellerNetAmount,
                },
                ip: req.ip,
                userAgent: req.get("User-Agent"),
                timestamp: new Date(),
            });
        } catch (auditErr) {
            logger.error(`AuditLog failed for instant_release tx ${tx._id}: ${auditErr.message}`);
        }

        logger.info(`Admin instant-released tx ${tx._id} — ${sellerNetAmount} EGP to seller ${sellerId}`);

        // Best-effort notification
        try {
            const Notification = (await import("../notifications/notification.model.js")).default;
            await Notification.create({
                user: sellerId,
                type: "payout_released",
                title: "💰 Instant Payment Released!",
                message: `${sellerNetAmount} EGP has been credited to your wallet (admin instant release).`,
                relatedModel: "Transaction",
                relatedId: tx._id,
                metadata: { transactionId: tx._id.toString(), amount: sellerNetAmount },
            });
        } catch (_) { /* non-fatal */ }

        res.json({
            success: true,
            message: `${sellerNetAmount} EGP released to seller immediately.`,
            data: tx,
        });
    } catch (error) {
        logger.error(`Admin instant release error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to release payout" });
    }
};

/* ============================================================================
 * COMMISSION EXEMPTION — Toggle & List Exempt Sellers
 * ========================================================================= */

/**
 * PUT /api/v1/admin/users/:userId/commission-exempt
 * Toggle the commissionExempt flag on a user.
 */
export const toggleCommissionExempt = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        user.commissionExempt = !user.commissionExempt;
        await user.save();

        // Sync cache
        cacheService.cacheUser?.(user)?.catch(() => { });

        logger.info(`Admin toggled commission exemption for ${user.username}: ${user.commissionExempt ? "EXEMPT" : "NORMAL"}`);
        res.json({
            success: true,
            message: `${user.username} is now ${user.commissionExempt ? "exempt from" : "subject to"} commission.`,
            data: { _id: user._id, username: user.username, commissionExempt: user.commissionExempt },
        });
    } catch (error) {
        logger.error(`Admin toggle commission exempt error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to toggle commission exemption" });
    }
};

/**
 * GET /api/v1/admin/exempt-sellers
 * List all sellers with commission exemption (also supports search).
 */
export const getExemptSellers = async (req, res) => {
    try {
        const { search = "" } = req.query;
        const filter = { isSeller: true };
        if (search) {
            filter.$or = [
                { username: { $regex: escapeRegex(search), $options: "i" } },
                { email: { $regex: escapeRegex(search), $options: "i" } },
            ];
        }

        const sellers = await User.find(filter)
            .select("_id username email avatar isSeller commissionExempt stats.totalVolume stats.successfulTrades")
            .sort({ commissionExempt: -1, username: 1 })
            .limit(100)
            .lean();

        res.json({ success: true, data: sellers });
    } catch (error) {
        logger.error(`Admin get exempt sellers error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to fetch sellers" });
    }
};

/* ================================================================
   MODERATOR MANAGEMENT
   ================================================================ */

/** Get all moderators with their permissions */
export const getModerators = async (req, res) => {
    try {
        const moderators = await User.find({ role: "moderator" })
            .select("_id username email avatar moderatorPermissions createdAt")
            .sort({ createdAt: -1 })
            .lean();

        // Strip any legacy admin-only keys ("users", "moderators") from returned data
        const ADMIN_ONLY = ["users", "moderators"];
        const cleanedModerators = moderators.map(m => ({
            ...m,
            moderatorPermissions: (m.moderatorPermissions || []).filter(p => !ADMIN_ONLY.includes(p))
        }));

        res.json({
            success: true,
            data: {
                moderators: cleanedModerators,
                availablePermissions: PERMISSION_KEYS
            }
        });
    } catch (error) {
        logger.error(`Get moderators error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to fetch moderators" });
    }
};

/** Update moderator permissions (moderator account must already exist) */
export const setModeratorPermissions = async (req, res) => {
    try {
        const { userId } = req.params;
        const { permissions } = req.body;

        if (!Array.isArray(permissions)) {
            return res.status(400).json({ success: false, message: "permissions must be an array" });
        }

        // Strip admin-only keys silently (defence-in-depth)
        const ADMIN_ONLY = ["users", "moderators"];
        const safePermissions = permissions.filter(p => !ADMIN_ONLY.includes(p));

        // validate all keys
        const invalid = safePermissions.filter(p => !PERMISSION_KEYS.includes(p));
        if (invalid.length) {
            return res.status(400).json({
                success: false,
                message: `Invalid permission keys: ${invalid.join(", ")}`
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Only allow updating permissions on existing moderators
        if (user.role !== "moderator") {
            return res.status(400).json({ success: false, message: "This user is not a moderator. Create a moderator account instead." });
        }

        user.moderatorPermissions = safePermissions;
        await user.save();
        await cacheService.invalidateUser(userId);

        logger.info(`Admin ${req.user.email} set moderator permissions for ${user.email}: [${safePermissions.join(", ")}]`);

        res.json({
            success: true,
            message: "Moderator permissions updated",
            data: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                moderatorPermissions: user.moderatorPermissions
            }
        });
    } catch (error) {
        logger.error(`Set moderator permissions error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to update permissions" });
    }
};

/** Remove moderator role – demote back to user */
export const removeModerator = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        if (user.role !== "moderator") {
            return res.status(400).json({ success: false, message: "User is not a moderator" });
        }

        user.role = "user";
        user.moderatorPermissions = [];
        await user.save();
        await cacheService.invalidateUser(userId);

        logger.info(`Admin ${req.user.email} removed moderator role from ${user.email}`);

        res.json({ success: true, message: "Moderator role removed" });
    } catch (error) {
        logger.error(`Remove moderator error: ${error.message}`);
        res.status(500).json({ success: false, message: "Failed to remove moderator" });
    }
};

/** Create a new moderator account (admin-only) */
export const createModerator = async (req, res) => {
    try {
        const { username, email, password, permissions = [] } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: "Username, email, and password are required" });
        }

        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: "Invalid email format" });
        }

        // Check for existing user with same email or username
        const existing = await User.findOne({
            $or: [{ email: email.toLowerCase() }, { username }]
        });
        if (existing) {
            const field = existing.email === email.toLowerCase() ? "email" : "username";
            return res.status(409).json({ success: false, message: `A user with this ${field} already exists` });
        }

        // Validate permission keys
        // Strip admin-only keys silently (defence-in-depth)
        const ADMIN_ONLY = ["users", "moderators"];
        const safePermissions = permissions.filter(p => !ADMIN_ONLY.includes(p));
        if (safePermissions.length > 0) {
            const invalid = safePermissions.filter(p => !PERMISSION_KEYS.includes(p));
            if (invalid.length) {
                return res.status(400).json({ success: false, message: `Invalid permission keys: ${invalid.join(", ")}` });
            }
        }

        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

        const moderator = await User.create({
            username,
            email: email.toLowerCase(),
            passwordHash,
            role: "moderator",
            verified: true,
            profileCompleted: true,
            moderatorPermissions: safePermissions,
        });

        logger.info(`Admin ${req.user.email} created moderator account: ${email}`);

        res.status(201).json({
            success: true,
            message: "Moderator account created successfully",
            data: {
                _id: moderator._id,
                username: moderator.username,
                email: moderator.email,
                role: moderator.role,
                moderatorPermissions: moderator.moderatorPermissions,
            }
        });
    } catch (error) {
        logger.error(`Create moderator error: ${error.message}`);
        // Return mongoose validation errors clearly
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0];
            return res.status(409).json({ success: false, message: `A user with this ${field} already exists` });
        }
        res.status(500).json({ success: false, message: "Failed to create moderator account" });
    }
};

/** Get current user's own permissions (for frontend sidebar filtering) */
export const getMyPermissions = async (req, res) => {
    try {
        const user = req.user;
        if (user.role === "admin") {
            // Admin gets ALL permission keys (they have full access anyway)
            return res.json({ success: true, data: { role: "admin", permissions: PERMISSION_KEYS } });
        }
        if (user.role === "moderator") {
            // Strip any legacy admin-only keys that may still be stored
            const ADMIN_ONLY = ["users", "moderators"];
            const cleanPerms = (user.moderatorPermissions || []).filter(p => !ADMIN_ONLY.includes(p));
            return res.json({
                success: true,
                data: { role: "moderator", permissions: cleanPerms }
            });
        }
        return res.status(403).json({ success: false, message: "Not an admin or moderator" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to get permissions" });
    }
};