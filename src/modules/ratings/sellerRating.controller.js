import SellerRating from "./sellerRating.model.js";
import CommentPenalty from "./commentPenalty.model.js";
import User from "../users/user.model.js";
import Transaction from "../transactions/transaction.model.js";
import { createNotification } from "../notifications/notificationHelper.js";
import mongoose from "mongoose";
import logger from "../../utils/logger.js";

// ─── Profanity word list (Arabic + English) ───────────────────────────────────
const PROFANITY_LIST = [
  // Arabic slurs
  "كسمك", "كس امك", "كس اختك", "كسمه", "يبن المتناكه", "يابن المتناكة",
  "ابن المتناكة", "متناكة", "متناكه", "شرموط", "شرموطة", "شرموطه",
  "عرص", "عرصة", "معرص", "ابن العرصة", "يبن العرصة",
  "زبي", "زب", "زبر", "طيز", "طيزك",
  "كلب", "يا كلب", "ابن الكلب", "يبن الكلب",
  "حمار", "يا حمار", "ابن الحمار",
  "واطي", "واطية", "قذر", "قذرة",
  "خول", "خنيث", "لوطي",
  "منيك", "منيوك", "نياك",
  "احا", "يلعن", "يلعن ابوك", "يلعن امك",
  "ابن الوسخة", "وسخة", "وسخ",
  "حيوان", "يا حيوان",
  "اهبل", "غبي", "معفن",
  // English slurs
  "fuck", "fucking", "fucker", "fck", "f*ck",
  "shit", "shitty", "bullshit",
  "bitch", "b*tch", "btch",
  "asshole", "a**hole",
  "dick", "d*ck",
  "bastard", "moron", "idiot",
  "damn", "dammit",
  "cunt", "c*nt",
  "whore", "slut",
  "stfu", "gtfo", "wtf",
  "nigga", "nigger",
  "retard", "retarded",
];

/**
 * Check if text contains profanity.
 * Returns the first matched word or null.
 */
function detectProfanity(text) {
  if (!text) return null;
  const lower = text.toLowerCase().trim();
  for (const word of PROFANITY_LIST) {
    // Use word-boundary-aware matching for single-word entries
    // For multi-word phrases, do a simple includes check
    if (word.includes(" ")) {
      if (lower.includes(word)) return word;
    } else {
      // Build a regex that matches the word as a standalone token
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`(^|\\s|[^\\p{L}])${escaped}($|\\s|[^\\p{L}])`, "iu");
      if (re.test(lower)) return word;
    }
  }
  return null;
}

const BAN_DURATION_DAYS = 6;

// ─── Add or update a rating ───────────────────────────────────────────────────
export const addRating = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const raterId = req.user._id;
    const { rating, comment } = req.body;

    // Validate rating value
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    // Cannot rate yourself
    if (raterId.toString() === sellerId) {
      return res.status(400).json({ message: "You cannot rate yourself" });
    }

    // Check that the seller exists and is actually a seller
    const seller = await User.findById(sellerId).lean();
    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }
    if (!seller.isSeller) {
      return res.status(400).json({ message: "This user is not a seller" });
    }

    // Only verified buyers can rate a seller.
    const completedTx = await Transaction.findOne({
      buyer: raterId,
      seller: sellerId,
      status: "completed"
    }).select("_id").lean();

    if (!completedTx) {
      return res.status(403).json({
        message: "You can only rate sellers after completing a transaction with them",
        code: "NO_COMPLETED_TRANSACTION"
      });
    }

    // ── Profanity check on comment ──
    if (comment) {
      // Check if user is currently banned from commenting
      const existingBan = await User.findById(raterId).select("commentBannedUntil").lean();
      if (existingBan?.commentBannedUntil && new Date(existingBan.commentBannedUntil) > new Date()) {
        const banEnd = new Date(existingBan.commentBannedUntil);
        return res.status(403).json({
          message: `You are banned from commenting until ${banEnd.toLocaleDateString("en-US")}`,
          bannedUntil: banEnd,
        });
      }

      const flaggedWord = detectProfanity(comment);
      if (flaggedWord) {
        // Apply 6-day ban
        const bannedUntil = new Date();
        bannedUntil.setDate(bannedUntil.getDate() + BAN_DURATION_DAYS);

        // Save penalty record
        await CommentPenalty.create({
          user: raterId,
          reason: flaggedWord,
          bannedUntil,
        });

        // Update user's ban date for quick checks
        await User.findByIdAndUpdate(raterId, { commentBannedUntil: bannedUntil });

        // Notify the user
        await createNotification({
          userId: raterId,
          type: "comment_penalty",
          title: "Comment Violation ⚠️",
          message: `Your comment was rejected because it contains inappropriate language. You are banned from commenting for ${BAN_DURATION_DAYS} days (until ${bannedUntil.toLocaleDateString("en-US")}).`,
          relatedModel: "CommentPenalty",
          metadata: { bannedUntil, reason: "profanity" },
        });

        return res.status(403).json({
          message: `Your comment contains inappropriate language. You have been banned from commenting for ${BAN_DURATION_DAYS} days.`,
          bannedUntil,
        });
      }
    }

    // Upsert the rating (one per rater per seller)
    const result = await SellerRating.findOneAndUpdate(
      { seller: sellerId, rater: raterId },
      { rating, comment: comment || null },
      { upsert: true, new: true, runValidators: true }
    );

    return res.status(200).json({
      message: result.createdAt.getTime() === result.updatedAt.getTime()
        ? "Rating added successfully"
        : "Rating updated successfully",
      data: result,
      transactionId: completedTx._id
    });
  } catch (error) {
    // Duplicate key race condition
    if (error.code === 11000) {
      return res.status(409).json({ message: "You have already rated this seller. Your rating was updated." });
    }
    logger.error("addRating error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── Get all ratings for a seller ─────────────────────────────────────────────
export const getSellerRatings = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    if (!mongoose.Types.ObjectId.isValid(sellerId)) {
      return res.status(400).json({ message: "Invalid seller ID" });
    }

    const [ratings, total, avgResult] = await Promise.all([
      SellerRating.find({ seller: sellerId })
        .populate("rater", "username avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      SellerRating.countDocuments({ seller: sellerId }),
      SellerRating.aggregate([
        { $match: { seller: new mongoose.Types.ObjectId(sellerId) } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            totalRatings: { $sum: 1 },
            stars5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
            stars4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
            stars3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
            stars2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
            stars1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const stats = avgResult[0] || {
      averageRating: 0,
      totalRatings: 0,
      stars5: 0, stars4: 0, stars3: 0, stars2: 0, stars1: 0,
    };

    return res.status(200).json({
      data: ratings,
      stats: {
        averageRating: Math.round((stats.averageRating || 0) * 10) / 10,
        totalRatings: stats.totalRatings,
        distribution: {
          5: stats.stars5,
          4: stats.stars4,
          3: stats.stars3,
          2: stats.stars2,
          1: stats.stars1,
        },
      },
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    logger.error("getSellerRatings error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── Delete own rating ────────────────────────────────────────────────────────
export const deleteRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const userId = req.user._id;

    const rating = await SellerRating.findById(ratingId);
    if (!rating) {
      return res.status(404).json({ message: "Rating not found" });
    }

    if (rating.rater.toString() !== userId.toString()) {
      return res.status(403).json({ message: "You can only delete your own rating" });
    }

    await SellerRating.findByIdAndDelete(ratingId);
    return res.status(200).json({ message: "Rating deleted successfully" });
  } catch (error) {
    logger.error("deleteRating error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─── Get ratings given by current user ────────────────────────────────────────
export const getMyRatings = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const [ratings, total] = await Promise.all([
      SellerRating.find({ rater: userId })
        .populate("seller", "username avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      SellerRating.countDocuments({ rater: userId }),
    ]);

    return res.status(200).json({
      data: ratings,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    logger.error("getMyRatings error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
