import mongoose from "mongoose";

const sellerRatingSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  rater: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  rating: {
    type: Number,
    required: [true, "Rating is required"],
    min: [1, "Rating must be at least 1"],
    max: [5, "Rating cannot exceed 5"],
  },
  comment: {
    type: String,
    maxlength: [500, "Comment cannot exceed 500 characters"],
    trim: true,
    default: null,
  },
}, { timestamps: true });

// One rating per rater per seller
sellerRatingSchema.index({ seller: 1, rater: 1 }, { unique: true });
// Fast lookups for seller ratings page
sellerRatingSchema.index({ seller: 1, createdAt: -1 });

export default mongoose.model("SellerRating", sellerRatingSchema);
