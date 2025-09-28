import User from "./user.model.js";
import bcrypt from "bcrypt";

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
  // إزالة خاصية الدور من التحديثات
  if (updates.role) {
    delete updates.role;
  }

  // تحديث كلمة المرور إذا وجدت
  if (updates.password) {
    updates.password = await bcrypt.hash(updates.password, 10);
  }

  // تنفيذ التحديث بعد إزالة الخصائص المحظورة
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
  const user = await User.findById(id);
  user.xp += amount;

  // حساب الليفل الجديد
  let nextLevelRequirement = user.level * 500;
  if (user.xp >= nextLevelRequirement) {
    user.level += 1;
  }

  return await user.save();
};
