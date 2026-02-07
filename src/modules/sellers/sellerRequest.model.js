import mongoose from "mongoose";

const sellerRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  idType: { type: String, enum: ["national_id", "passport"], required: true },
  idImageFront: { type: String, required: true }, // base64 or URL
  idImageBack: { type: String }, // optional back side
  fullName: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  rejectionReason: { type: String },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewedAt: { type: Date },
}, { timestamps: true });

sellerRequestSchema.index({ user: 1 });
sellerRequestSchema.index({ status: 1 });

export default mongoose.model("SellerRequest", sellerRequestSchema);
