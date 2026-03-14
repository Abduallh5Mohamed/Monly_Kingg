import mongoose from "mongoose";

const rankSchema = new mongoose.Schema({
  name: { type: String, required: true },
  minLevel: { type: Number, required: true },
  maxLevel: { type: Number, required: true },
  color: { type: String, required: true },
  icon: { type: String, default: "⭐" },
  commissionPercent: { type: Number, default: null },  // null = use global rate
}, { _id: true });

const levelConfigSchema = new mongoose.Schema({
  // Singleton identifier
  key: { type: String, default: "seller_levels", unique: true },

  // Formula: salesToNext(level) = multiplier * level^exponent
  // Default: 40 * level^1.3  (≈ 200 EGP at level 70→71)
  multiplier: { type: Number, default: 40 },
  exponent: { type: Number, default: 1.3 },

  // Currency
  currency: { type: String, default: "EGP" },

  // Rank tiers
  ranks: {
    type: [rankSchema],
    default: [
      { name: "Starter", minLevel: 1, maxLevel: 20, color: "#9CA3AF", icon: "🌱" },
      { name: "Bronze", minLevel: 21, maxLevel: 50, color: "#CD7F32", icon: "🥉" },
      { name: "Silver", minLevel: 51, maxLevel: 100, color: "#C0C0C0", icon: "🥈" },
      { name: "Gold", minLevel: 101, maxLevel: 200, color: "#FFD700", icon: "🥇" },
      { name: "Platinum", minLevel: 201, maxLevel: 300, color: "#E5E4E2", icon: "💎" },
      { name: "Diamond", minLevel: 301, maxLevel: 400, color: "#B9F2FF", icon: "💠" },
      { name: "Master Seller", minLevel: 401, maxLevel: 500, color: "#FF4500", icon: "👑" },
    ]
  },

  // Max level cap
  maxLevel: { type: Number, default: 500 },

  // Track who last updated the config
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

// Ensure singleton pattern
levelConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne({ key: "seller_levels" });
  if (!config) {
    config = await this.create({ key: "seller_levels" });
  }
  return config;
};

export default mongoose.model("LevelConfig", levelConfigSchema);
