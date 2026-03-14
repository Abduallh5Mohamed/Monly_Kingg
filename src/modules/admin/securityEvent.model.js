import mongoose from "mongoose";

const securityEventSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["login_attempt", "brute_force", "suspicious_traffic", "new_location", "too_many_failed"],
    required: true
  },
  ip: { type: String, required: true },
  username: { type: String, default: null },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  country: { type: String, default: "Unknown" },
  city: { type: String, default: null },
  attempts: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ["blocked", "flagged", "allowed"],
    default: "allowed"
  },
  userAgent: { type: String, default: null },
  details: { type: String, default: null },
  resolved: { type: Boolean, default: false },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  resolvedAt: { type: Date, default: null }
}, { timestamps: true });

// Indexes
securityEventSchema.index({ type: 1, createdAt: -1 });
securityEventSchema.index({ ip: 1, createdAt: -1 });
securityEventSchema.index({ status: 1 });
securityEventSchema.index({ createdAt: -1 });

// Auto-delete events older than 90 days
securityEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model("SecurityEvent", securityEventSchema);
