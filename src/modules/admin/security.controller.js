import User from "../users/user.model.js";
import SecurityEvent from "./securityEvent.model.js";
import BlockedIP from "./blockedIP.model.js";
import AuditLog from "./auditLog.model.js";
import SiteSettings from "./siteSettings.model.js";
import logger from "../../utils/logger.js";
import mongoose from "mongoose";
import escapeRegex from "../../utils/escapeRegex.js";

/* ============================================================================
 * HELPER: Create Audit Log
 * ========================================================================= */
async function createAuditLog(data) {
  try {
    await AuditLog.create(data);
  } catch (err) {
    logger.error(`Failed to create audit log: ${err.message}`);
  }
}

/* ============================================================================
 * 1. SECURITY OVERVIEW
 * ========================================================================= */
export const getSecurityOverview = async (req, res) => {
  try {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Blocked attacks in last 24 hours
    const blockedAttacks = await SecurityEvent.countDocuments({
      status: "blocked",
      createdAt: { $gte: last24h }
    });

    // Active sessions (non-revoked, non-expired refresh tokens across all users)
    const activeSessionsAgg = await User.aggregate([
      { $unwind: "$refreshTokens" },
      {
        $match: {
          "refreshTokens.revoked": false,
          "refreshTokens.expiresAt": { $gt: new Date() }
        }
      },
      { $count: "total" }
    ]);
    const activeSessions = activeSessionsAgg[0]?.total || 0;

    // Blocked IPs count
    const blockedIPsCount = await BlockedIP.countDocuments({ type: "blocked" });

    // Recent alerts (unresolved)
    const recentAlerts = await SecurityEvent.find({
      status: { $in: ["blocked", "flagged"] },
      resolved: false
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Security score calculation
    const settings = await SiteSettings.getSingleton();
    let score = 50;
    if (settings.twoFactorAuth) score += 10;
    if (settings.twoFactorEnforcement === "required") score += 10;
    if (settings.sessionTimeout) score += 5;
    if (settings.passwordRequireUppercase) score += 5;
    if (settings.passwordRequireNumbers) score += 5;
    if (settings.passwordRequireSpecial) score += 5;
    if (settings.passwordMinLength >= 10) score += 5;
    if (blockedIPsCount > 0) score += 5;
    score = Math.min(score, 100);

    res.json({
      success: true,
      data: {
        securityScore: score,
        blockedAttacks,
        activeSessions,
        blockedIPsCount,
        recentAlerts
      }
    });
  } catch (error) {
    logger.error(`Security overview error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to fetch security overview" });
  }
};

/* ============================================================================
 * 2. SESSION MANAGEMENT
 * ========================================================================= */
export const getAllSessions = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const users = await User.aggregate([
      { $unwind: "$refreshTokens" },
      {
        $match: {
          "refreshTokens.revoked": false,
          "refreshTokens.expiresAt": { $gt: new Date() }
        }
      },
      {
        $project: {
          username: 1,
          email: 1,
          avatar: 1,
          role: 1,
          ip: "$refreshTokens.ip",
          userAgent: "$refreshTokens.userAgent",
          loginTime: "$refreshTokens.createdAt",
          expiresAt: "$refreshTokens.expiresAt"
        }
      },
      { $sort: { loginTime: -1 } },
      {
        $facet: {
          sessions: [{ $skip: skip }, { $limit: parseInt(limit) }],
          total: [{ $count: "count" }]
        }
      }
    ]);

    const sessions = users[0]?.sessions || [];
    const total = users[0]?.total[0]?.count || 0;

    res.json({
      success: true,
      data: {
        sessions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          total,
          hasNext: page * limit < total
        }
      }
    });
  } catch (error) {
    logger.error(`Get sessions error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to fetch sessions" });
  }
};

export const terminateSession = async (req, res) => {
  try {
    const { userId } = req.params;
    const { sessionIp, sessionCreatedAt } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Find and revoke the specific session
    const token = user.refreshTokens.find(
      rt => !rt.revoked && rt.ip === sessionIp && new Date(rt.createdAt).getTime() === new Date(sessionCreatedAt).getTime()
    );

    if (token) {
      token.revoked = true;
      token.revokedAt = new Date();
      await user.save();
    }

    await createAuditLog({
      action: "terminate_session",
      category: "session",
      performedBy: req.user._id,
      targetUser: userId,
      details: `Terminated session from IP ${sessionIp}`,
      ip: req.ip
    });

    res.json({ success: true, message: "Session terminated" });
  } catch (error) {
    logger.error(`Terminate session error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to terminate session" });
  }
};

export const forceLogoutUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Revoke all refresh tokens
    user.refreshTokens.forEach(rt => {
      if (!rt.revoked) {
        rt.revoked = true;
        rt.revokedAt = new Date();
      }
    });
    await user.save();

    await createAuditLog({
      action: "force_logout_user",
      category: "session",
      performedBy: req.user._id,
      targetUser: userId,
      details: `Force logged out user ${user.username}`,
      ip: req.ip
    });

    res.json({ success: true, message: `Force logged out ${user.username}` });
  } catch (error) {
    logger.error(`Force logout error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to force logout" });
  }
};

export const terminateAllSessions = async (req, res) => {
  try {
    // Revoke all refresh tokens for all users
    await User.updateMany(
      { "refreshTokens.revoked": false },
      { $set: { "refreshTokens.$[elem].revoked": true, "refreshTokens.$[elem].revokedAt": new Date() } },
      { arrayFilters: [{ "elem.revoked": false }] }
    );

    await createAuditLog({
      action: "terminate_all_sessions",
      category: "session",
      performedBy: req.user._id,
      details: "Terminated all active sessions platform-wide",
      ip: req.ip
    });

    res.json({ success: true, message: "All sessions terminated" });
  } catch (error) {
    logger.error(`Terminate all sessions error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to terminate all sessions" });
  }
};

/* ============================================================================
 * 3. IP SECURITY MANAGEMENT
 * ========================================================================= */
export const getBlockedIPs = async (req, res) => {
  try {
    const { page = 1, limit = 20, type = "all" } = req.query;
    const skip = (page - 1) * limit;
    const filter = {};
    if (type !== "all") filter.type = type;

    const [ips, total] = await Promise.all([
      BlockedIP.find(filter)
        .populate("blockedBy", "username email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      BlockedIP.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        ips,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    logger.error(`Get blocked IPs error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to fetch blocked IPs" });
  }
};

export const blockIP = async (req, res) => {
  try {
    const { ip, ipRangeStart, ipRangeEnd, type = "blocked", reason = "" } = req.body;

    if (!ip && !ipRangeStart) {
      return res.status(400).json({ success: false, message: "IP or IP range is required" });
    }

    // Check if already exists
    if (ip) {
      const existing = await BlockedIP.findOne({ ip, type });
      if (existing) return res.status(400).json({ success: false, message: `IP already ${type}` });
    }

    const entry = await BlockedIP.create({
      ip: ip || null,
      ipRangeStart: ipRangeStart || null,
      ipRangeEnd: ipRangeEnd || null,
      type,
      reason,
      blockedBy: req.user._id
    });

    await createAuditLog({
      action: type === "whitelisted" ? "whitelist_ip" : "block_ip",
      category: "ip_management",
      performedBy: req.user._id,
      details: `${type === "whitelisted" ? "Whitelisted" : "Blocked"} IP: ${ip || `${ipRangeStart}-${ipRangeEnd}`}. Reason: ${reason}`,
      ip: req.ip
    });

    res.json({ success: true, message: `IP ${type} successfully`, data: entry });
  } catch (error) {
    logger.error(`Block IP error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to block IP" });
  }
};

export const unblockIP = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await BlockedIP.findById(id);
    if (!entry) return res.status(404).json({ success: false, message: "IP entry not found" });

    const ipInfo = entry.ip || `${entry.ipRangeStart}-${entry.ipRangeEnd}`;
    await BlockedIP.findByIdAndDelete(id);

    await createAuditLog({
      action: "unblock_ip",
      category: "ip_management",
      performedBy: req.user._id,
      details: `Unblocked IP: ${ipInfo}`,
      ip: req.ip
    });

    res.json({ success: true, message: "IP unblocked" });
  } catch (error) {
    logger.error(`Unblock IP error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to unblock IP" });
  }
};

/* ============================================================================
 * 4. LOGIN ATTEMPTS MONITOR
 * ========================================================================= */
export const getLoginAttempts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      SecurityEvent.find({ type: { $in: ["login_attempt", "brute_force", "too_many_failed"] } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      SecurityEvent.countDocuments({ type: { $in: ["login_attempt", "brute_force", "too_many_failed"] } })
    ]);

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    logger.error(`Login attempts error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to fetch login attempts" });
  }
};

export const blockIPFromAttempts = async (req, res) => {
  try {
    const { ip } = req.params;

    const existing = await BlockedIP.findOne({ ip, type: "blocked" });
    if (existing) return res.status(400).json({ success: false, message: "IP already blocked" });

    // Count attempts
    const attempts = await SecurityEvent.countDocuments({ ip });

    await BlockedIP.create({
      ip,
      type: "blocked",
      reason: "Blocked from login attempts monitor",
      attempts,
      blockedBy: req.user._id
    });

    // Update security events for this IP
    await SecurityEvent.updateMany({ ip }, { $set: { status: "blocked" } });

    await createAuditLog({
      action: "block_ip_from_attempts",
      category: "ip_management",
      performedBy: req.user._id,
      details: `Blocked IP ${ip} from login attempts monitor (${attempts} attempts)`,
      ip: req.ip
    });

    res.json({ success: true, message: "IP blocked" });
  } catch (error) {
    logger.error(`Block IP from attempts error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to block IP" });
  }
};

export const flagSuspicious = async (req, res) => {
  try {
    const { ip } = req.params;

    await SecurityEvent.updateMany(
      { ip, status: "allowed" },
      { $set: { status: "flagged" } }
    );

    await createAuditLog({
      action: "flag_suspicious",
      category: "security",
      performedBy: req.user._id,
      details: `Flagged IP ${ip} as suspicious`,
      ip: req.ip
    });

    res.json({ success: true, message: "Activity flagged as suspicious" });
  } catch (error) {
    logger.error(`Flag suspicious error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to flag activity" });
  }
};

/* ============================================================================
 * 5. SECURITY ALERTS
 * ========================================================================= */
export const getSecurityAlerts = async (req, res) => {
  try {
    const { page = 1, limit = 20, resolved = "false" } = req.query;
    const skip = (page - 1) * limit;
    const filter = {
      status: { $in: ["blocked", "flagged"] }
    };
    if (resolved === "false") filter.resolved = false;

    const [alerts, total] = await Promise.all([
      SecurityEvent.find(filter)
        .populate("resolvedBy", "username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      SecurityEvent.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        alerts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    logger.error(`Security alerts error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to fetch alerts" });
  }
};

export const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await SecurityEvent.findByIdAndUpdate(id, {
      resolved: true,
      resolvedBy: req.user._id,
      resolvedAt: new Date()
    }, { new: true });

    if (!event) return res.status(404).json({ success: false, message: "Alert not found" });

    await createAuditLog({
      action: "resolve_alert",
      category: "security",
      performedBy: req.user._id,
      details: `Resolved security alert: ${event.type} from IP ${event.ip}`,
      ip: req.ip
    });

    res.json({ success: true, message: "Alert resolved", data: event });
  } catch (error) {
    logger.error(`Resolve alert error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to resolve alert" });
  }
};

export const testWebhook = async (req, res) => {
  try {
    const { type } = req.body; // email, telegram, discord
    const settings = await SiteSettings.getSingleton();

    let result = { sent: false, message: "" };

    if (type === "discord" && settings.alertDiscordWebhookUrl) {
      try {
        const response = await fetch(settings.alertDiscordWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: "🔐 **Security Alert Test** — This is a test message from Monly King Security System.",
            embeds: [{
              title: "Test Security Alert",
              description: "If you received this, your Discord webhook is configured correctly.",
              color: 0x7C3AED,
              timestamp: new Date().toISOString()
            }]
          })
        });
        result = { sent: response.ok, message: response.ok ? "Discord test sent!" : "Failed to send" };
      } catch (err) {
        result = { sent: false, message: err.message };
      }
    } else if (type === "telegram" && settings.alertTelegramBotToken && settings.alertTelegramChatId) {
      try {
        const url = `https://api.telegram.org/bot${settings.alertTelegramBotToken}/sendMessage`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: settings.alertTelegramChatId,
            text: "🔐 *Security Alert Test*\n\nThis is a test message from Monly King Security System.",
            parse_mode: "Markdown"
          })
        });
        const data = await response.json();
        result = { sent: data.ok, message: data.ok ? "Telegram test sent!" : (data.description || "Failed") };
      } catch (err) {
        result = { sent: false, message: err.message };
      }
    } else if (type === "email") {
      result = { sent: false, message: "Email alerts require SMTP configuration" };
    } else {
      result = { sent: false, message: `${type} webhook not configured` };
    }

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error(`Test webhook error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to test webhook" });
  }
};

/* ============================================================================
 * 6. AUDIT LOGS
 * ========================================================================= */
export const getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, category = "all", search = "" } = req.query;
    const skip = (page - 1) * limit;
    const filter = {};

    if (category !== "all") filter.category = category;
    if (search) {
      const safeSearch = escapeRegex(String(search).trim().slice(0, 100));
      filter.$or = [
        { action: { $regex: safeSearch, $options: "i" } },
        { details: { $regex: safeSearch, $options: "i" } }
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("performedBy", "username email")
        .populate("targetUser", "username email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    logger.error(`Audit logs error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to fetch audit logs" });
  }
};

/* ============================================================================
 * 7. SECURITY SETTINGS
 * ========================================================================= */
export const getSecuritySettings = async (req, res) => {
  try {
    const settings = await SiteSettings.getSingleton();
    res.json({
      success: true,
      data: {
        rateLimitMaxRequests: settings.rateLimitMaxRequests,
        rateLimitWindowMinutes: settings.rateLimitWindowMinutes,
        passwordMinLength: settings.passwordMinLength,
        passwordRequireUppercase: settings.passwordRequireUppercase,
        passwordRequireNumbers: settings.passwordRequireNumbers,
        passwordRequireSpecial: settings.passwordRequireSpecial,
        twoFactorEnforcement: settings.twoFactorEnforcement,
        sessionExpirationHours: settings.sessionExpirationHours,
        maxActiveSessions: settings.maxActiveSessions,
        alertEmail: settings.alertEmail,
        alertTelegramBotToken: settings.alertTelegramBotToken ? "••••••••" : "",
        alertTelegramChatId: settings.alertTelegramChatId,
        alertDiscordWebhookUrl: settings.alertDiscordWebhookUrl ? "••••••••" : ""
      }
    });
  } catch (error) {
    logger.error(`Get security settings error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to fetch security settings" });
  }
};

export const updateSecuritySettings = async (req, res) => {
  try {
    const allowed = [
      "rateLimitMaxRequests", "rateLimitWindowMinutes",
      "passwordMinLength", "passwordRequireUppercase", "passwordRequireNumbers", "passwordRequireSpecial",
      "twoFactorEnforcement",
      "sessionExpirationHours", "maxActiveSessions",
      "alertEmail", "alertTelegramBotToken", "alertTelegramChatId", "alertDiscordWebhookUrl"
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    updates.lastUpdatedBy = req.user._id;

    const settings = await SiteSettings.findOneAndUpdate({}, { $set: updates }, { new: true });

    await createAuditLog({
      action: "update_security_settings",
      category: "settings",
      performedBy: req.user._id,
      details: `Updated security settings: ${Object.keys(updates).filter(k => k !== "lastUpdatedBy").join(", ")}`,
      ip: req.ip
    });

    res.json({ success: true, message: "Security settings updated", data: settings });
  } catch (error) {
    logger.error(`Update security settings error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to update security settings" });
  }
};
