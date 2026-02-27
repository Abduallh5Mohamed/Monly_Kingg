import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requireAdmin } from "../../middlewares/roleMiddleware.js";
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
router.post("/:id/resolve", requireAdmin, txController.adminResolveDispute);

// Pending count for bottom navbar badge
router.get("/pending-count", txController.getPendingCount);

// My transactions list
router.get("/mine", txController.getMyTransactions);

// Admin: all transactions
router.get("/admin/all", requireAdmin, txController.adminGetAll);

// Single transaction (buyer, seller, or admin)
router.get("/:id", txController.getTransactionById);

export default router;
