import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requireAdmin, requireAdminOrMod, requirePermission } from "../../middlewares/roleMiddleware.js";
import * as txController from "./transaction.controller.js";

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

// Buyer: initiate a purchase
router.post("/", txController.createTransaction);

// Seller: submit account credentials
router.post("/:id/credentials", txController.submitCredentials);

// Buyer: confirm receipt → release funds to seller
router.post("/:id/confirm", txController.confirmReceived);

// Buyer: open a dispute
router.post("/:id/dispute", txController.openDispute);

// Admin: resolve dispute (refund or release)
router.post("/:id/resolve", requireAdminOrMod, requirePermission("orders"), txController.adminResolveDispute);

// Pending count for bottom navbar badge
router.get("/pending-count", txController.getPendingCount);

// My transactions list
router.get("/mine", txController.getMyTransactions);

// Admin / Moderator: all transactions
router.get("/admin/all", requireAdminOrMod, requirePermission("orders"), txController.adminGetAll);

// Admin / Moderator: single transaction detail (with seller ID info)
router.get("/admin/:id", requireAdminOrMod, requirePermission("orders"), txController.adminGetTransactionDetail);

// Single transaction (buyer, seller, or admin)
router.get("/:id", txController.getTransactionById);

export default router;
