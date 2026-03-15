import Favorite from "./favorite.model.js";
import Listing from "../listings/listing.model.js";
import logger from "../../utils/logger.js";

/**
 * POST /api/v1/favorites/:listingId
 * Toggle favorite — adds if not exists, removes if exists
 */
export const toggleFavorite = async (req, res) => {
    try {
        const userId = req.user._id;
        const { listingId } = req.params;

        // Verify listing exists and is available
        const listing = await Listing.findById(listingId).select("_id status").lean();
        if (!listing) {
            return res.status(404).json({ success: false, message: "Listing not found" });
        }

        const existing = await Favorite.findOne({ user: userId, listing: listingId });

        if (existing) {
            await Favorite.deleteOne({ _id: existing._id });
            return res.json({ success: true, favorited: false, message: "Removed from favorites" });
        }

        await Favorite.create({ user: userId, listing: listingId });
        return res.json({ success: true, favorited: true, message: "Added to favorites" });
    } catch (error) {
        logger.error("Toggle favorite error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

/**
 * GET /api/v1/favorites
 * Get user's favorited listings (paginated)
 */
export const getMyFavorites = async (req, res) => {
    try {
        const userId = req.user._id;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const [favorites, total] = await Promise.all([
            Favorite.find({ user: userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate({
                    path: "listing",
                    select: "title price coverImage images game seller status createdAt",
                    populate: [
                        { path: "game", select: "name slug" },
                        { path: "seller", select: "username avatar" },
                    ],
                })
                .lean(),
            Favorite.countDocuments({ user: userId }),
        ]);

        // Filter out favorites where listing was deleted
        const validFavorites = favorites.filter(f => f.listing != null);

        return res.json({
            success: true,
            data: validFavorites.map(f => ({
                _id: f._id,
                listing: f.listing,
                createdAt: f.createdAt,
            })),
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        logger.error("Get favorites error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

/**
 * GET /api/v1/favorites/ids
 * Get just the listing IDs the user has favorited (for quick lookup)
 */
export const getMyFavoriteIds = async (req, res) => {
    try {
        const userId = req.user._id;
        const favorites = await Favorite.find({ user: userId }).select("listing").lean();
        const ids = favorites.map(f => f.listing.toString());
        return res.json({ success: true, data: ids });
    } catch (error) {
        logger.error("Get favorite IDs error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};
