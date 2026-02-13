import mongoose from "mongoose";

const rejectionHistorySchema = new mongoose.Schema({
  reason: { type: String },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  rejectedAt: { type: Date, default: Date.now },
  // snapshot of the old application data
  idType: { type: String },
  fullName: { type: String },
}, { _id: false });

const sellerRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  idType: { type: String, enum: ["national_id", "passport"], required: true },
  idImage: { type: String, required: true }, // صورة واحدة للبطاقة أو الباسبور (base64 or URL)

  // صور الوجه من 3 جهات (required)
  faceImageFront: { type: String, required: true }, // سيلفي أمامي واضح
  faceImageLeft: { type: String, required: true }, // صورة من الجانب الأيسر
  faceImageRight: { type: String, required: true }, // صورة من الجانب الأيمن

  fullName: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  rejectionReason: { type: String },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewedAt: { type: Date },

  // Reapplication tracking
  applicationCount: { type: Number, default: 1 },
  rejectionHistory: [rejectionHistorySchema],
}, { timestamps: true });

sellerRequestSchema.index({ user: 1 }, { unique: true });
sellerRequestSchema.index({ status: 1 });

export default mongoose.model("SellerRequest", sellerRequestSchema);
