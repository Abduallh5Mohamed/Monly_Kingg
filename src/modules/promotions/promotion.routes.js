import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requireAdmin, requireAdminOrMod, requirePermission } from "../../middlewares/roleMiddleware.js";
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
router.post("/", authMiddleware, sellerRequestLimiter, submitPromotion);
router.post("/request", authMiddleware, sellerRequestLimiter, submitPromotion);
router.get("/my-requests", authMiddleware, getMyPromotions);
router.get("/pricing", authMiddleware, getPromotionPricing);

// Admin / Moderator routes (requires "promotions" permission)
router.get("/all", authMiddleware, requireAdminOrMod, requirePermission("promotions"), adminLimiter, getAllPromotions);
router.get("/stats", authMiddleware, requireAdminOrMod, requirePermission("promotions"), adminLimiter, getPromotionStats);
router.put("/:id/approve", authMiddleware, requireAdminOrMod, requirePermission("promotions"), adminLimiter, invalidateCache(...PROMO_PATTERNS), approvePromotion);
router.put("/:id/reject", authMiddleware, requireAdminOrMod, requirePermission("promotions"), adminLimiter, invalidateCache(...PROMO_PATTERNS), rejectPromotion);

export default router;
