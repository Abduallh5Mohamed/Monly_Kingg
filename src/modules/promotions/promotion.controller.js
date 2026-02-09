import Promotion from "./promotion.model.js";
import Listing from "../listings/listing.model.js";

// Pricing: cost per day in USD
const PRICE_PER_DAY = 2;

// Seller: Submit promotion request
export const submitPromotion = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { listingId, days } = req.body;

    if (!listingId || !days) {
      return res.status(400).json({ message: "Listing and days are required" });
    }

    if (days < 1 || days > 30) {
      return res.status(400).json({ message: "Days must be between 1 and 30" });
    }

    // Verify the listing belongs to this seller
    const listing = await Listing.findOne({ _id: listingId, seller: sellerId });
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (listing.status !== "available") {
      return res.status(400).json({ message: "Only available listings can be promoted" });
    }

    // Check if there's already an active/pending promotion for this listing
    const existingPromotion = await Promotion.findOne({
      listing: listingId,
      status: { $in: ["pending", "active"] },
    });

    if (existingPromotion) {
      return res.status(400).json({
        message: existingPromotion.status === "pending"
          ? "This listing already has a pending promotion request"
          : "This listing already has an active promotion",
      });
    }

    const cost = days * PRICE_PER_DAY;

    const promotion = new Promotion({
      listing: listingId,
      seller: sellerId,
      days,
      cost,
    });

    await promotion.save();

    return res.status(201).json({
      message: "Promotion request submitted",
      data: promotion,
    });
  } catch (error) {
    console.error("Submit promotion error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Seller: Get my promotions
export const getMyPromotions = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { page = 1, limit = 10, status = "all" } = req.query;

    const filter = { seller: sellerId };
    if (status !== "all") filter.status = status;

    const promotions = await Promotion.find(filter)
      .populate("listing", "title game price status")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Promotion.countDocuments(filter);

    return res.status(200).json({
      data: promotions,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get my promotions error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Seller: Get promotion pricing info
export const getPromotionPricing = async (req, res) => {
  try {
    return res.status(200).json({
      data: {
        pricePerDay: PRICE_PER_DAY,
        minDays: 1,
        maxDays: 30,
        currency: "USD",
      },
    });
  } catch (error) {
    console.error("Get promotion pricing error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin: Get all promotion requests
export const getAllPromotions = async (req, res) => {
  try {
    const { status = "all", page = 1, limit = 20 } = req.query;
    const filter = status !== "all" ? { status } : {};

    const promotions = await Promotion.find(filter)
      .populate("seller", "username email")
      .populate("listing", "title game price status")
      .populate("reviewedBy", "username")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Promotion.countDocuments(filter);
    const pendingCount = await Promotion.countDocuments({ status: "pending" });
    const activeCount = await Promotion.countDocuments({ status: "active" });

    return res.status(200).json({
      data: promotions,
      total,
      pendingCount,
      activeCount,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get all promotions error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin: Approve promotion
export const approvePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const promotion = await Promotion.findById(id);

    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    if (promotion.status !== "pending") {
      return res.status(400).json({ message: "Promotion already processed" });
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + promotion.days);

    promotion.status = "active";
    promotion.reviewedBy = req.user._id;
    promotion.reviewedAt = now;
    promotion.startDate = now;
    promotion.endDate = endDate;
    await promotion.save();

    return res.status(200).json({
      message: "Promotion approved and activated",
      data: promotion,
    });
  } catch (error) {
    console.error("Approve promotion error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin: Reject promotion
export const rejectPromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const promotion = await Promotion.findById(id);

    if (!promotion) {
      return res.status(404).json({ message: "Promotion not found" });
    }

    if (promotion.status !== "pending") {
      return res.status(400).json({ message: "Promotion already processed" });
    }

    promotion.status = "rejected";
    promotion.rejectionReason = reason || "Request denied";
    promotion.reviewedBy = req.user._id;
    promotion.reviewedAt = new Date();
    await promotion.save();

    return res.status(200).json({
      message: "Promotion rejected",
      data: promotion,
    });
  } catch (error) {
    console.error("Reject promotion error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Admin: Get promotion stats
export const getPromotionStats = async (req, res) => {
  try {
    const totalPromotions = await Promotion.countDocuments();
    const pendingCount = await Promotion.countDocuments({ status: "pending" });
    const activeCount = await Promotion.countDocuments({ status: "active" });
    const approvedCount = await Promotion.countDocuments({ status: "approved" });
    const rejectedCount = await Promotion.countDocuments({ status: "rejected" });

    // Total revenue from approved/active promotions
    const revenueResult = await Promotion.aggregate([
      { $match: { status: { $in: ["active", "approved", "expired"] } } },
      { $group: { _id: null, totalRevenue: { $sum: "$cost" } } },
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    return res.status(200).json({
      data: {
        totalPromotions,
        pendingCount,
        activeCount,
        approvedCount,
        rejectedCount,
        totalRevenue,
      },
    });
  } catch (error) {
    console.error("Get promotion stats error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
