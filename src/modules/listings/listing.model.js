import mongoose from "mongoose";

const listingSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  game: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true },
  title: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  details: { type: Object },
  images: [{ type: String }],
  coverImage: { type: String },
  // in_progress = active transaction ongoing (escrow)
  status: { type: String, enum: ["available", "in_progress", "sold"], default: "available" }
}, { timestamps: true });

// Performance indexes
listingSchema.index({ seller: 1, status: 1, createdAt: -1 });
listingSchema.index({ game: 1, status: 1, price: 1 });
listingSchema.index({ status: 1, createdAt: -1 });
listingSchema.index({ price: 1, status: 1 });
listingSchema.index({ title: 'text', description: 'text' });

export default mongoose.model("Listing", listingSchema);
