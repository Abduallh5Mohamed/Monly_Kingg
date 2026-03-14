import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  addRating,
  getSellerRatings,
  deleteRating,
  getMyRatings,
} from "./sellerRating.controller.js";

const router = express.Router();

// Get ratings I have given (must be before /:sellerId to avoid conflict)
router.get("/my/given", authMiddleware, getMyRatings);

// Add or update a rating for a seller
router.post("/:sellerId", authMiddleware, addRating);

// Get all ratings for a seller (public)
router.get("/:sellerId", getSellerRatings);

// Delete own rating
router.delete("/:ratingId", authMiddleware, deleteRating);

export default router;
