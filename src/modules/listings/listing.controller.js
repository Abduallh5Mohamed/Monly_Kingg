import Listing from "./listing.model.js";
import User from "../users/user.model.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a new listing (seller only)
export const createListing = async (req, res) => {
  try {
    console.log('📝 Creating listing with data:', {
      title: req.body.title,
      game: req.body.game,
      price: req.body.price,
      hasFiles: !!req.files,
      accountImagesCount: req.files?.accountImages?.length || 0,
      hasCoverImage: !!req.files?.coverImage
    });

    const user = await User.findById(req.user._id);
    if (!user || !user.isSeller) {
      return res.status(403).json({ message: "Only approved sellers can create listings" });
    }

    // Validation
    if (!req.body.title || !req.body.game || !req.body.price) {
      return res.status(400).json({ message: "Title, game, and price are required" });
    }

    // Handle file uploads
    const accountImages = [];
    let coverImage = null;

    if (req.files) {
      // Get account images
      if (req.files.accountImages) {
        req.files.accountImages.forEach(file => {
          accountImages.push(`/uploads/listings/${file.filename}`);
        });
      }

      // Get cover image (if provided)
      if (req.files.coverImage && req.files.coverImage[0]) {
        coverImage = `/uploads/listings/${req.files.coverImage[0].filename}`;
      }
    }

    // If no cover image provided, use first account image
    if (!coverImage && accountImages.length > 0) {
      coverImage = accountImages[0];
    }

    // Parse details if it's a string
    let details = {};
    if (req.body.details) {
      try {
        details = typeof req.body.details === 'string'
          ? JSON.parse(req.body.details)
          : req.body.details;
      } catch (e) {
        console.error('Failed to parse details:', e);
        details = req.body.details;
      }
    }

    const listing = new Listing({
      seller: req.user._id,
      title: req.body.title,
      game: req.body.game,
      description: req.body.description || "",
      price: req.body.price,
      details: details,
      images: accountImages,
      coverImage: coverImage,
      status: "available",
    });

    await listing.save();
    console.log('✅ Listing created successfully:', listing._id);
    return res.status(201).json({ message: "Listing created successfully", data: listing });
  } catch (error) {
    console.error("❌ Create listing error:", error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }

    return res.status(500).json({ message: error.message || "Server error" });
  }
};

// Get my listings (seller)
export const getMyListings = async (req, res) => {
  try {
    const { status = "all", page = 1, limit = 20 } = req.query;
    const filter = { seller: req.user._id };
    if (status !== "all") filter.status = status;

    const listings = await Listing.find(filter)
      .populate("game", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Listing.countDocuments(filter);

    return res.status(200).json({
      data: listings,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get my listings error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update a listing
export const updateListing = async (req, res) => {
  try {
    const listing = await Listing.findOne({ _id: req.params.id, seller: req.user._id });
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    if (req.body.title) listing.title = req.body.title;
    if (req.body.description !== undefined) listing.description = req.body.description;
    if (req.body.price) listing.price = req.body.price;
    if (req.body.images) listing.images = req.body.images;
    if (req.body.coverImage !== undefined) listing.coverImage = req.body.coverImage;
    if (req.body.details) listing.details = req.body.details;
    if (req.body.status) listing.status = req.body.status;

    await listing.save();
    return res.status(200).json({ message: "Listing updated", data: listing });
  } catch (error) {
    console.error("Update listing error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete a listing
export const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findOneAndDelete({ _id: req.params.id, seller: req.user._id });
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }
    return res.status(200).json({ message: "Listing deleted" });
  } catch (error) {
    console.error("Delete listing error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get seller stats
export const getSellerStats = async (req, res) => {
  try {
    const sellerId = req.user._id;
    const totalListings = await Listing.countDocuments({ seller: sellerId });
    const activeListings = await Listing.countDocuments({ seller: sellerId, status: "available" });
    const soldListings = await Listing.countDocuments({ seller: sellerId, status: "sold" });

    return res.status(200).json({
      data: {
        totalListings,
        activeListings,
        soldListings,
      },
    });
  } catch (error) {
    console.error("Get seller stats error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get all public listings (for marketplace)
export const getAllListings = async (req, res) => {
  try {
    const {
      status = "available",
      game,
      page = 1,
      limit = 20,
      sort = "createdAt",
      order = "desc"
    } = req.query;

    const filter = { status };
    if (game && game !== "all") {
      filter.game = game;
    }

    const sortOrder = order === "asc" ? 1 : -1;
    const sortOptions = { [sort]: sortOrder };

    const listings = await Listing.find(filter)
      .populate("game", "name slug icon")
      .populate("seller", "username")
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await Listing.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: listings,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get all listings error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get single listing by ID (public)
export const getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate("game", "name slug icon category")
      .populate("seller", "username email isSeller")
      .lean();

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    return res.status(200).json({ success: true, data: listing });
  } catch (error) {
    console.error("Get listing by ID error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
