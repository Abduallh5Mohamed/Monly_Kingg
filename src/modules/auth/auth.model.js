// modules/auth/authToken.model.js
import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
  type: { type: String, enum: ["refresh","verifyEmail","resetPassword"], required: true },
  tokenHash: { type: String, required: true }, // خزّن الهاش فقط
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false }
}, { timestamps: true });

tokenSchema.index({ type: 1, expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { type: { $ne: "refresh" } } });
export default mongoose.model("AuthToken", tokenSchema);
