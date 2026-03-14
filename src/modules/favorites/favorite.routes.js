import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { toggleFavorite, getMyFavorites, getMyFavoriteIds } from "./favorite.controller.js";

const router = express.Router();

// All routes require authentication
router.get("/", authMiddleware, getMyFavorites);
router.get("/ids", authMiddleware, getMyFavoriteIds);
router.post("/:listingId", authMiddleware, toggleFavorite);

export default router;
