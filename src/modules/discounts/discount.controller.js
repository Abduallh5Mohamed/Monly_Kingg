import Discount from "./discount.model.js";
import Listing from "../listings/listing.model.js";
import logger from "../../utils/logger.js";
import escapeRegex from "../../utils/escapeRegex.js";

/**
 * Create a discount on a listing (admin only)
 */
export const createDiscount = async (req, res) => {
  try {
    const { listingId, discountPercent, reason, endDate } = req.body;

    if (!listingId || !discountPercent) {
      return res.status(400).json({ success: false, message: "Listing ID and discount percent are required" });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    // Cancel existing active discounts for this listing
    await Discount.updateMany(
      { listing: listingId, status: "active" },
      { status: "cancelled" }
    );

    const originalPrice = listing.price;
    const discountedPrice = parseFloat((originalPrice * (1 - discountPercent / 100)).toFixed(2));

    const discount = await Discount.create({
      listing: listingId,
      originalPrice,
      discountedPrice,
      discountPercent,
      reason: reason || "",
      endDate: endDate || null,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: discount });
  } catch (error) {
    logger.error("Create discount error:", error);
    res.status(500).json({ success: false, message: "Failed to create discount" });
  }
};

/**
 * Get all discounts (admin)
 */
export const getAllDiscounts = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== "all") query.status = status;

    const skip = (page - 1) * limit;
    const [discounts, total] = await Promise.all([
      Discount.find(query)
        .populate({
          path: "listing",
          select: "title price coverImage images game status",
          populate: { path: "game", select: "name" },
        })
        .populate("createdBy", "username email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Discount.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: discounts,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    logger.error("Get discounts error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch discounts" });
  }
};

/**
 * Update discount (admin)
 */
export const updateDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const { discountPercent, reason, status, endDate } = req.body;

    const discount = await Discount.findById(id);
    if (!discount) {
      return res.status(404).json({ success: false, message: "Discount not found" });
    }

    if (discountPercent) {
      discount.discountPercent = discountPercent;
      discount.discountedPrice = parseFloat((discount.originalPrice * (1 - discountPercent / 100)).toFixed(2));
    }
    if (reason !== undefined) discount.reason = reason;
    if (status) discount.status = status;
    if (endDate !== undefined) discount.endDate = endDate;

    await discount.save();

    res.json({ success: true, data: discount });
  } catch (error) {
    logger.error("Update discount error:", error);
    res.status(500).json({ success: false, message: "Failed to update discount" });
  }
};

/**
 * Cancel discount (admin)
 */
export const cancelDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const discount = await Discount.findByIdAndUpdate(id, { status: "cancelled" }, { new: true });

    if (!discount) {
      return res.status(404).json({ success: false, message: "Discount not found" });
    }

    res.json({ success: true, data: discount });
  } catch (error) {
    logger.error("Cancel discount error:", error);
    res.status(500).json({ success: false, message: "Failed to cancel discount" });
  }
};

/**
 * Search listings for discount assignment (admin)
 */
export const searchListings = async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    const query = { status: "available" };
    if (q) {
      const safeSearch = escapeRegex(String(q).trim().slice(0, 100));
      query.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const listings = await Listing.find(query)
      .populate("game", "name")
      .populate("seller", "username")
      .select("title price coverImage images game seller status")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, data: listings });
  } catch (error) {
    logger.error(`Search listings error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to search listings" });
  }
};

/**
 * Get discount stats (admin)
 */
export const getDiscountStats = async (req, res) => {
  try {
    const [total, active, expired, cancelled, savings] = await Promise.all([
      Discount.countDocuments(),
      Discount.countDocuments({ status: "active" }),
      Discount.countDocuments({ status: "expired" }),
      Discount.countDocuments({ status: "cancelled" }),
      Discount.aggregate([
        { $match: { status: "active" } },
        { $group: { _id: null, totalSavings: { $sum: { $subtract: ["$originalPrice", "$discountedPrice"] } } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        total,
        active,
        expired,
        cancelled,
        totalSavings: savings[0]?.totalSavings || 0,
      },
    });
  } catch (error) {
    logger.error("Get discount stats error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stats" });
  }
};

/**
 * Get active discounts for user dashboard (public)
 */
export const getActiveDiscounts = async (req, res) => {
  try {
    const now = new Date();
    const query = {
      status: "active",
      $or: [
        { endDate: null },
        { endDate: { $gte: now } },
      ],
    };

    const discounts = await Discount.find(query)
      .populate({
        path: "listing",
        select: "title price coverImage images game status",
        populate: { path: "game", select: "name" },
      })
      .sort({ discountPercent: -1 })
      .limit(20)
      .lean();

    // Filter out discounts with deleted or sold listings
    const validDiscounts = discounts.filter(d => d.listing && d.listing.status === "available");

    res.json({ success: true, data: validDiscounts });
  } catch (error) {
    logger.error("Get active discounts error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch discounts" });
  }
};

/**
 * Create discount on own listing (seller)
 */
export const createSellerDiscount = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { listingId, discountPercent, durationDays } = req.body;

    if (!listingId || !discountPercent) {
      return res.status(400).json({ success: false, message: "Listing ID and discount percent are required" });
    }

    if (discountPercent < 1 || discountPercent > 99) {
      return res.status(400).json({ success: false, message: "Discount percent must be between 1 and 99" });
    }

    // Verify listing belongs to seller
    const listing = await Listing.findOne({ _id: listingId, seller: sellerId });
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found or does not belong to you" });
    }

    if (listing.status !== "available") {
      return res.status(400).json({ success: false, message: "Can only discount available listings" });
    }

    // Cancel existing active discounts for this listing
    await Discount.updateMany(
      { listing: listingId, status: "active" },
      { status: "cancelled" }
    );

    const originalPrice = listing.price;
    const discountedPrice = parseFloat((originalPrice * (1 - discountPercent / 100)).toFixed(2));

    // Calculate end date if duration is specified
    let endDate = null;
    if (durationDays && durationDays > 0) {
      endDate = new Date();
      endDate.setDate(endDate.getDate() + durationDays);
    }

    const discount = await Discount.create({
      listing: listingId,
      originalPrice,
      discountedPrice,
      discountPercent,
      reason: `Seller discount - ${discountPercent}% off`,
      endDate,
      createdBy: sellerId,
    });

    res.status(201).json({ success: true, data: discount });
  } catch (error) {
    logger.error("Create seller discount error:", error);
    res.status(500).json({ success: false, message: "Failed to create discount" });
  }
};

/**
 * Get discount on own listing (seller)
 */
export const getMyListingDiscount = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { listingId } = req.params;

    // Verify listing belongs to seller
    const listing = await Listing.findOne({ _id: listingId, seller: sellerId });
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    const discount = await Discount.findOne({
      listing: listingId,
      status: "active",
    }).lean();

    res.json({ success: true, data: discount });
  } catch (error) {
    logger.error("Get listing discount error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch discount" });
  }
};

/**
 * Cancel discount on own listing (seller)
 */
export const cancelMyListingDiscount = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const { listingId } = req.params;

    // Verify listing belongs to seller
    const listing = await Listing.findOne({ _id: listingId, seller: sellerId });
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    const discount = await Discount.findOneAndUpdate(
      { listing: listingId, status: "active" },
      { status: "cancelled" },
      { new: true }
    );

    if (!discount) {
      return res.status(404).json({ success: false, message: "No active discount found" });
    }

    res.json({ success: true, data: discount });
  } catch (error) {
    logger.error("Cancel listing discount error:", error);
    res.status(500).json({ success: false, message: "Failed to cancel discount" });
  }
};

