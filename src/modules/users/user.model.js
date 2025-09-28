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
  email: { type: String, required: [true, 'Email is required'], unique: true, sparse: true, trim: true, lowercase: true },
  username: { type: String, unique: true, required: [true, 'Username is required!'], minLength: [5, "Username must have 5 characters!"], lowercase: true, trim: true },
  passwordHash: { type: String, required: [true, "Password must be provided!"], trim: true, select: false },

  verified: { type: Boolean, default: false },
  verificationCode: { type: String, select: false },
  verificationCodeValidation: { type: Date, select: false },
  lastVerificationSentAt: { type: Date, select: false },

  forgotPasswordCode: { type: String, select: false },
  forgotPasswordCodeValidation: { type: Date, select: false },

  googleId: { type: String, index: true },

  role: { type: String, enum: ["user", "admin"], default: "user", index: true },

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

userSchema.index({ username: 1, createdAt: -1 });

export default mongoose.model("User", userSchema);
