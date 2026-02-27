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
  status: { type: String, enum: ["available", "sold"], default: "available" },

  /* ═══════════ ANALYTICS / STATS ═══════════ */
  stats: {
    // Views
    viewCount: { type: Number, default: 0 },
    viewsToday: { type: Number, default: 0 },
    viewsLast7d: { type: Number, default: 0 },
    viewsLast30d: { type: Number, default: 0 },
    // Sales (derived from transactions)
    salesCount: { type: Number, default: 0 },
    salesLast24h: { type: Number, default: 0 },
    salesLast7d: { type: Number, default: 0 },
    salesLast30d: { type: Number, default: 0 },
    // Engagement
    wishlistCount: { type: Number, default: 0 },
    // Ratings
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    ratingSum: { type: Number, default: 0 },
  },

  /* ═══════════ PRE-COMPUTED RANKING SCORES ═══════════ */
  ranking: {
    bestSeller: { type: Number, default: 0 },
    trending: { type: Number, default: 0 },
    popular: { type: Number, default: 0 },
    updatedAt: { type: Date, default: null },
  },
}, { timestamps: true });

// ─── Performance indexes ─────────────────────────────────────
listingSchema.index({ seller: 1, status: 1, createdAt: -1 });
listingSchema.index({ game: 1, status: 1, price: 1 });
listingSchema.index({ status: 1, createdAt: -1 });
listingSchema.index({ price: 1, status: 1 });
listingSchema.index({ title: 'text', description: 'text' });

// ─── Ranking indexes (descending for top-N queries) ──────────
listingSchema.index({ status: 1, 'ranking.bestSeller': -1 });
listingSchema.index({ status: 1, 'ranking.trending': -1 });
listingSchema.index({ status: 1, 'ranking.popular': -1 });

// ─── Stats index for the cron aggregation pipeline ───────────
listingSchema.index({ 'stats.viewCount': -1, status: 1 });

export default mongoose.model("Listing", listingSchema);
