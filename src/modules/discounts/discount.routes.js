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

const router = express.Router();

// Public routes
router.get("/active", getActiveDiscounts);

// Seller routes (authenticated users can manage discounts on their own listings)
router.post("/my-listing", authMiddleware, userWriteLimiter, createSellerDiscount);
router.get("/my-listing/:listingId", authMiddleware, getMyListingDiscount);
router.delete("/my-listing/:listingId", authMiddleware, userWriteLimiter, cancelMyListingDiscount);

// Admin routes
router.use(authMiddleware);
router.use(requireAdmin);
router.use(adminLimiter);

router.post("/", createDiscount);
router.get("/", getAllDiscounts);
router.get("/stats", getDiscountStats);
router.get("/search-listings", searchListings);
router.put("/:id", updateDiscount);
router.put("/:id/cancel", cancelDiscount);

export default router;
