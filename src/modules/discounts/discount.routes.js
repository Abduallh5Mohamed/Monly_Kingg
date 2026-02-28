import express from "express";
import {
  createDiscount,
  getAllDiscounts,
  updateDiscount,
  cancelDiscount,
  searchListings,
  getDiscountStats,
  getActiveDiscounts,
  createSellerDiscount,
  getMyListingDiscount,
  cancelMyListingDiscount,
} from "./discount.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requireAdmin } from "../../middlewares/roleMiddleware.js";
import { adminLimiter, userWriteLimiter } from "../../middlewares/rateLimiter.js";
import { cacheResponse, invalidateCache } from "../../middlewares/apiCacheMiddleware.js";

const router = express.Router();

// Discounts affect listing display — invalidate both caches on any mutation
const DISCOUNT_PATTERNS = ['api_cache:*:/api/v1/discounts*', 'api_cache:*:/api/v1/listings*'];

// Public routes
router.get("/active", cacheResponse(60), getActiveDiscounts);

// Seller routes (authenticated users can manage discounts on their own listings)
router.post("/my-listing", authMiddleware, userWriteLimiter, invalidateCache(...DISCOUNT_PATTERNS), createSellerDiscount);
router.get("/my-listing/:listingId", authMiddleware, getMyListingDiscount);
router.delete("/my-listing/:listingId", authMiddleware, userWriteLimiter, invalidateCache(...DISCOUNT_PATTERNS), cancelMyListingDiscount);

// Admin routes
router.use(authMiddleware);
router.use(requireAdmin);
router.use(adminLimiter);

router.post("/", invalidateCache(...DISCOUNT_PATTERNS), createDiscount);
router.get("/", getAllDiscounts);
router.get("/stats", getDiscountStats);
router.get("/search-listings", searchListings);
router.put("/:id", invalidateCache(...DISCOUNT_PATTERNS), updateDiscount);
router.put("/:id/cancel", invalidateCache(...DISCOUNT_PATTERNS), cancelDiscount);

export default router;
