import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
        type: String,
        enum: [
            "seller_approved",
            "seller_rejected",
            "listing_sold",
            "new_message",
            "system",
            // Transaction flow
            "purchase_initiated",       // seller: someone bought your listing
            "credentials_sent",         // buyer:  seller sent credentials
            "purchase_confirmed",       // seller: buyer confirmed
            "purchase_disputed",        // admin:  buyer opened dispute
            "dispute_resolved",         // buyer/seller: admin resolved dispute
            "auto_confirmed",           // seller: auto-confirmed after 48h
            "level_up",                 // seller: leveled up
            // Admin alerts
            "new_deposit_request",      // admin: user submitted a deposit
            "new_withdrawal_request",   // admin: user requested a withdrawal
            "new_seller_request",       // admin: user applied to become a seller
            "new_dispute",              // admin: buyer opened a dispute
            // User wallet feedback
            "deposit_approved",         // user: their deposit was approved
            "deposit_rejected",         // user: their deposit was rejected
            "withdrawal_approved",      // user: their withdrawal was approved
            "withdrawal_rejected",      // user: their withdrawal was rejected
            // Rating / comment penalties
            "comment_penalty",          // user: banned from commenting due to profanity
        ],
        required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    relatedModel: { type: String },
    relatedId: { type: mongoose.Schema.Types.ObjectId },
    metadata: { type: Object },
}, { timestamps: true });

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
