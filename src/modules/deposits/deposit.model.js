import mongoose from "mongoose";

const depositSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  // Payment information
  paymentMethod: {
    type: String,
    enum: ["instapay", "vodafone_cash"],
    required: true
  },
  amount: { type: Number, required: true }, // المبلغ المدفوع

  // Sender information
  senderFullName: { type: String, required: true }, // اسم صاحب المحفظة
  senderPhoneOrEmail: { type: String, required: true }, // رقم أو إيميل المرسل

  // Deposit details
  depositDate: { type: Date, required: true }, // تاريخ الإيداع
  receiptImage: { type: String, required: true }, // صورة الوصل
  gameTitle: { type: String }, // اسم اللعبة (اختياري)

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

export default mongoose.model("Deposit", depositSchema);
