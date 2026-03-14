import Listing from "./listing.model.js";
import User from "../users/user.model.js";
import Game from "../games/game.model.js";
import Discount from "../discounts/discount.model.js";
import Campaign from "../campaigns/campaign.model.js";
import Notification from "../notifications/notification.model.js";
import socketService from "../../services/socketService.js";
import rankingService from "../../services/rankingService.js";
import cacheService from "../../services/cacheService.js";
import redis from "../../config/redis.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── In-process campaign cache (avoids DB hit on every browse) ───
let _campaignCache = { data: null, expiresAt: 0 };
const CAMPAIGN_CACHE_TTL = 120_000; // 2 minutes

async function getActiveCampaignsCached() {
  const now = Date.now();
  if (_campaignCache.data && now < _campaignCache.expiresAt) {
    return _campaignCache.data;
  }
  const campaigns = await Campaign.find({
    status: "active",
    endDate: { $gte: new Date() },
  }).lean();
  _campaignCache = { data: campaigns, expiresAt: now + CAMPAIGN_CACHE_TTL };
  return campaigns;
}

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

    const price = Number(req.body.price);
    if (!Number.isFinite(price) || price <= 0 || price > 1000000) {
      return res.status(400).json({ message: "Price must be between 1 and 1,000,000" });
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
    // Check for active voluntary campaigns that cover this game and notify the seller
    try {
      const activeCampaigns = await Campaign.find({
        status: "active",
        type: "voluntary",
        games: listing.game,
        endDate: { $gt: new Date() },
      }).lean();

      for (const campaign of activeCampaigns) {
        // Skip if seller was already notified for this campaign
        const alreadyNotified = (campaign.notifiedSellers || []).some(
          (id) => id.toString() === req.user._id.toString()
        );
        if (alreadyNotified) continue;

        // Create notification
        await Notification.create({
          user: req.user._id,
          type: "system",
          title: "\uD83C\uDFF7\uFE0F Discount Campaign Available!",
          message: `Your new listing "${listing.title}" qualifies for the "${campaign.title}" campaign — ${campaign.discountPercent}% off! Join from your account settings.`,
          relatedModel: "Campaign",
          relatedId: campaign._id,
          metadata: {
            campaignId: campaign._id,
            campaignTitle: campaign.title,
            discountPercent: campaign.discountPercent,
            type: "discount_campaign_invite",
          },
        });

        // Add seller to notifiedSellers
        await Campaign.updateOne(
          { _id: campaign._id },
          { $addToSet: { notifiedSellers: req.user._id } }
        );

        // Real-time socket notification
        socketService.sendToUser(req.user._id.toString(), "discount_campaign_invite", {
          campaignId: campaign._id,
          title: campaign.title,
          discountPercent: campaign.discountPercent,
        });
      }
    } catch (campaignErr) {
      console.error("Campaign notification error (non-blocking):", campaignErr.message);
    }
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
      .limit(Number(limit))
      .lean();

    const total = await Listing.countDocuments(filter);

    // Enrich listings with campaign discounts
    await enrichListingsWithCampaignDiscounts(listings);

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

// Get single listing for seller (for editing)
export const getMyListingById = async (req, res) => {
  try {
    const listing = await Listing.findOne({
      _id: req.params.id,
      seller: req.user._id
    })
      .populate("game", "name _id")
      .lean();

    if (!listing) {
      return res.status(404).json({ message: "Listing not found or unauthorized" });
    }

    return res.status(200).json({ success: true, data: listing });
  } catch (error) {
    console.error("Get my listing by ID error:", error);
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
    if (req.body.game) listing.game = req.body.game;
    if (req.body.description !== undefined) listing.description = req.body.description;
    if (req.body.price) listing.price = req.body.price;
    if (req.body.images) listing.images = req.body.images;
    if (req.body.coverImage !== undefined) listing.coverImage = req.body.coverImage;
    if (req.body.details) listing.details = req.body.details;
    // Only allow seller to set status to "available" (other transitions are system-controlled)
    if (req.body.status && req.body.status === 'available') listing.status = req.body.status;

    await listing.save();

    // Populate game data before returning
    await listing.populate('game');

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

/**
 * Helper: Enrich an array of listings (lean docs) with campaign discount info.
 * Checks individual Discounts first, then voluntary campaigns, then mandatory.
 */
async function enrichListingsWithCampaignDiscounts(listings) {
  if (!listings.length) return;

  const now = new Date();
  const listingIds = listings.map(l => l._id);

  // Run DB queries in parallel: discounts + campaigns (campaigns are cached in-process)
  const [discounts, activeCampaigns] = await Promise.all([
    Discount.find({
      listing: { $in: listingIds },
      status: "active",
      $or: [{ endDate: null }, { endDate: { $gte: now } }],
    }).select('listing originalPrice discountedPrice discountPercent').lean(),
    getActiveCampaignsCached(),
  ]);

  const discountMap = {};
  for (const d of discounts) {
    discountMap[d.listing.toString()] = d;
  }

  const voluntaryCampaigns = activeCampaigns.filter(c => c.type === "voluntary");
  const mandatoryCampaigns = activeCampaigns.filter(c => c.type === "mandatory");

  // Build a Set of listing IDs participating in voluntary campaigns, with their discount %
  const voluntaryMap = {};
  for (const c of voluntaryCampaigns) {
    for (const p of (c.participatingListings || [])) {
      voluntaryMap[p.listing.toString()] = c.discountPercent;
    }
  }

  // 3) Enrich each listing
  for (const listing of listings) {
    const lid = listing._id.toString();

    // Individual discount takes priority
    if (discountMap[lid]) {
      const d = discountMap[lid];
      listing.discount = {
        originalPrice: d.originalPrice,
        discountedPrice: d.discountedPrice,
        discountPercent: d.discountPercent,
      };
      continue;
    }

    // Voluntary campaign discount
    if (voluntaryMap[lid]) {
      const pct = voluntaryMap[lid];
      listing.discount = {
        originalPrice: listing.price,
        discountedPrice: +(listing.price * (1 - pct / 100)).toFixed(2),
        discountPercent: pct,
      };
      continue;
    }

    // Mandatory campaign discount (match by game)
    const gameId = (listing.game?._id || listing.game || "").toString();
    for (const c of mandatoryCampaigns) {
      if (c.games.some(g => g.toString() === gameId)) {
        listing.discount = {
          originalPrice: listing.price,
          discountedPrice: +(listing.price * (1 - c.discountPercent / 100)).toFixed(2),
          discountPercent: c.discountPercent,
          isMandatory: true,
        };
        break;
      }
    }
  }
}

// ─── PUBLIC: Browse all available listings (no auth) ───
export const browseListings = async (req, res) => {
  try {
    const {
      game,
      minPrice,
      maxPrice,
      search,
      sort = "newest",
      page = 1,
      limit = 12,
    } = req.query;

    const filter = { status: "available" };

    if (game) filter.game = game;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === "price_asc") sortOption = { price: 1 };
    else if (sort === "price_desc") sortOption = { price: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const pageLimit = Math.min(Number(limit), 50); // Cap max per page

    // Run listing query + count in parallel
    const [listings, total] = await Promise.all([
      Listing.find(filter)
        .select('title game seller price coverImage images details status createdAt')
        .populate("game", "name")
        .populate("seller", "username avatar")
        .sort(sortOption)
        .skip(skip)
        .limit(pageLimit)
        .lean(),
      Listing.countDocuments(filter),
    ]);

    // Enrich listings with campaign discounts
    await enrichListingsWithCampaignDiscounts(listings);

    return res.status(200).json({
      data: listings,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / pageLimit),
    });
  } catch (error) {
    console.error("Browse listings error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── PUBLIC: Get all games for filter dropdown (cached) ───
export const getGamesForFilter = async (req, res) => {
  try {
    // Try cache first
    const cached = await cacheService.getCachedGames();
    if (cached) {
      return res.status(200).json({ data: cached });
    }

    const games = await Game.find({}, "name").sort({ name: 1 }).lean();

    // Cache for 6 hours
    cacheService.cacheGames(games).catch(() => { });

    return res.status(200).json({ data: games });
  } catch (error) {
    console.error("Get games error:", error);
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
    const pageLimit = Math.min(Number(limit), 100); // Cap max per page

    // Run listing query + count in parallel
    const [listings, total] = await Promise.all([
      Listing.find(filter)
        .select('title game seller price coverImage images details status createdAt')
        .populate("game", "name slug icon")
        .populate("seller", "username")
        .sort(sortOptions)
        .skip((page - 1) * pageLimit)
        .limit(pageLimit)
        .lean(),
      Listing.countDocuments(filter),
    ]);

    // Enrich listings with campaign discounts
    await enrichListingsWithCampaignDiscounts(listings);

    return res.status(200).json({
      success: true,
      data: listings,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / pageLimit),
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

    // Fetch all discount sources in parallel instead of sequentially
    const now = new Date();
    const listingGameId = listing.game?._id || listing.game;

    const [activeDiscount, voluntaryCampaign, mandatoryCampaign] = await Promise.all([
      Discount.findOne({
        listing: req.params.id,
        status: "active",
        $or: [{ endDate: null }, { endDate: { $gte: now } }],
      }).lean(),
      Campaign.findOne({
        type: "voluntary",
        status: "active",
        endDate: { $gte: now },
        "participatingListings.listing": listing._id,
      }).lean(),
      Campaign.findOne({
        type: "mandatory",
        status: "active",
        endDate: { $gte: now },
        games: listingGameId,
      }).lean(),
    ]);

    // Priority: individual discount > voluntary campaign > mandatory campaign
    if (activeDiscount) {
      listing.discount = {
        originalPrice: activeDiscount.originalPrice,
        discountedPrice: activeDiscount.discountedPrice,
        discountPercent: activeDiscount.discountPercent,
      };
    } else if (voluntaryCampaign) {
      const discountPercent = voluntaryCampaign.discountPercent;
      listing.discount = {
        originalPrice: listing.price,
        discountedPrice: +(listing.price * (1 - discountPercent / 100)).toFixed(2),
        discountPercent,
      };
    } else if (mandatoryCampaign) {
      const discountPercent = mandatoryCampaign.discountPercent;
      listing.discount = {
        originalPrice: listing.price,
        discountedPrice: +(listing.price * (1 - discountPercent / 100)).toFixed(2),
        discountPercent,
        isMandatory: true,
      };
    }

    // Track view (fire-and-forget, never blocks the response)
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    rankingService.recordView(req.params.id, ip).catch(() => { });

    return res.status(200).json({ success: true, data: listing });
  } catch (error) {
    console.error("Get listing by ID error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
