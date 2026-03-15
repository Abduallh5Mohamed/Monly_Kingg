import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requireAdmin, requireAdminOrMod, requirePermission } from "../../middlewares/roleMiddleware.js";
import { validateObjectId } from "../../middlewares/validateObjectId.js";
import { withdrawalLimiter, adminLimiter } from "../../middlewares/rateLimiter.js";
import {
  submitWithdrawal,
  getMyWithdrawals,
  getAllWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
} from "./withdrawal.controller.js";

const router = express.Router();

// User routes
router.post("/request", authMiddleware, withdrawalLimiter, submitWithdrawal);
router.get("/my-requests", authMiddleware, getMyWithdrawals);

// Admin / Moderator routes (requires "orders" permission)
router.get("/all", authMiddleware, requireAdminOrMod, requirePermission("orders"), adminLimiter, getAllWithdrawals);
router.put("/:id/approve", validateObjectId(), authMiddleware, requireAdminOrMod, requirePermission("orders"), adminLimiter, approveWithdrawal);
router.put("/:id/reject", validateObjectId(), authMiddleware, requireAdminOrMod, requirePermission("orders"), adminLimiter, rejectWithdrawal);

export default router;
