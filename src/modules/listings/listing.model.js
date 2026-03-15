import mongoose from "mongoose";

const MAX_DETAILS_SIZE_BYTES = 10_000;
const MAX_DETAILS_DEPTH = 5;

/**
 * Validate maximum nesting depth for listing details objects.
 * @param {unknown} value
 * @param {number} depth
 * @returns {boolean}
 */
function isDetailsDepthValid(value, depth = 0) {
  if (depth > MAX_DETAILS_DEPTH) return false;
  if (!value || typeof value !== "object") return true;
  return Object.values(value).every((child) => isDetailsDepthValid(child, depth + 1));
}

/**
 * Validate listing details payload size and structure.
 * @param {unknown} details
 * @returns {boolean}
 */
function validateListingDetails(details) {
  if (details === undefined || details === null) return true;
  if (typeof details !== "object" || Array.isArray(details)) return false;

  let serialized = "";
  try {
    serialized = JSON.stringify(details);
  } catch (_err) {
    return false;
  }

  if (Buffer.byteLength(serialized, "utf8") > MAX_DETAILS_SIZE_BYTES) {
    return false;
  }

  return isDetailsDepthValid(details);
}

const listingSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  game: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true },
  title: { type: String, required: true },
  description: { type: String, maxlength: 2000 },
  price: { type: Number, required: true },
  details: {
    type: Object,
    validate: {
      validator: validateListingDetails,
      message: "Details field exceeds allowed complexity or size"
    }
  },
  images: [{ type: String }],
  coverImage: { type: String },
  status: { type: String, enum: ["available", "in_progress", "sold"], default: "available" }
}, { timestamps: true });

// Performance indexes
listingSchema.index({ seller: 1, status: 1, createdAt: -1 }); // For seller's listings
listingSchema.index({ game: 1, status: 1, price: 1 }); // For game filtering & sorting
listingSchema.index({ status: 1, createdAt: -1 }); // For latest available listings
listingSchema.index({ price: 1, status: 1 }); // For price filtering
listingSchema.index({ title: 'text', description: 'text' }); // For text search

export default mongoose.model("Listing", listingSchema);
