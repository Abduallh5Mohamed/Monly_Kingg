import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requireAdmin } from "../../middlewares/roleMiddleware.js";
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

// Admin routes
router.get("/all", authMiddleware, requireAdmin, adminLimiter, getAllWithdrawals);
router.put("/:id/approve", authMiddleware, requireAdmin, adminLimiter, approveWithdrawal);
router.put("/:id/reject", authMiddleware, requireAdmin, adminLimiter, rejectWithdrawal);

export default router;
