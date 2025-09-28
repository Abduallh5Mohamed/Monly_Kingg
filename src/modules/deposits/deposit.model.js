import mongoose from "mongoose";

const depositSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  accountName: String,
  walletNumber: String,
  paidAmount: { type: Number, required: true },
  creditedAmount: { type: Number, required: true }, // بعد خصم أو إضافة النسبة
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" }
}, { timestamps: true });

export default mongoose.model("Deposit", depositSchema);
