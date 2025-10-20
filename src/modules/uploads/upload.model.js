import mongoose from "mongoose";

const uploadSchema = new mongoose.Schema({
  // نوع الملف المرفوع
  type: {
    type: String,
    enum: ["profile_picture", "payment_proof", "account_image", "chat_media", "ticket_attachment", "other"],
    required: true,
    index: true
  },

  // بيانات الملف
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  fileSize: { type: Number, required: true }, // بالبايت
  filePath: { type: String, required: true }, // المسار على السيرفر أو في الكلاود
  url: { type: String, required: true }, // الرابط العام للملف

  // معلومات المستخدم اللي رفع الملف
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  // ربط الملف بموديل معين (اختياري)
  relatedTo: {
    model: { type: String, enum: ["User", "Deposit", "Chat", "Ticket", "Listing", null], default: null },
    id: { type: mongoose.Schema.Types.ObjectId, default: null }
  },

  // حالة الملف
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "active", "deleted"],
    default: "active",
    index: true
  },

  // معلومات الموافقة/الرفض (للصور اللي تحتاج مراجعة)
  moderation: {
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    notes: { type: String }
  },

  // Metadata إضافية
  metadata: {
    width: Number, // للصور
    height: Number, // للصور
    duration: Number, // للفيديو/صوت
    thumbnailUrl: String // للفيديوهات
  },

  // للأمان: تتبع IP والـ user agent
  uploadInfo: {
    ip: { type: String },
    userAgent: { type: String }
  },

  // Soft delete
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes مركبة لتسريع الاستعلامات
uploadSchema.index({ uploadedBy: 1, type: 1, createdAt: -1 });
uploadSchema.index({ type: 1, status: 1, createdAt: -1 });
uploadSchema.index({ 'relatedTo.model': 1, 'relatedTo.id': 1 });
uploadSchema.index({ isDeleted: 1, status: 1 });

// Method للـ soft delete
uploadSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.status = "deleted";
  return await this.save();
};

// Static method لجلب صور مستخدم معين
uploadSchema.statics.getUserUploads = function (userId, type = null, limit = 50) {
  const query = { uploadedBy: userId, isDeleted: false };
  if (type) query.type = type;

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Static method لحذف الملفات القديمة (cleanup)
uploadSchema.statics.cleanupOldFiles = function (daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    isDeleted: true,
    deletedAt: { $lt: cutoffDate }
  });
};

export default mongoose.model("Upload", uploadSchema);
