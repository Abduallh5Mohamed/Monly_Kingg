import mongoose from "mongoose";

const refreshTokenSubSchema = new mongoose.Schema({
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  revoked: { type: Boolean, default: false },
  revokedAt: { type: Date },
  replacedByToken: { type: String, default: null },
  ip: { type: String, default: null },
  userAgent: { type: String, default: null }
}, { _id: false });

const userSchema = new mongoose.Schema({
  email: { type: String, required: [true, 'Email is required'], trim: true, lowercase: true },
  username: { type: String, unique: true, required: [true, 'Username is required!'], minLength: [5, "Username must have 5 characters!"], lowercase: true, trim: true },
  passwordHash: { type: String, required: [true, "Password must be provided!"], trim: true, select: false },

  verified: { type: Boolean, default: false },
  verificationCode: { type: String, select: false },
  verificationCodeValidation: { type: Date, select: false },
  lastVerificationSentAt: { type: Date, select: false },

  forgotPasswordCode: { type: String, select: false },
  forgotPasswordCodeValidation: { type: Date, select: false },

  // Password reset system
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  lastPasswordResetSentAt: { type: Date, select: false },

  googleId: { type: String },

  role: { type: String, enum: ["user", "admin"], default: "user" },

  isSeller: { type: Boolean, default: false },
  sellerApprovedAt: { type: Date },

  // Profile info
  fullName: { type: String, trim: true },
  phone: { type: String },
  address: { type: String },
  avatar: { type: String, default: null },
  bio: { type: String, maxlength: 500 },
  profileCompleted: { type: Boolean, default: false },

  // Track username/phone changes (every 20 days)
  lastUsernameChange: { type: Date, default: null },
  lastPhoneChange: { type: Date, default: null },

  twoFA: {
    enabled: { type: Boolean, default: false },
    secret: { type: String },
    backupCodes: [{ codeHash: String, used: { type: Boolean, default: false } }]
  },

  wallet: {
    balance: { type: Number, default: 0 },
    hold: { type: Number, default: 0 }
  },
  stats: {
    totalVolume: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    successfulTrades: { type: Number, default: 0 },
    failedTrades: { type: Number, default: 0 }
  },

  badges: [{ badgeId: { type: mongoose.Schema.Types.ObjectId, ref: "Badge" }, earnedAt: { type: Date, default: Date.now } }],

  // Auth tokens stored here (refresh tokens)
  refreshTokens: [refreshTokenSubSchema],

  // brute-force protection
  failedLoginAttempts: { type: Number, default: 0, select: false },
  lockUntil: { type: Date, select: false },

  // simple audit log for auth events
  authLogs: [{
    action: { type: String }, // login, login_failed, resend_code, verify, refresh, logout
    success: { type: Boolean },
    ip: { type: String },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],

  isOnline: { type: Boolean, default: false },
  lastSeenAt: { type: Date, default: Date.now }
},
  { timestamps: true });

// Indexes for performance optimization
userSchema.index({ username: 1, createdAt: -1 });
userSchema.index({ email: 1 }, { unique: true, sparse: true }); // للبحث السريع بالإيميل
userSchema.index({ verificationCode: 1 }); // للتحقق من الإيميل
userSchema.index({ passwordResetToken: 1 }); // لإعادة تعيين كلمة المرور
userSchema.index({ 'refreshTokens.token': 1 }); // للبحث في refresh tokens
userSchema.index({ googleId: 1 }); // للـ OAuth
userSchema.index({ role: 1 }); // لفلترة الأدمنز
userSchema.index({ isOnline: 1, lastSeenAt: -1 }); // لجلب المستخدمين النشطين

export default mongoose.model("User", userSchema);
