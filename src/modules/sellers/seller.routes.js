import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requireAdmin, requireAdminOrMod, requirePermission } from "../../middlewares/roleMiddleware.js";
import { sellerRequestLimiter, adminLimiter } from "../../middlewares/rateLimiter.js";
import { validateObjectId } from "../../middlewares/validateObjectId.js";
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

// Admin / Moderator routes (requires "sellers" permission)
router.get("/requests", authMiddleware, requireAdminOrMod, requirePermission("sellers"), adminLimiter, getAllSellerRequests);
router.get("/active-sellers", authMiddleware, requireAdminOrMod, requirePermission("sellers"), adminLimiter, getActiveSellers);
// SECURITY FIX: Validate ObjectId params before performing seller/admin operations.
router.get("/detail/:sellerId", authMiddleware, requireAdminOrMod, requirePermission("sellers"), validateObjectId("sellerId"), adminLimiter, getSellerDetail);
router.put("/requests/:requestId/approve", authMiddleware, requireAdminOrMod, requirePermission("sellers"), validateObjectId("requestId"), adminLimiter, approveSellerRequest);
router.put("/requests/:requestId/reject", authMiddleware, requireAdminOrMod, requirePermission("sellers"), validateObjectId("requestId"), adminLimiter, rejectSellerRequest);

export default router;
