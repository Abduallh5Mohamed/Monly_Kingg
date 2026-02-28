import express from "express";
import {
    createCampaign,
    getAllCampaigns,
    getCampaignStats,
    getCampaignById,
    updateCampaign,
    cancelCampaign,
    getActiveCampaigns,
    getMyInvites,
    joinCampaign,
    leaveCampaign,
    getListingActiveCampaign,
} from "./campaign.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requireAdmin } from "../../middlewares/roleMiddleware.js";
import { adminLimiter, userWriteLimiter } from "../../middlewares/rateLimiter.js";
import { cacheResponse, invalidateCache } from "../../middlewares/apiCacheMiddleware.js";

const router = express.Router();

const CAMPAIGN_PATTERNS = [
    "api_cache:*:/api/v1/campaigns*",
    "api_cache:*:/api/v1/listings*",
];

// ── Public routes ──
router.get("/active", cacheResponse(60), getActiveCampaigns);
router.get("/listing/:listingId/active-discount", cacheResponse(30), getListingActiveCampaign);

// ── Seller routes (auth required) ──
router.get("/my-invites", authMiddleware, getMyInvites);
router.post("/:id/join", authMiddleware, userWriteLimiter, invalidateCache(...CAMPAIGN_PATTERNS), joinCampaign);
router.delete("/:id/leave", authMiddleware, userWriteLimiter, invalidateCache(...CAMPAIGN_PATTERNS), leaveCampaign);

// ── Admin routes ──
router.use(authMiddleware);
router.use(requireAdmin);
router.use(adminLimiter);

router.post("/", invalidateCache(...CAMPAIGN_PATTERNS), createCampaign);
router.get("/", getAllCampaigns);
router.get("/stats", getCampaignStats);
router.get("/:id", getCampaignById);
router.put("/:id", invalidateCache(...CAMPAIGN_PATTERNS), updateCampaign);
router.put("/:id/cancel", invalidateCache(...CAMPAIGN_PATTERNS), cancelCampaign);

export default router;
