import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  buyer:   { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
  seller:  { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
  listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
  amount:  { type: Number, required: true },

  // Escrow flow:
  // waiting_seller  → seller needs to submit credentials
  // waiting_buyer   → buyer needs to confirm or dispute
  // completed       → confirmed (funds released to seller)
  // disputed        → buyer opened dispute
  // refunded        → admin refunded buyer
  // auto_confirmed  → auto-confirmed after 48h
  status: {
    type: String,
    enum: ["waiting_seller", "waiting_buyer", "completed", "disputed", "refunded", "auto_confirmed"],
    default: "waiting_seller"
  },

  // Free-form credentials submitted by seller
  credentials: [{
    key:   { type: String, required: true },
    value: { type: String, required: true }
  }],

  // When buyer must confirm by (set when seller submits credentials)
  autoConfirmAt: { type: Date },

  // Audit trail
  timeline: [{
    event:     { type: String },
    timestamp: { type: Date, default: Date.now },
    note:      { type: String }
  }],

  disputeReason:  { type: String },
  resolvedBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  resolvedNote:   { type: String },

}, { timestamps: true });

transactionSchema.index({ buyer: 1,  status: 1, createdAt: -1 });
transactionSchema.index({ seller: 1, status: 1, createdAt: -1 });
transactionSchema.index({ listing: 1 });
transactionSchema.index({ autoConfirmAt: 1, status: 1 }); // for auto-confirm job

export default mongoose.model("Transaction", transactionSchema);
