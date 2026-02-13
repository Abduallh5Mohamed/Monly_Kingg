import Notification from "./notification.model.js";

// Get user's notifications (paginated)
export const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 20 } = req.query;

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find({ user: userId })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(Number(limit))
                .lean(),
            Notification.countDocuments({ user: userId }),
            Notification.countDocuments({ user: userId, read: false }),
        ]);

        return res.status(200).json({
            data: notifications,
            total,
            unreadCount,
            page: Number(page),
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error("Get notifications error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// Get unread count only (lightweight)
export const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.countDocuments({ user: req.user._id, read: false });
        return res.status(200).json({ unreadCount: count });
    } catch (error) {
        console.error("Get unread count error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// Mark single notification as read
export const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        await Notification.findOneAndUpdate(
            { _id: notificationId, user: req.user._id },
            { read: true }
        );
        return res.status(200).json({ message: "Marked as read" });
    } catch (error) {
        console.error("Mark as read error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user._id, read: false },
            { read: true }
        );
        return res.status(200).json({ message: "All marked as read" });
    } catch (error) {
        console.error("Mark all as read error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};
