import User from "../users/user.model.js";
import Chat from "../chats/chat.model.js";
import logger from "../../utils/logger.js";
import userCacheService from "../../services/userCacheService.js";

/* ---------------- Get All Users ---------------- */
export const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "", role = "all" } = req.query;

        // Build filter
        const filter = {};
        if (search) {
            filter.$or = [
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
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

        if (!["user", "admin", "moderator"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role"
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
        await userCacheService.removeUser(userId);

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
        await userCacheService.removeUser(userId);

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
        await userCacheService.removeUser(userId);

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
                const users = await User.find({
                    $or: [
                        { email: { $regex: search, $options: 'i' } },
                        { username: { $regex: search, $options: 'i' } }
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
            .populate('messages.sender', 'username email avatar role')
            .lean();

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: "Chat not found"
            });
        }

        // Paginate messages
        const allMessages = chat.messages || [];
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