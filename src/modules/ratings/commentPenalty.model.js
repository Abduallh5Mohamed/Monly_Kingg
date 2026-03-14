import mongoose from "mongoose";

const commentPenaltySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  bannedUntil: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

commentPenaltySchema.index({ user: 1, bannedUntil: -1 });

export default mongoose.model("CommentPenalty", commentPenaltySchema);
