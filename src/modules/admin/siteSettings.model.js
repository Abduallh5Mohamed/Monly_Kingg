import mongoose from "mongoose";

/**
 * Site-wide settings — singleton document.
 * Always fetched via SiteSettings.getSingleton() which creates it
 * with defaults if it doesn't exist yet.
 */
const siteSettingsSchema = new mongoose.Schema({
    // ── Platform Information ────────────────────────────────────────────────────
    siteName: { type: String, default: "Monly King" },
    siteUrl: { type: String, default: "https://monlyking.com" },
    siteDescription: { type: String, default: "Premium gaming accounts marketplace" },
    supportEmail: { type: String, default: "support@monlyking.com" },
    supportPhone: { type: String, default: "+20 123 456 7890" },

    // ── System Settings ────────────────────────────────────────────────────────
    maintenanceMode: { type: Boolean, default: false },
    autoBackup: { type: Boolean, default: true },
    userRegistration: { type: Boolean, default: true },

    // ── Notification Settings ──────────────────────────────────────────────────
    orderNotifications: { type: Boolean, default: true },
    userRegNotifications: { type: Boolean, default: true },
    marketingEmails: { type: Boolean, default: false },
    browserNotifications: { type: Boolean, default: true },
    chatNotifications: { type: Boolean, default: true },

    // ── Security Settings ──────────────────────────────────────────────────────
    twoFactorAuth: { type: Boolean, default: false },
    sessionTimeout: { type: Boolean, default: true },

    // Rate Limiting
    rateLimitMaxRequests: { type: Number, default: 100, min: 10, max: 10000 },
    rateLimitWindowMinutes: { type: Number, default: 15, min: 1, max: 60 },

    // Password Policy
    passwordMinLength: { type: Number, default: 8, min: 6, max: 32 },
    passwordRequireUppercase: { type: Boolean, default: true },
    passwordRequireNumbers: { type: Boolean, default: true },
    passwordRequireSpecial: { type: Boolean, default: false },

    // 2FA Enforcement
    twoFactorEnforcement: { type: String, enum: ["disabled", "optional", "required"], default: "optional" },

    // Session Management
    sessionExpirationHours: { type: Number, default: 24, min: 1, max: 720 },
    maxActiveSessions: { type: Number, default: 5, min: 1, max: 20 },

    // Alert Webhooks
    alertEmail: { type: String, default: "" },
    alertTelegramBotToken: { type: String, default: "" },
    alertTelegramChatId: { type: String, default: "" },
    alertDiscordWebhookUrl: { type: String, default: "" },

    // ── Commission ─────────────────────────────────────────────────────────────
    commissionPercent: { type: Number, default: 10, min: 0, max: 100 },

    // ── Seller payout delay ────────────────────────────────────────────────────
    sellerPayoutDelayDays: { type: Number, default: 7, min: 0, max: 90 },

    // ── Admin accumulated commission balance ───────────────────────────────────
    adminCommissionBalance: { type: Number, default: 0 },

    // ── Audit ──────────────────────────────────────────────────────────────────
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

/**
 * Get the singleton settings document, creating one with defaults if needed.
 */
siteSettingsSchema.statics.getSingleton = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

export default mongoose.model("SiteSettings", siteSettingsSchema);
