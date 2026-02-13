import mongoose from "mongoose";

const listingSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  game: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true },
  title: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  details: { type: Object }, // الفورم الخاصة باللعبة
  images: [{ type: String }], // صور الأكونت
  coverImage: { type: String }, // صورة الكوفر (اختياري)
  status: { type: String, enum: ["available", "sold"], default: "available" }
}, { timestamps: true });

// Performance indexes
listingSchema.index({ seller: 1, status: 1, createdAt: -1 }); // For seller's listings
listingSchema.index({ game: 1, status: 1, price: 1 }); // For game filtering & sorting
listingSchema.index({ status: 1, createdAt: -1 }); // For latest available listings
listingSchema.index({ price: 1, status: 1 }); // For price filtering
listingSchema.index({ title: 'text', description: 'text' }); // For text search

export default mongoose.model("Listing", listingSchema);
