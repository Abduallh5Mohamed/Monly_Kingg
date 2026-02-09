import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requireAdmin } from "../../middlewares/roleMiddleware.js";
import {
  submitPromotion,
  getMyPromotions,
  getPromotionPricing,
  getAllPromotions,
  approvePromotion,
  rejectPromotion,
  getPromotionStats,
} from "./promotion.controller.js";

const router = express.Router();

// Seller routes
router.post("/request", authMiddleware, submitPromotion);
router.get("/my-requests", authMiddleware, getMyPromotions);
router.get("/pricing", authMiddleware, getPromotionPricing);

// Admin routes
router.get("/all", authMiddleware, requireAdmin, getAllPromotions);
router.get("/stats", authMiddleware, requireAdmin, getPromotionStats);
router.put("/:id/approve", authMiddleware, requireAdmin, approvePromotion);
router.put("/:id/reject", authMiddleware, requireAdmin, rejectPromotion);

export default router;
