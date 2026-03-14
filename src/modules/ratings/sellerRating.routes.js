import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  addRating,
  getSellerRatings,
  deleteRating,
  getMyRatings,
} from "./sellerRating.controller.js";
import { validateObjectId } from "../../middlewares/validateObjectId.js";

const router = express.Router();

// Get ratings I have given (must be before /:sellerId to avoid conflict)
router.get("/my/given", authMiddleware, getMyRatings);

// Add or update a rating for a seller
router.post("/:sellerId", authMiddleware, validateObjectId("sellerId"), addRating);

// Get all ratings for a seller (public)
router.get("/:sellerId", validateObjectId("sellerId"), getSellerRatings);

// Delete own rating
router.delete("/:ratingId", authMiddleware, validateObjectId("ratingId"), deleteRating);

export default router;
