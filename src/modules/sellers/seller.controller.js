import SellerRequest from "./sellerRequest.model.js";
import User from "../users/user.model.js";

// Submit seller request
export const submitSellerRequest = async (req, res) => {
  try {
    const userId = req.user._id;

    // Check if user already has a pending/approved request
    const existing = await SellerRequest.findOne({ user: userId });
    if (existing) {
      if (existing.status === "approved") {
        return res.status(400).json({ message: "You are already an approved seller" });
      }
      if (existing.status === "pending") {
        return res.status(400).json({ message: "You already have a pending request" });
      }
      // If rejected, allow resubmission — update the existing record
      existing.idType = req.body.idType;
      existing.idImage = req.body.idImage;
      existing.faceImageFront = req.body.faceImageFront;
      existing.faceImageLeft = req.body.faceImageLeft;
      existing.faceImageRight = req.body.faceImageRight;
      existing.fullName = req.body.fullName;
      existing.status = "pending";
      existing.rejectionReason = null;
      existing.reviewedBy = null;
      existing.reviewedAt = null;
      await existing.save();
      return res.status(200).json({ message: "Seller request resubmitted successfully", data: existing });
    }

    const sellerRequest = new SellerRequest({
      user: userId,
      idType: req.body.idType,
      idImage: req.body.idImage,
      faceImageFront: req.body.faceImageFront,
      faceImageLeft: req.body.faceImageLeft,
      faceImageRight: req.body.faceImageRight,
      fullName: req.body.fullName,
    });

    await sellerRequest.save();
    return res.status(201).json({ message: "Seller request submitted successfully", data: sellerRequest });
  } catch (error) {
    console.error("Submit seller request error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get current user's seller request status
export const getMySellerRequest = async (req, res) => {
  try {
    const request = await SellerRequest.findOne({ user: req.user._id });
    if (!request) {
      return res.status(200).json({ data: null });
    }
    return res.status(200).json({ data: request });
  } catch (error) {
    console.error("Get seller request error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin: Get all seller requests
export const getAllSellerRequests = async (req, res) => {
  try {
    const { status = "all", page = 1, limit = 20 } = req.query;
    const filter = status !== "all" ? { status } : {};

    const requests = await SellerRequest.find(filter)
      .populate("user", "username email")
      .populate("reviewedBy", "username")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await SellerRequest.countDocuments(filter);
    const pendingCount = await SellerRequest.countDocuments({ status: "pending" });

    return res.status(200).json({
      data: requests,
      total,
      pendingCount,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get all seller requests error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin: Approve seller request
export const approveSellerRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await SellerRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    request.status = "approved";
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    // Update user role to include seller capability
    await User.findByIdAndUpdate(request.user, {
      $set: { isSeller: true, sellerApprovedAt: new Date() }
    });

    return res.status(200).json({ message: "Seller request approved", data: request });
  } catch (error) {
    console.error("Approve seller request error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin: Reject seller request
export const rejectSellerRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    const request = await SellerRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (request.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    request.status = "rejected";
    request.rejectionReason = reason || "Application did not meet requirements";
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    return res.status(200).json({ message: "Seller request rejected", data: request });
  } catch (error) {
    console.error("Reject seller request error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
