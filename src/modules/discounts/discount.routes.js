import express from "express";
import {
  createDiscount,
  getAllDiscounts,
  updateDiscount,
  cancelDiscount,
  searchListings,
  getDiscountStats,
  getActiveDiscounts,
} from "./discount.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requireAdmin } from "../../middlewares/roleMiddleware.js";

const router = express.Router();

// Public routes
router.get("/active", getActiveDiscounts);

// Admin routes
router.use(authMiddleware);
router.use(requireAdmin);

router.post("/", createDiscount);
router.get("/", getAllDiscounts);
router.get("/stats", getDiscountStats);
router.get("/search-listings", searchListings);
router.put("/:id", updateDiscount);
router.put("/:id/cancel", cancelDiscount);

export default router;
