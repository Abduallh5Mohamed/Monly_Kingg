import mongoose from "mongoose";

const adSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      default: "",
      maxlength: 500,
    },
    image: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      default: "",
    },
    position: {
      type: String,
      enum: ["hero", "banner", "sidebar", "popup"],
      default: "hero",
    },
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "scheduled"],
      default: "active",
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

adSchema.index({ status: 1, position: 1, priority: -1 });
adSchema.index({ startDate: 1, endDate: 1, status: 1 });
adSchema.index({ createdBy: 1 });

const Ad = mongoose.model("Ad", adSchema);
export default Ad;
