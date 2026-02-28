import express from "express";
import { createAd, getAllAds, updateAd, deleteAd, getActiveAds, trackAdClick, getAdStats } from "./ad.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requireAdmin } from "../../middlewares/roleMiddleware.js";
import { adClickLimiter, adminLimiter } from "../../middlewares/rateLimiter.js";
import { cacheResponse, invalidateCache } from "../../middlewares/apiCacheMiddleware.js";

const router = express.Router();

// Cache key pattern for ads
const ADS_CACHE_PATTERN = 'api_cache:*:/api/v1/ads*';

// Public routes (for user dashboard)
// Active ads change when admin creates/updates/deletes — cache for 60s only
router.get("/active", cacheResponse(60), getActiveAds);
router.post("/:id/click", adClickLimiter, trackAdClick);

// Admin routes
router.use(authMiddleware);
router.use(requireAdmin);
router.use(adminLimiter);

router.post("/", invalidateCache(ADS_CACHE_PATTERN), createAd);
router.get("/", getAllAds);
router.get("/stats", getAdStats);
router.put("/:id", invalidateCache(ADS_CACHE_PATTERN), updateAd);
router.delete("/:id", invalidateCache(ADS_CACHE_PATTERN), deleteAd);

export default router;
