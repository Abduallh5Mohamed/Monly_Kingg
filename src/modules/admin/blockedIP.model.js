import mongoose from "mongoose";

const blockedIPSchema = new mongoose.Schema({
  ip: { type: String, default: null },
  // For IP range blocking
  ipRangeStart: { type: String, default: null },
  ipRangeEnd: { type: String, default: null },
  type: {
    type: String,
    enum: ["blocked", "whitelisted"],
    default: "blocked"
  },
  reason: { type: String, default: "" },
  attempts: { type: Number, default: 0 },
  blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  expiresAt: { type: Date, default: null } // null = permanent
}, { timestamps: true });

// Indexes
blockedIPSchema.index({ ip: 1 });
blockedIPSchema.index({ type: 1 });
blockedIPSchema.index({ createdAt: -1 });

export default mongoose.model("BlockedIP", blockedIPSchema);
