import User from "./user.model.js";
import bcrypt from "bcrypt";
import escapeRegex from "../../utils/escapeRegex.js";

export const createUser = async (data) => {
  // منع تحديد الدور عند إنشاء مستخدم
  const userData = { ...data };
  delete userData.role;

  const hashedPassword = await bcrypt.hash(userData.password, 10);
  const user = new User({ ...userData, password: hashedPassword, role: "user" }); // الدور دائمًا 'user'
  return await user.save();
};

export const getUserById = async (id) => {
  return await User.findById(id).populate("badges");
};

export const updateUser = async (id, updates) => {
  // SECURITY FIX: [CRIT-06] Never allow sensitive/privileged field updates through service layer.
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
    updates.passwordHash = await bcrypt.hash(updates.password, 10);
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

    // SECURITY FIX: [MED-07] Restrict search to username only to reduce email enumeration risk.
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
