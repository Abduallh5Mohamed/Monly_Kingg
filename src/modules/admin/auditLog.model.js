import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  action: { type: String, required: true },
  category: {
    type: String,
    enum: ["auth", "ip_management", "settings", "session", "security", "user_management"],
    required: true
  },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  targetModel: { type: String, default: null },
  targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  ip: { type: String, default: null },
  userAgent: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

// Auto-delete logs older than 1 year
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export default mongoose.model("AuditLog", auditLogSchema);
