import Withdrawal from "./withdrawal.model.js";
import User from "../users/user.model.js";
import cacheService from '../../services/cacheService.js';
import socketService from '../../services/socketService.js';
import { notifyAllAdmins, createNotification } from '../notifications/notificationHelper.js';
import AuditLog from '../admin/auditLog.model.js';
import logger from '../../utils/logger.js';

export const submitWithdrawal = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount, method, countryCode, phoneNumber } = req.body;
    const parsedAmount = Number(amount);
    const normalizedAmount = Math.round(parsedAmount * 100) / 100;

    if (!amount || !method || !countryCode || !phoneNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!Number.isFinite(parsedAmount) || normalizedAmount < 500 || normalizedAmount > 50000) {
      return res.status(400).json({ message: "Withdrawal amount must be between 500 and 50000 LE" });
    }

    // SECURITY FIX: [HIGH-09] Block creating multiple pending withdrawal requests.
    const existingPending = await Withdrawal.findOne({ user: userId, status: "pending" }).lean();
    if (existingPending) {
      return res.status(400).json({
        message: "You already have a pending withdrawal request. Please wait for it to be processed."
      });
    }

    // SECURITY FIX: [CRIT-05] Prevent rapid duplicate submission race window.
    const recentWithdrawal = await Withdrawal.findOne({
      user: userId,
      status: "pending",
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) }
    }).lean();
    if (recentWithdrawal) {
      return res.status(429).json({
        message: "You already have a pending withdrawal request. Please wait before submitting another."
      });
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

    if (normalizedAmount > userBalance) {
      return res.status(400).json({
        message: `Insufficient balance. Your balance is ${userBalance} LE, but you requested ${normalizedAmount} LE`
      });
    }

    const withdrawal = new Withdrawal({
      user: userId,
      amount: normalizedAmount,
      method,
      countryCode,
      phoneNumber,
    });

    await withdrawal.save();

    // Populate user details for socket notification
    await withdrawal.populate('user', 'username email');

    // Notify admins of new withdrawal in real-time
    socketService.notifyAdminsNewWithdrawal(withdrawal);

    // Persist DB notification for all admins
    notifyAllAdmins({
      type: 'new_withdrawal_request',
      title: 'New Withdrawal Request',
      message: `${withdrawal.user.username} requested a withdrawal of ${withdrawal.amount} EGP via ${withdrawal.method}`,
      relatedModel: 'Withdrawal',
      relatedId: withdrawal._id,
      metadata: { amount: withdrawal.amount, method: withdrawal.method },
    });

    return res.status(201).json({ message: "Withdrawal request submitted successfully", data: withdrawal });
  } catch (error) {
    logger.error(`Submit withdrawal error: ${error.message}`);
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
    logger.error(`Get my withdrawals error: ${error.message}`);
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
    logger.error(`Get all withdrawals error: ${error.message}`);
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

    // SECURITY FIX: [HIGH-06] Atomic check-and-deduct prevents TOCTOU race on wallet balance.
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: withdrawal.user._id,
        "wallet.balance": { $gte: withdrawal.amount }
      },
      { $inc: { "wallet.balance": -withdrawal.amount } },
      { new: true }
    ).lean();

    if (!updatedUser) {
      return res.status(400).json({
        message: "Insufficient balance. User's balance may have changed."
      });
    }

    // Keep cache synchronized with atomic DB balance update.
    await cacheService.cacheUser(updatedUser);

    withdrawal.status = "approved";
    withdrawal.reviewedBy = req.user._id;
    withdrawal.reviewedAt = new Date();
    await withdrawal.save();

    try {
      await AuditLog.create({
        admin: req.user._id,
        performedBy: req.user._id,
        category: "user_management",
        action: "wallet_withdrawal_approved",
        targetModel: "Withdrawal",
        targetId: withdrawal._id,
        targetUser: withdrawal.user._id,
        details: {
          withdrawalId: withdrawal._id.toString(),
          amount: withdrawal.amount,
          method: withdrawal.method,
        },
        metadata: {
          withdrawalId: withdrawal._id.toString(),
          amount: withdrawal.amount,
        },
        ip: req.ip,
        userAgent: req.get("User-Agent"),
        timestamp: new Date(),
      });
    } catch (auditErr) {
      logger.error(`AuditLog failed for withdrawal approval ${withdrawal._id}: ${auditErr.message}`);
    }

    // Notify admins of withdrawal update in real-time
    socketService.notifyAdminsWithdrawalUpdate(withdrawal);

    // Notify user of their withdrawal approval
    socketService.notifyUserWithdrawalStatus(withdrawal.user._id.toString(), withdrawal);

    // Persist DB notification for user
    createNotification({
      userId: withdrawal.user._id,
      type: 'withdrawal_approved',
      title: 'Withdrawal Approved ✅',
      message: `Your withdrawal of ${withdrawal.amount} EGP has been approved. Transfer will be processed soon.`,
      relatedModel: 'Withdrawal',
      relatedId: withdrawal._id,
    });

    return res.status(200).json({ message: "Withdrawal approved", data: withdrawal });
  } catch (error) {
    logger.error(`Approve withdrawal error: ${error.message}`);
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

    // Notify admins of withdrawal update in real-time
    socketService.notifyAdminsWithdrawalUpdate(withdrawal);

    // Notify user of their withdrawal rejection
    socketService.notifyUserWithdrawalStatus(withdrawal.user.toString(), withdrawal);

    // Persist DB notification for user
    createNotification({
      userId: withdrawal.user,
      type: 'withdrawal_rejected',
      title: 'Withdrawal Rejected ❌',
      message: `Your withdrawal request has been rejected. Reason: ${withdrawal.rejectionReason}`,
      relatedModel: 'Withdrawal',
      relatedId: withdrawal._id,
    });

    return res.status(200).json({ message: "Withdrawal rejected", data: withdrawal });
  } catch (error) {
    logger.error(`Reject withdrawal error: ${error.message}`);
    return res.status(500).json({ message: "Server error" });
  }
};
