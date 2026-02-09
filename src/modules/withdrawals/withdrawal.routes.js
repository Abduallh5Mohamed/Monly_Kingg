import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requireAdmin } from "../../middlewares/roleMiddleware.js";
import {
  submitWithdrawal,
  getMyWithdrawals,
  getAllWithdrawals,
  approveWithdrawal,
  rejectWithdrawal,
} from "./withdrawal.controller.js";

const router = express.Router();

// User routes
router.post("/request", authMiddleware, submitWithdrawal);
router.get("/my-requests", authMiddleware, getMyWithdrawals);

// Admin routes
router.get("/all", authMiddleware, requireAdmin, getAllWithdrawals);
router.put("/:id/approve", authMiddleware, requireAdmin, approveWithdrawal);
router.put("/:id/reject", authMiddleware, requireAdmin, rejectWithdrawal);

export default router;
