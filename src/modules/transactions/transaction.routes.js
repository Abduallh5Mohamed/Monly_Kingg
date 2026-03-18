import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requireAdmin, requireAdminOrMod, requirePermission } from "../../middlewares/roleMiddleware.js";
import { validateObjectId } from "../../middlewares/validateObjectId.js";
// SECURITY FIX [VULN-H02]: Import rate limiters for financial transaction endpoints.
import { depositLimiter, userWriteLimiter, adminLimiter } from "../../middlewares/rateLimiter.js";
import * as txController from "./transaction.controller.js";

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

// Buyer: initiate a purchase
// SECURITY FIX [VULN-H02]: Apply rate limiting to prevent spam purchases.
router.post("/", userWriteLimiter, txController.createTransaction);

// Seller: submit account credentials
router.post("/:id/credentials", validateObjectId(), userWriteLimiter, txController.submitCredentials);

// Buyer: confirm receipt → release funds to seller
router.post("/:id/confirm", validateObjectId(), userWriteLimiter, txController.confirmReceived);

// Buyer: open a dispute
router.post("/:id/dispute", validateObjectId(), depositLimiter, txController.openDispute);

// Admin: resolve dispute (refund or release)
router.post("/:id/resolve", validateObjectId(), requireAdminOrMod, requirePermission("orders"), adminLimiter, txController.adminResolveDispute);

// Pending count for bottom navbar badge
router.get("/pending-count", txController.getPendingCount);

// My transactions list
router.get("/mine", txController.getMyTransactions);

// Admin / Moderator: all transactions
router.get("/admin/all", requireAdminOrMod, requirePermission("orders"), txController.adminGetAll);

// Admin / Moderator: single transaction detail (with seller ID info)
router.get("/admin/:id", validateObjectId(), requireAdminOrMod, requirePermission("orders"), txController.adminGetTransactionDetail);

// Single transaction (buyer, seller, or admin)
router.get("/:id", validateObjectId(), txController.getTransactionById);

export default router;
