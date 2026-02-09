import mongoose from "mongoose";

const promotionSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    days: {
      type: Number,
      required: true,
      min: 1,
      max: 30,
    },
    cost: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired", "active"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

promotionSchema.index({ seller: 1, status: 1 });
promotionSchema.index({ status: 1, createdAt: -1 });
promotionSchema.index({ listing: 1 });
promotionSchema.index({ endDate: 1, status: 1 });

const Promotion = mongoose.model("Promotion", promotionSchema);
export default Promotion;
