import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
  amount: { type: Number, required: true },
  originalAmount: { type: Number },       // original price before discount (if any)
  discountPercent: { type: Number },       // discount % applied (if any)

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
    key: { type: String, required: true },
    value: { type: String, required: true }
  }],

  // When buyer must confirm by (set when seller submits credentials)
  autoConfirmAt: { type: Date },

  // Audit trail
  timeline: [{
    event: { type: String },
    timestamp: { type: Date, default: Date.now },
    note: { type: String }
  }],

  // ── Commission & Payout ─────────────────────────────────────────────────
  commissionPercent: { type: Number, default: 0 },      // snapshot of site commission at time of purchase
  commissionAmount: { type: Number, default: 0 },       // amount deducted as commission
  sellerNetAmount: { type: Number, default: 0 },        // amount seller actually receives (amount - commission)
  payoutStatus: {
    type: String,
    enum: ["none", "pending_payout", "paid_out"],
    default: "none"
  },
  payoutAt: { type: Date },          // when seller funds should be released
  paidOutAt: { type: Date },         // when actually paid out

  disputeReason: { type: String },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  resolvedNote: { type: String },

  // ── Idempotency ────────────────────────────────────────────────────────────
  // Unique key supplied by the client (UUID) to prevent double-charge on retry
  idempotencyKey: { type: String },

  // ── Notification tracking ─────────────────────────────────────────────────
  // Set after the seller notification job succeeds — used by recovery scanner
  sellerNotifiedAt: { type: Date },
  // Set after the buyer notification job succeeds (credentials sent)
  buyerNotifiedAt: { type: Date },

}, { timestamps: true });

transactionSchema.index({ buyer: 1, status: 1, createdAt: -1 });
transactionSchema.index({ seller: 1, status: 1, createdAt: -1 });
transactionSchema.index({ listing: 1 });
transactionSchema.index({ autoConfirmAt: 1, status: 1 }); // for auto-confirm job
transactionSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
transactionSchema.index({ payoutStatus: 1, payoutAt: 1 }); // for payout release job

export default mongoose.model("Transaction", transactionSchema);
