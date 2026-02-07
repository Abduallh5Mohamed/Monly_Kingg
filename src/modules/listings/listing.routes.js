import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  createListing,
  getMyListings,
  updateListing,
  deleteListing,
  getSellerStats,
} from "./listing.controller.js";

const router = express.Router();

// All routes require authentication
router.post("/", authMiddleware, createListing);
router.get("/my-listings", authMiddleware, getMyListings);
router.get("/stats", authMiddleware, getSellerStats);
router.put("/:id", authMiddleware, updateListing);
router.delete("/:id", authMiddleware, deleteListing);

export default router;
