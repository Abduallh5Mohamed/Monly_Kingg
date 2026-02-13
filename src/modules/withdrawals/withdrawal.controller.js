import Withdrawal from "./withdrawal.model.js";
import User from "../users/user.model.js";

export const submitWithdrawal = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount, method, countryCode, phoneNumber } = req.body;

    if (!amount || !method || !countryCode || !phoneNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (amount < 500) {
      return res.status(400).json({ message: "Minimum withdrawal amount is 500 LE" });
    }

    if (!/^\d{11}$/.test(phoneNumber)) {
      return res.status(400).json({ message: "Phone number must be exactly 11 digits" });
    }

    if (!["vodafone_cash", "instapay"].includes(method)) {
      return res.status(400).json({ message: "Invalid payment method. Only Vodafone Cash and InstaPay are allowed" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userBalance = user.wallet?.balance || 0;

    if (amount > userBalance) {
      return res.status(400).json({
        message: `Insufficient balance. Your balance is ${userBalance} LE, but you requested ${amount} LE`
      });
    }

    const withdrawal = new Withdrawal({
      user: userId,
      amount,
      method,
      countryCode,
      phoneNumber,
    });

    await withdrawal.save();
    return res.status(201).json({ message: "Withdrawal request submitted successfully", data: withdrawal });
  } catch (error) {
    console.error("Submit withdrawal error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getMyWithdrawals = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;

    const withdrawals = await Withdrawal.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Withdrawal.countDocuments({ user: userId });

    return res.status(200).json({
      data: withdrawals,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get my withdrawals error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getAllWithdrawals = async (req, res) => {
  try {
    const { status = "all", page = 1, limit = 20 } = req.query;
    const filter = status !== "all" ? { status } : {};

    const withdrawals = await Withdrawal.find(filter)
      .populate("user", "username email")
      .populate("reviewedBy", "username")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Withdrawal.countDocuments(filter);
    const pendingCount = await Withdrawal.countDocuments({ status: "pending" });

    return res.status(200).json({
      data: withdrawals,
      total,
      pendingCount,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get all withdrawals error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const approveWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const withdrawal = await Withdrawal.findById(id).populate('user');
    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal not found" });
    }
    if (withdrawal.status !== "pending") {
      return res.status(400).json({ message: "Withdrawal already processed" });
    }

    const user = await User.findById(withdrawal.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userBalance = user.wallet?.balance || 0;
    if (withdrawal.amount > userBalance) {
      return res.status(400).json({
        message: `Insufficient balance. User has ${userBalance} LE but requested ${withdrawal.amount} LE`
      });
    }

    user.wallet.balance = userBalance - withdrawal.amount;
    await user.save();

    const admin = await User.findById(req.user._id);
    if (admin && admin.role === 'admin') {
      admin.wallet.balance = (admin.wallet.balance || 0) + withdrawal.amount;
      await admin.save();
    }

    withdrawal.status = "approved";
    withdrawal.reviewedBy = req.user._id;
    withdrawal.reviewedAt = new Date();
    await withdrawal.save();

    return res.status(200).json({ message: "Withdrawal approved", data: withdrawal });
  } catch (error) {
    console.error("Approve withdrawal error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const rejectWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const withdrawal = await Withdrawal.findById(id);
    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal not found" });
    }
    if (withdrawal.status !== "pending") {
      return res.status(400).json({ message: "Withdrawal already processed" });
    }

    withdrawal.status = "rejected";
    withdrawal.rejectionReason = reason || "Request denied";
    withdrawal.reviewedBy = req.user._id;
    withdrawal.reviewedAt = new Date();
    await withdrawal.save();

    return res.status(200).json({ message: "Withdrawal rejected", data: withdrawal });
  } catch (error) {
    console.error("Reject withdrawal error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
