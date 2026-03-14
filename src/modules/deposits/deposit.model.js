import mongoose from "mongoose";

const depositSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  // Payment information
  paymentMethod: {
    type: String,
    enum: ["instapay", "vodafone_cash"],
    required: true
  },
  amount: { type: Number, required: true, min: 500, max: 50000 }, // المبلغ المدفوع

  // Sender information
  senderFullName: { type: String, required: true }, // اسم صاحب المحفظة
  senderPhoneOrEmail: { type: String, required: true }, // رقم أو إيميل المرسل

  // Deposit details
  depositDate: { type: Date, required: true }, // تاريخ الإيداع
  receiptImage: { type: String, required: true }, // صورة الوصل
  gameTitle: { type: String }, // اسم اللعبة (اختياري)

  // SECURITY FIX: Optional idempotency key to prevent duplicate submission races.
  idempotencyKey: { type: String, sparse: true },

  // Legacy fields (for backward compatibility)
  accountName: String,
  walletNumber: String,
  paidAmount: Number,
  creditedAmount: Number,

  // Status
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },

  // Admin notes
  adminNote: String,
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  processedAt: Date
}, { timestamps: true });

depositSchema.index({ user: 1, status: 1 });
depositSchema.index({ status: 1, createdAt: -1 });
// SECURITY FIX: Keep a time-based index for duplicate-window checks and analytics.
depositSchema.index({ user: 1, createdAt: -1 });
// SECURITY FIX: [CRIT-04] Prevent duplicate idempotent submits per user.
depositSchema.index(
  { user: 1, idempotencyKey: 1 },
  { unique: true, sparse: true, partialFilterExpression: { idempotencyKey: { $exists: true } } }
);

export default mongoose.model("Deposit", depositSchema);
