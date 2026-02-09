import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { cacheResponse, invalidateCache } from "../../middlewares/apiCacheMiddleware.js";
import {
  createListing,
  getMyListings,
  updateListing,
  deleteListing,
  getSellerStats,
} from "./listing.controller.js";

const router = express.Router();

// All routes require authentication
router.post("/", authMiddleware, invalidateCache('api_cache:/api/v1/listings/*'), createListing);
router.get("/my-listings", authMiddleware, cacheResponse(60), getMyListings); // Cache for 1 minute
router.get("/stats", authMiddleware, cacheResponse(120), getSellerStats); // Cache for 2 minutes
router.put("/:id", authMiddleware, invalidateCache('api_cache:/api/v1/listings/*'), updateListing);
router.delete("/:id", authMiddleware, invalidateCache('api_cache:/api/v1/listings/*'), deleteListing);

export default router;
