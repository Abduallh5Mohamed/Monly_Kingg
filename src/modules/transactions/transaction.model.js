import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "completed", "disputed"], default: "pending" },
  confirmedByBuyer: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model("Transaction", transactionSchema);
