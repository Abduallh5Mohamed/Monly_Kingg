import express from "express";
import { createAd, getAllAds, updateAd, deleteAd, getActiveAds, trackAdClick, getAdStats } from "./ad.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requireAdmin } from "../../middlewares/roleMiddleware.js";

const router = express.Router();

// Public routes (for user dashboard)
router.get("/active", getActiveAds);
router.post("/:id/click", trackAdClick);

// Admin routes
router.use(authMiddleware);
router.use(requireAdmin);

router.post("/", createAd);
router.get("/", getAllAds);
router.get("/stats", getAdStats);
router.put("/:id", updateAd);
router.delete("/:id", deleteAd);

export default router;
