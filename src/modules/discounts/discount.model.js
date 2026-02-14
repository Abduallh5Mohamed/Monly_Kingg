import mongoose from "mongoose";

const discountSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
    originalPrice: {
      type: Number,
      required: true,
    },
    discountedPrice: {
      type: Number,
      required: true,
    },
    discountPercent: {
      type: Number,
      required: true,
      min: 1,
      max: 99,
    },
    reason: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

discountSchema.index({ listing: 1, status: 1 });
discountSchema.index({ status: 1, endDate: 1 });
discountSchema.index({ createdBy: 1 });

const Discount = mongoose.model("Discount", discountSchema);
export default Discount;
