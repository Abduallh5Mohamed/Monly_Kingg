import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requireAdmin } from "../../middlewares/roleMiddleware.js";
import { sellerRequestLimiter, adminLimiter } from "../../middlewares/rateLimiter.js";
import {
  submitSellerRequest,
  getMySellerRequest,
  getAllSellerRequests,
  getActiveSellers,
  getSellerDetail,
  approveSellerRequest,
  rejectSellerRequest,
} from "./seller.controller.js";
import {
  getMyLevelProgress,
  getPublicLevelsTable,
} from "../seller-levels/sellerLevel.controller.js";

const router = express.Router();

// User routes
router.post("/request", authMiddleware, sellerRequestLimiter, submitSellerRequest);
router.get("/my-request", authMiddleware, getMySellerRequest);

// Seller level routes (authenticated)
router.get("/level-progress", authMiddleware, getMyLevelProgress);
router.get("/levels-table", authMiddleware, getPublicLevelsTable);

// Admin routes
router.get("/requests", authMiddleware, requireAdmin, adminLimiter, getAllSellerRequests);
router.get("/active-sellers", authMiddleware, requireAdmin, adminLimiter, getActiveSellers);
router.get("/detail/:sellerId", authMiddleware, requireAdmin, adminLimiter, getSellerDetail);
router.put("/requests/:requestId/approve", authMiddleware, requireAdmin, adminLimiter, approveSellerRequest);
router.put("/requests/:requestId/reject", authMiddleware, requireAdmin, adminLimiter, rejectSellerRequest);

export default router;
