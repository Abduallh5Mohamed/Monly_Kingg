import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requireAdmin } from "../../middlewares/roleMiddleware.js";
import {
  submitSellerRequest,
  getMySellerRequest,
  getAllSellerRequests,
  getActiveSellers,
  getSellerDetail,
  approveSellerRequest,
  rejectSellerRequest,
} from "./seller.controller.js";

const router = express.Router();

// User routes
router.post("/request", authMiddleware, submitSellerRequest);
router.get("/my-request", authMiddleware, getMySellerRequest);

// Admin routes
router.get("/requests", authMiddleware, requireAdmin, getAllSellerRequests);
router.get("/active-sellers", authMiddleware, requireAdmin, getActiveSellers);
router.get("/detail/:sellerId", authMiddleware, requireAdmin, getSellerDetail);
router.put("/requests/:requestId/approve", authMiddleware, requireAdmin, approveSellerRequest);
router.put("/requests/:requestId/reject", authMiddleware, requireAdmin, rejectSellerRequest);

export default router;
