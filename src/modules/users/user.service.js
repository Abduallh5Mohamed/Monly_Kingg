import User from "./user.model.js";
import bcrypt from "bcrypt";
import escapeRegex from "../../utils/escapeRegex.js";

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);

export const createUser = async (data) => {
  // منع تحديد الدور عند إنشاء مستخدم
  const userData = { ...data };
  delete userData.role;

  // SECURITY FIX [VULN-12]: Use centralized bcrypt rounds from environment.
  const hashedPassword = await bcrypt.hash(userData.password, BCRYPT_ROUNDS);
  const user = new User({ ...userData, password: hashedPassword, role: "user" }); // الدور دائمًا 'user'
  return await user.save();
};

export const getUserById = async (id) => {
  return await User.findById(id).populate("badges");
};

export const updateUser = async (id, updates) => {
  // SECURITY FIX [C-03]: Never allow sensitive/privileged field updates through service layer.
  const BLOCKED_FIELDS = [
    'role', 'wallet', 'isSeller', 'commissionExempt', 'verified',
    'moderatorPermissions', 'stats', 'passwordHash', 'refreshTokens',
    'verificationCode', 'passwordResetToken', 'failedLoginAttempts',
    'lockUntil', 'twoFA', 'authLogs', 'googleId', 'sellerApprovedAt'
  ];

  for (const field of BLOCKED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      delete updates[field];
    }
  }

  if (updates.password) {
    // SECURITY FIX [VULN-12]: Keep password hashing rounds consistent across modules.
    updates.passwordHash = await bcrypt.hash(updates.password, BCRYPT_ROUNDS);
    delete updates.password;
  }

  return await User.findByIdAndUpdate(id, updates, { new: true });
};

export const deleteUser = async (id) => {
  return await User.findByIdAndDelete(id);
};

export const updateBalance = async (id, amount) => {
  const user = await User.findById(id);
  user.balance += amount;
  return await user.save();
};

export const addXp = async (id, amount) => {
  // Legacy function — seller level is now auto-calculated from stats.totalVolume
  // in sellerLevel.service.js. This is kept for backward compatibility.
  const { updateSellerLevel } = await import("../seller-levels/sellerLevel.service.js");
  return await updateSellerLevel(id);
};

export const searchUsers = async (query, excludeUserId) => {
  try {
    const safeQuery = escapeRegex(String(query || '').trim().slice(0, 100));

    // SECURITY FIX [M-04]: Restrict search to username only to reduce email enumeration risk.
    const users = await User.find({
      _id: { $ne: excludeUserId }, // Exclude current user
      username: { $regex: safeQuery, $options: 'i' }
    })
      .select('username avatar')
      .limit(10);

    return users;
  } catch (error) {
    throw error;
  }
};
