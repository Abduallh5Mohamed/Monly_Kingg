import mongoose from "mongoose";

/**
 * Discount Campaign Model
 * 
 * type: "mandatory" → Admin forces discount from system commission on selected games
 *       "voluntary" → Admin creates campaign, sellers opt-in
 *
 * For mandatory:
 *   - discountPercent is % of the SYSTEM COMMISSION (not the account price)
 *   - e.g. if system takes 10% commission and discountPercent=50, system takes 5% instead
 *   - All available listings for selected games are automatically included
 *
 * For voluntary:
 *   - discountPercent is % off the listing price (seller bears it)
 *   - Sellers get notified and can opt-in with specific listings
 */

const campaignListingSchema = new mongoose.Schema({
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    joinedAt: { type: Date, default: Date.now },
}, { _id: false });

const campaignSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: "" },
    type: {
        type: String,
        enum: ["mandatory", "voluntary"],
        required: true,
    },
    image: { type: String, default: "" },              // optional banner image
    discountPercent: { type: Number, required: true, min: 1, max: 100 },
    // For mandatory: This is % of the system commission
    // For voluntary: This is % off the listing price

    games: [{ type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true }],

    status: {
        type: String,
        enum: ["active", "expired", "cancelled"],
        default: "active",
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, required: true },

    // Only for voluntary campaigns — sellers who opted in
    participatingListings: [campaignListingSchema],

    // Sellers who were notified (voluntary only)
    notifiedSellers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

campaignSchema.index({ status: 1, type: 1 });
campaignSchema.index({ games: 1, status: 1 });
campaignSchema.index({ endDate: 1, status: 1 });
campaignSchema.index({ "participatingListings.listing": 1 });
campaignSchema.index({ "participatingListings.seller": 1 });

const Campaign = mongoose.model("Campaign", campaignSchema);
export default Campaign;
