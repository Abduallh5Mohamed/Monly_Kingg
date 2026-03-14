/**
 * Shared notification helpers used across controllers.
 * - createNotification : create a notification for a single user
 * - notifyAllAdmins    : broadcast a notification to every admin user
 */
import Notification from "./notification.model.js";
import User from "../users/user.model.js";

/**
 * Create a single notification for one user.
 */
export async function createNotification({
    userId,
    type,
    title,
    message,
    relatedModel,
    relatedId,
    metadata = {},
}) {
    try {
        await Notification.create({ user: userId, type, title, message, relatedModel, relatedId, metadata });
    } catch (err) {
        console.error("[notificationHelper] createNotification error:", err.message);
    }
}

/**
 * Create the same notification for every admin user.
 */
export async function notifyAllAdmins({
    type,
    title,
    message,
    relatedModel,
    relatedId,
    metadata = {},
}) {
    try {
        const admins = await User.find({ role: "admin" }, "_id").lean();
        if (!admins.length) return;
        await Notification.insertMany(
            admins.map((a) => ({ user: a._id, type, title, message, relatedModel, relatedId, metadata })),
            { ordered: false }
        );
    } catch (err) {
        console.error("[notificationHelper] notifyAllAdmins error:", err.message);
    }
}
