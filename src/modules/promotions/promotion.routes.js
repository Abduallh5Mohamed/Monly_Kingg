import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requireAdmin } from "../../middlewares/roleMiddleware.js";
import { sellerRequestLimiter, adminLimiter } from "../../middlewares/rateLimiter.js";
import { invalidateCache } from "../../middlewares/apiCacheMiddleware.js";
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

// Approving/rejecting a promotion changes listing featured status — bust listing cache
const PROMO_PATTERNS = ['api_cache:*:/api/v1/promotions*', 'api_cache:*:/api/v1/listings*'];

// Seller routes
router.post("/request", authMiddleware, sellerRequestLimiter, submitPromotion);
router.get("/my-requests", authMiddleware, getMyPromotions);
router.get("/pricing", authMiddleware, getPromotionPricing);

// Admin routes
router.get("/all", authMiddleware, requireAdmin, adminLimiter, getAllPromotions);
router.get("/stats", authMiddleware, requireAdmin, adminLimiter, getPromotionStats);
router.put("/:id/approve", authMiddleware, requireAdmin, adminLimiter, invalidateCache(...PROMO_PATTERNS), approvePromotion);
router.put("/:id/reject", authMiddleware, requireAdmin, adminLimiter, invalidateCache(...PROMO_PATTERNS), rejectPromotion);

export default router;
