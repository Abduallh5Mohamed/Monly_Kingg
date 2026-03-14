import express from "express";
import {
  getSecurityOverview,
  getAllSessions,
  terminateSession,
  forceLogoutUser,
  terminateAllSessions,
  getBlockedIPs,
  blockIP,
  unblockIP,
  getLoginAttempts,
  blockIPFromAttempts,
  flagSuspicious,
  getSecurityAlerts,
  resolveAlert,
  testWebhook,
  getAuditLogs,
  getSecuritySettings,
  updateSecuritySettings
} from "./security.controller.js";

const router = express.Router();

// 1. Overview
router.get("/overview", getSecurityOverview);

// 2. Session Management
router.get("/sessions", getAllSessions);
router.post("/sessions/:userId/terminate", terminateSession);
router.post("/sessions/:userId/force-logout", forceLogoutUser);
router.post("/sessions/terminate-all", terminateAllSessions);

// 3. IP Security
router.get("/blocked-ips", getBlockedIPs);
router.post("/blocked-ips", blockIP);
router.delete("/blocked-ips/:id", unblockIP);

// 4. Login Attempts
router.get("/login-attempts", getLoginAttempts);
router.post("/login-attempts/:ip/block", blockIPFromAttempts);
router.post("/login-attempts/:ip/flag", flagSuspicious);

// 5. Alerts
router.get("/alerts", getSecurityAlerts);
router.post("/alerts/:id/resolve", resolveAlert);
router.post("/alerts/test-webhook", testWebhook);

// 6. Audit Logs
router.get("/audit-logs", getAuditLogs);

// 7. Security Settings
router.get("/settings", getSecuritySettings);
router.put("/settings", updateSecuritySettings);

export default router;
