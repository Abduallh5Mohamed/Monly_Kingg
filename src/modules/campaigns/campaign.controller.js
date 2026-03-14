import Campaign from "./campaign.model.js";
import Listing from "../listings/listing.model.js";
import Game from "../games/game.model.js";
import User from "../users/user.model.js";
import Notification from "../notifications/notification.model.js";
import socketService from "../../services/socketService.js";
import logger from "../../utils/logger.js";

// ─── helpers ─────

async function notifySellersBulk(sellerIds, campaign) {
    try {
        const notifications = sellerIds.map(sellerId => ({
            user: sellerId,
            type: "system",
            title: "🏷️ New Discount Offer!",
            message: `Discount campaign "${campaign.title}" is now available! ${campaign.discountPercent}% off on selected game accounts. Join now from your account settings.`,
            relatedModel: "Campaign",
            relatedId: campaign._id,
            metadata: {
                campaignId: campaign._id,
                campaignTitle: campaign.title,
                discountPercent: campaign.discountPercent,
                type: "discount_campaign_invite",
            },
        }));

        await Notification.insertMany(notifications);

        // Send socket notifications
        sellerIds.forEach(sellerId => {
            socketService.sendToUser(sellerId.toString(), "discount_campaign_invite", {
                campaignId: campaign._id,
                title: campaign.title,
                discountPercent: campaign.discountPercent,
            });
        });
    } catch (err) {
        logger.error(`[Campaign] notifySellersBulk error: ${err.message}`);
    }
}

// ═══════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════

/**
 * POST /api/v1/campaigns
 * Create a new discount campaign
 */
export const createCampaign = async (req, res) => {
    try {
        const { title, description, type, discountPercent, gameIds, endDate, image } = req.body;

        if (!title || !type || !discountPercent || !gameIds?.length || !endDate) {
            return res.status(400).json({
                success: false,
                message: "title, type, discountPercent, gameIds, and endDate are required",
            });
        }

        if (!["mandatory", "voluntary"].includes(type)) {
            return res.status(400).json({ success: false, message: "type must be mandatory or voluntary" });
        }

        if (discountPercent < 1 || discountPercent > 100) {
            return res.status(400).json({ success: false, message: "discountPercent must be 1-100" });
        }

        // Validate end date is in the future
        const parsedEndDate = new Date(endDate);
        if (parsedEndDate <= new Date()) {
            return res.status(400).json({ success: false, message: "endDate must be in the future" });
        }

        // Validate games exist
        const games = await Game.find({ _id: { $in: gameIds }, status: "active" });
        if (games.length !== gameIds.length) {
            return res.status(400).json({ success: false, message: "One or more games not found" });
        }

        const campaign = await Campaign.create({
            title,
            description: description || "",
            type,
            image: image || "",
            discountPercent,
            games: gameIds,
            endDate: new Date(endDate),
            createdBy: req.user._id,
        });

        // For voluntary campaigns: notify all sellers who have listings for these games
        if (type === "voluntary") {
            const sellersWithListings = await Listing.distinct("seller", {
                game: { $in: gameIds },
                status: "available",
            });

            if (sellersWithListings.length > 0) {
                campaign.notifiedSellers = sellersWithListings;
                await campaign.save();
                await notifySellersBulk(sellersWithListings, campaign);
            }
        }

        // Populate for response
        const populated = await Campaign.findById(campaign._id)
            .populate("games", "name slug icon")
            .populate("createdBy", "username")
            .lean();

        res.status(201).json({ success: true, data: populated });
    } catch (error) {
        logger.error("Create campaign error:", error);
        res.status(500).json({ success: false, message: "Failed to create campaign" });
    }
};

/**
 * GET /api/v1/campaigns
 * Get all campaigns (admin)
 */
export const getAllCampaigns = async (req, res) => {
    try {
        const { status, type, page = 1, limit = 20 } = req.query;
        const query = {};

        if (status && status !== "all") query.status = status;
        if (type && type !== "all") query.type = type;

        const skip = (page - 1) * limit;
        const [campaigns, total] = await Promise.all([
            Campaign.find(query)
                .populate("games", "name slug icon")
                .populate("createdBy", "username")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Campaign.countDocuments(query),
        ]);

        // Add listing counts
        const enriched = campaigns.map(c => ({
            ...c,
            participatingCount: c.participatingListings?.length || 0,
            notifiedCount: c.notifiedSellers?.length || 0,
        }));

        res.json({ success: true, data: enriched, totalPages: Math.ceil(total / limit), total });
    } catch (error) {
        logger.error("Get campaigns error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch campaigns" });
    }
};

/**
 * GET /api/v1/campaigns/stats
 */
export const getCampaignStats = async (req, res) => {
    try {
        const [total, active, expired, cancelled, mandatory, voluntary] = await Promise.all([
            Campaign.countDocuments(),
            Campaign.countDocuments({ status: "active" }),
            Campaign.countDocuments({ status: "expired" }),
            Campaign.countDocuments({ status: "cancelled" }),
            Campaign.countDocuments({ type: "mandatory", status: "active" }),
            Campaign.countDocuments({ type: "voluntary", status: "active" }),
        ]);

        res.json({
            success: true,
            data: { total, active, expired, cancelled, mandatory, voluntary },
        });
    } catch (error) {
        logger.error("Get campaign stats error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch stats" });
    }
};

/**
 * PUT /api/v1/campaigns/:id
 * Update campaign
 */
export const updateCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, discountPercent, status, endDate, image } = req.body;

        const campaign = await Campaign.findById(id);
        if (!campaign) {
            return res.status(404).json({ success: false, message: "Campaign not found" });
        }

        if (title) campaign.title = title;
        if (description !== undefined) campaign.description = description;
        if (image !== undefined) campaign.image = image;
        if (discountPercent) campaign.discountPercent = discountPercent;
        if (status) campaign.status = status;
        if (endDate) campaign.endDate = new Date(endDate);

        await campaign.save();

        const populated = await Campaign.findById(id)
            .populate("games", "name slug icon")
            .populate("createdBy", "username")
            .lean();

        res.json({ success: true, data: populated });
    } catch (error) {
        logger.error("Update campaign error:", error);
        res.status(500).json({ success: false, message: "Failed to update campaign" });
    }
};

/**
 * PUT /api/v1/campaigns/:id/cancel
 * Cancel a campaign
 */
export const cancelCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const campaign = await Campaign.findByIdAndUpdate(id, { status: "cancelled" }, { new: true })
            .populate("games", "name slug icon")
            .lean();

        if (!campaign) {
            return res.status(404).json({ success: false, message: "Campaign not found" });
        }

        res.json({ success: true, data: campaign });
    } catch (error) {
        logger.error("Cancel campaign error:", error);
        res.status(500).json({ success: false, message: "Failed to cancel campaign" });
    }
};

/**
 * GET /api/v1/campaigns/:id
 * Get single campaign with full details (admin)
 */
export const getCampaignById = async (req, res) => {
    try {
        const { id } = req.params;
        const campaign = await Campaign.findById(id)
            .populate("games", "name slug icon")
            .populate("createdBy", "username")
            .populate({
                path: "participatingListings.listing",
                select: "title price coverImage images game status",
                populate: { path: "game", select: "name" },
            })
            .populate("participatingListings.seller", "username avatar")
            .lean();

        if (!campaign) {
            return res.status(404).json({ success: false, message: "Campaign not found" });
        }

        res.json({ success: true, data: campaign });
    } catch (error) {
        logger.error("Get campaign error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch campaign" });
    }
};

// ═══════════════════════════════════════════════════════
// PUBLIC ENDPOINTS
// ═══════════════════════════════════════════════════════

/**
 * GET /api/v1/campaigns/active
 * Get active campaigns with their listings for user dashboard
 */
export const getActiveCampaigns = async (req, res) => {
    try {
        const now = new Date();

        const campaigns = await Campaign.find({
            status: "active",
            endDate: { $gte: now },
        })
            .populate("games", "name slug icon")
            .sort({ createdAt: -1 })
            .lean();

        // For each campaign, fetch the relevant listings
        const result = await Promise.all(campaigns.map(async (campaign) => {
            let listings = [];

            if (campaign.type === "mandatory") {
                // All available listings for the campaign's games
                listings = await Listing.find({
                    game: { $in: campaign.games.map(g => g._id) },
                    status: "available",
                })
                    .populate("game", "name slug")
                    .populate("seller", "username avatar")
                    .sort({ createdAt: -1 })
                    .limit(30)
                    .lean();

                // Calculate discounted prices for display
                listings = listings.map(l => ({
                    ...l,
                    campaignDiscount: {
                        type: "mandatory",
                        discountPercent: campaign.discountPercent,
                        originalPrice: l.price,
                        discountedPrice: parseFloat((l.price * (1 - campaign.discountPercent / 100)).toFixed(2)),
                        label: `${campaign.discountPercent}% off`,
                    },
                }));
            } else {
                // Voluntary: only participating listings
                const participatingIds = campaign.participatingListings.map(p => p.listing);
                if (participatingIds.length > 0) {
                    listings = await Listing.find({
                        _id: { $in: participatingIds },
                        status: "available",
                    })
                        .populate("game", "name slug")
                        .populate("seller", "username avatar")
                        .sort({ createdAt: -1 })
                        .limit(30)
                        .lean();

                    // Calculate discounted prices for display
                    listings = listings.map(l => ({
                        ...l,
                        campaignDiscount: {
                            type: "voluntary",
                            discountPercent: campaign.discountPercent,
                            originalPrice: l.price,
                            discountedPrice: parseFloat((l.price * (1 - campaign.discountPercent / 100)).toFixed(2)),
                            label: `${campaign.discountPercent}% off`,
                        },
                    }));
                }
            }

            return {
                _id: campaign._id,
                title: campaign.title,
                description: campaign.description,
                type: campaign.type,
                image: campaign.image,
                discountPercent: campaign.discountPercent,
                games: campaign.games,
                endDate: campaign.endDate,
                listings,
                listingCount: listings.length,
            };
        }));

        // Filter out campaigns with no listings
        const withListings = result.filter(c => c.listingCount > 0);

        res.json({ success: true, data: withListings });
    } catch (error) {
        logger.error("Get active campaigns error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch campaigns" });
    }
};

// ═══════════════════════════════════════════════════════
// SELLER ENDPOINTS
// ═══════════════════════════════════════════════════════

/**
 * GET /api/v1/campaigns/my-invites
 * Get campaigns the seller has been invited to
 */
export const getMyInvites = async (req, res) => {
    try {
        const sellerId = req.user._id;
        const now = new Date();

        // Get all games the seller has listings for
        const sellerListings = await Listing.find({
            seller: sellerId,
            status: "available",
        }).select("game").lean();
        const sellerGameIds = [...new Set(sellerListings.map(l => l.game.toString()))];

        // Find campaigns where seller was notified OR has listings matching campaign games
        const campaigns = await Campaign.find({
            type: "voluntary",
            status: "active",
            endDate: { $gte: now },
            $or: [
                { notifiedSellers: sellerId },
                { games: { $in: sellerGameIds } },
            ],
        })
            .populate("games", "name slug icon")
            .sort({ createdAt: -1 })
            .lean();

        // Auto-add seller to notifiedSellers for any campaign they weren't notified about
        for (const campaign of campaigns) {
            const wasNotified = (campaign.notifiedSellers || []).some(
                id => id.toString() === sellerId.toString()
            );
            if (!wasNotified) {
                await Campaign.updateOne(
                    { _id: campaign._id },
                    { $addToSet: { notifiedSellers: sellerId } }
                );
            }
        }

        // For each campaign, get seller's eligible listings and participation status
        const enriched = await Promise.all(campaigns.map(async (campaign) => {
            const eligibleListings = await Listing.find({
                seller: sellerId,
                game: { $in: campaign.games.map(g => g._id) },
                status: "available",
            })
                .populate("game", "name slug")
                .select("title price coverImage images game status")
                .lean();

            const participatingIds = new Set(
                campaign.participatingListings
                    .filter(p => p.seller.toString() === sellerId.toString())
                    .map(p => p.listing.toString())
            );

            return {
                _id: campaign._id,
                title: campaign.title,
                description: campaign.description,
                discountPercent: campaign.discountPercent,
                image: campaign.image,
                games: campaign.games,
                endDate: campaign.endDate,
                eligibleListings: eligibleListings.map(l => ({
                    ...l,
                    isParticipating: participatingIds.has(l._id.toString()),
                })),
                participatingCount: participatingIds.size,
            };
        }));

        res.json({ success: true, data: enriched });
    } catch (error) {
        logger.error("Get my invites error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch invites" });
    }
};

/**
 * POST /api/v1/campaigns/:id/join
 * Seller joins a voluntary campaign with specific listings
 * Body: { listingIds: ["id1", "id2"] }
 */
export const joinCampaign = async (req, res) => {
    try {
        const sellerId = req.user._id;
        const { id } = req.params;
        const { listingIds } = req.body;

        if (!listingIds?.length) {
            return res.status(400).json({ success: false, message: "listingIds required" });
        }

        const campaign = await Campaign.findOne({
            _id: id,
            type: "voluntary",
            status: "active",
            endDate: { $gte: new Date() },
        });

        if (!campaign) {
            return res.status(404).json({ success: false, message: "Campaign not found or not active" });
        }

        // Verify all listings belong to seller and are for the campaign's games
        const listings = await Listing.find({
            _id: { $in: listingIds },
            seller: sellerId,
            game: { $in: campaign.games },
            status: "available",
        });

        if (listings.length === 0) {
            return res.status(400).json({ success: false, message: "No valid listings found" });
        }

        // Remove existing participations for this seller in this campaign
        campaign.participatingListings = campaign.participatingListings.filter(
            p => p.seller.toString() !== sellerId.toString()
        );

        // Add new participations
        listings.forEach(listing => {
            campaign.participatingListings.push({
                listing: listing._id,
                seller: sellerId,
            });
        });

        await campaign.save();

        res.json({
            success: true,
            message: `Successfully joined! ${listings.length} accounts participating in the discount`,
            participatingCount: listings.length,
        });
    } catch (error) {
        logger.error("Join campaign error:", error);
        res.status(500).json({ success: false, message: "Failed to join campaign" });
    }
};

/**
 * DELETE /api/v1/campaigns/:id/leave
 * Seller leaves a voluntary campaign
 */
export const leaveCampaign = async (req, res) => {
    try {
        const sellerId = req.user._id;
        const { id } = req.params;

        const campaign = await Campaign.findById(id);
        if (!campaign) {
            return res.status(404).json({ success: false, message: "Campaign not found" });
        }

        campaign.participatingListings = campaign.participatingListings.filter(
            p => p.seller.toString() !== sellerId.toString()
        );
        await campaign.save();

        res.json({ success: true, message: "Left the campaign successfully" });
    } catch (error) {
        logger.error("Leave campaign error:", error);
        res.status(500).json({ success: false, message: "Failed to leave campaign" });
    }
};

/**
 * GET /api/v1/campaigns/:id/check-discount/:listingId
 * Check if a listing is in an active campaign (used during purchase)
 * Returns discount info if applicable
 */
export const checkListingDiscount = async (req, res) => {
    try {
        const { id, listingId } = req.params;
        const now = new Date();

        const campaign = await Campaign.findOne({
            _id: id,
            status: "active",
            endDate: { $gte: now },
        }).lean();

        if (!campaign) {
            return res.json({ success: true, data: null });
        }

        const listing = await Listing.findById(listingId).lean();
        if (!listing) {
            return res.json({ success: true, data: null });
        }

        let discountInfo = null;

        if (campaign.type === "mandatory") {
            // Check if listing's game is in the campaign
            if (campaign.games.some(g => g.toString() === listing.game.toString())) {
                discountInfo = {
                    campaignId: campaign._id,
                    type: "mandatory",
                    discountPercent: campaign.discountPercent,
                    // Price stays the same, commission is reduced
                    price: listing.price,
                    commissionDiscount: campaign.discountPercent,
                };
            }
        } else {
            // Voluntary: check if listing is participating
            const isParticipating = campaign.participatingListings.some(
                p => p.listing.toString() === listingId
            );
            if (isParticipating) {
                const discountedPrice = parseFloat((listing.price * (1 - campaign.discountPercent / 100)).toFixed(2));
                discountInfo = {
                    campaignId: campaign._id,
                    type: "voluntary",
                    discountPercent: campaign.discountPercent,
                    originalPrice: listing.price,
                    discountedPrice,
                };
            }
        }

        res.json({ success: true, data: discountInfo });
    } catch (error) {
        logger.error("Check listing discount error:", error);
        res.status(500).json({ success: false, message: "Failed to check discount" });
    }
};

/**
 * GET /api/v1/campaigns/listing/:listingId/active-discount
 * Check if a listing has any active campaign discount (for purchase flow)
 */
export const getListingActiveCampaign = async (req, res) => {
    try {
        const { listingId } = req.params;
        const now = new Date();

        const listing = await Listing.findById(listingId).lean();
        if (!listing) {
            return res.json({ success: true, data: null });
        }

        // Check mandatory campaigns first
        const mandatoryCampaign = await Campaign.findOne({
            type: "mandatory",
            status: "active",
            endDate: { $gte: now },
            games: listing.game,
        }).lean();

        if (mandatoryCampaign) {
            return res.json({
                success: true,
                data: {
                    campaignId: mandatoryCampaign._id,
                    type: "mandatory",
                    title: mandatoryCampaign.title,
                    discountPercent: mandatoryCampaign.discountPercent,
                    price: listing.price,
                    commissionDiscount: mandatoryCampaign.discountPercent,
                },
            });
        }

        // Check voluntary campaigns
        const voluntaryCampaign = await Campaign.findOne({
            type: "voluntary",
            status: "active",
            endDate: { $gte: now },
            "participatingListings.listing": listing._id,
        }).lean();

        if (voluntaryCampaign) {
            const discountedPrice = parseFloat(
                (listing.price * (1 - voluntaryCampaign.discountPercent / 100)).toFixed(2)
            );
            return res.json({
                success: true,
                data: {
                    campaignId: voluntaryCampaign._id,
                    type: "voluntary",
                    title: voluntaryCampaign.title,
                    discountPercent: voluntaryCampaign.discountPercent,
                    originalPrice: listing.price,
                    discountedPrice,
                },
            });
        }

        res.json({ success: true, data: null });
    } catch (error) {
        logger.error("Get listing active campaign error:", error);
        res.status(500).json({ success: false, message: "Failed to check campaign" });
    }
};
