import SellerRequest from "./sellerRequest.model.js";
import User from "../users/user.model.js";
import Listing from "../listings/listing.model.js";
import Chat from "../chats/chat.model.js";
import Notification from "../notifications/notification.model.js";

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
      // If rejected, allow resubmission — push old rejection to history, update record
      existing.rejectionHistory.push({
        reason: existing.rejectionReason,
        rejectedBy: existing.reviewedBy,
        rejectedAt: existing.reviewedAt,
        idType: existing.idType,
        fullName: existing.fullName,
      });
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
      existing.applicationCount = (existing.applicationCount || 1) + 1;
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
      applicationCount: 1,
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

// Admin: Get all seller requests (with full user profile)
export const getAllSellerRequests = async (req, res) => {
  try {
    const { status = "all", page = 1, limit = 20 } = req.query;
    const filter = status !== "all" ? { status } : {};

    const [requests, total, pendingCount] = await Promise.all([
      SellerRequest.find(filter)
        .populate("user", "username email avatar phone address bio fullName stats isSeller sellerApprovedAt createdAt isOnline lastSeenAt")
        .populate("reviewedBy", "username")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      SellerRequest.countDocuments(filter),
      SellerRequest.countDocuments({ status: "pending" }),
    ]);

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

// Admin: Get all active (approved) sellers with their stats
export const getActiveSellers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const skip = (page - 1) * limit;

    // Get approved seller requests  
    const filter = { status: "approved" };
    const [sellerRequests, total] = await Promise.all([
      SellerRequest.find(filter)
        .populate("user", "username email avatar phone address bio fullName stats isSeller sellerApprovedAt createdAt isOnline lastSeenAt wallet")
        .sort({ reviewedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      SellerRequest.countDocuments(filter),
    ]);

    // Get listings & chat counts for each seller in parallel
    const sellerUserIds = sellerRequests.map(r => r.user?._id).filter(Boolean);

    const [listingsByUser, chatsByUser] = await Promise.all([
      Listing.aggregate([
        { $match: { seller: { $in: sellerUserIds } } },
        {
          $group: {
            _id: "$seller",
            totalListings: { $sum: 1 },
            activeListings: { $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] } },
            soldListings: { $sum: { $cond: [{ $eq: ["$status", "sold"] }, 1, 0] } },
            totalRevenue: { $sum: { $cond: [{ $eq: ["$status", "sold"] }, "$price", 0] } },
          }
        }
      ]),
      Chat.aggregate([
        { $match: { participants: { $in: sellerUserIds }, isActive: true } },
        { $unwind: "$participants" },
        { $match: { participants: { $in: sellerUserIds } } },
        { $group: { _id: "$participants", chatCount: { $sum: 1 } } }
      ]),
    ]);

    // Map stats to sellers
    const listingMap = {};
    listingsByUser.forEach(l => { listingMap[l._id.toString()] = l; });
    const chatMap = {};
    chatsByUser.forEach(c => { chatMap[c._id.toString()] = c.chatCount; });

    const sellers = sellerRequests.map(req => ({
      ...req,
      sellerStats: {
        totalListings: listingMap[req.user?._id?.toString()]?.totalListings || 0,
        activeListings: listingMap[req.user?._id?.toString()]?.activeListings || 0,
        soldListings: listingMap[req.user?._id?.toString()]?.soldListings || 0,
        totalRevenue: listingMap[req.user?._id?.toString()]?.totalRevenue || 0,
        chatCount: chatMap[req.user?._id?.toString()] || 0,
      },
    }));

    return res.status(200).json({
      data: sellers,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get active sellers error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin: Get single seller detail with listings
export const getSellerDetail = async (req, res) => {
  try {
    const { sellerId } = req.params;

    const sellerRequest = await SellerRequest.findById(sellerId)
      .populate("user", "username email avatar phone address bio fullName stats isSeller sellerApprovedAt createdAt isOnline lastSeenAt wallet")
      .populate("reviewedBy", "username")
      .lean();

    if (!sellerRequest) {
      return res.status(404).json({ message: "Seller not found" });
    }

    const userId = sellerRequest.user?._id;

    const [listings, chats, listingStats] = await Promise.all([
      Listing.find({ seller: userId })
        .populate("game", "name")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Chat.find({ participants: userId, isActive: true })
        .populate("participants", "username avatar")
        .select("chatNumber type lastMessage updatedAt participants")
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean(),
      Listing.aggregate([
        { $match: { seller: userId } },
        {
          $group: {
            _id: null,
            totalListings: { $sum: 1 },
            activeListings: { $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] } },
            soldListings: { $sum: { $cond: [{ $eq: ["$status", "sold"] }, 1, 0] } },
            totalRevenue: { $sum: { $cond: [{ $eq: ["$status", "sold"] }, "$price", 0] } },
          }
        }
      ]),
    ]);

    return res.status(200).json({
      data: {
        ...sellerRequest,
        listings,
        chats,
        sellerStats: listingStats[0] || { totalListings: 0, activeListings: 0, soldListings: 0, totalRevenue: 0 },
      }
    });
  } catch (error) {
    console.error("Get seller detail error:", error);
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

    // Create notification for user
    await Notification.create({
      user: request.user,
      type: "seller_approved",
      title: "Seller Application Approved! 🎉",
      message: "Congratulations! Your seller application has been approved. You can now list your accounts for sale.",
      relatedModel: "SellerRequest",
      relatedId: request._id,
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

    const rejectionReason = reason || "Application did not meet requirements";
    request.status = "rejected";
    request.rejectionReason = rejectionReason;
    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();

    // Create notification for user with rejection reason
    await Notification.create({
      user: request.user,
      type: "seller_rejected",
      title: "Seller Application Update",
      message: `Your seller application was not approved. Reason: ${rejectionReason}. You can reapply with updated documents.`,
      relatedModel: "SellerRequest",
      relatedId: request._id,
      metadata: { rejectionReason },
    });

    return res.status(200).json({ message: "Seller request rejected", data: request });
  } catch (error) {
    console.error("Reject seller request error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
