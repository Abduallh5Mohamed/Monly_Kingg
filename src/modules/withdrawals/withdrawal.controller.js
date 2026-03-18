import Withdrawal from "./withdrawal.model.js";
import User from "../users/user.model.js";
import cacheService from '../../services/cacheService.js';
import socketService from '../../services/socketService.js';
import { notifyAllAdmins, createNotification } from '../notifications/notificationHelper.js';
import AuditLog from '../admin/auditLog.model.js';
import logger from '../../utils/logger.js';
import { safePaginate } from '../../utils/pagination.js';
import redis from '../../config/redis.js';
import { encrypt, decrypt } from '../../utils/encryption.js';

/**
 * Safely decrypt a withdrawal field for responses.
 * @param {unknown} value
 * @returns {unknown}
 */
const safeDecryptField = (value) => {
  if (typeof value !== 'string' || !value) return value;
  try {
    return decrypt(value);
  } catch (_error) {
    return null;
  }
};

/**
 * Decrypt withdrawal PII fields before returning API payloads.
 * @param {Record<string, any>} withdrawal
 * @returns {Record<string, any>}
 */
const decryptWithdrawalForResponse = (withdrawal) => {
  if (!withdrawal) return withdrawal;
  const obj = withdrawal.toObject ? withdrawal.toObject() : { ...withdrawal };
  obj.phoneNumber = safeDecryptField(obj.phoneNumber);
  obj.countryCode = safeDecryptField(obj.countryCode);
  return obj;
};

export const submitWithdrawal = async (req, res) => {
  let lockKey = null;
  let lockAcquired = false;

  try {
    const userId = req.user._id;
    const { amount, method, countryCode, phoneNumber } = req.body;
    const parsedAmount = Number(amount);
    const normalizedAmount = Math.round(parsedAmount * 100) / 100;

    if (redis.isReady()) {
      lockKey = `withdrawal:lock:${userId}`;
      const acquired = await redis.getClient().set(lockKey, '1', { NX: true, EX: 10 });
      if (!acquired) {
        return res.status(429).json({
          message: 'A withdrawal is already being processed. Please wait.'
        });
      }
      lockAcquired = true;
    }

    if (!amount || !method || !countryCode || !phoneNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!Number.isFinite(parsedAmount) || normalizedAmount < 500 || normalizedAmount > 50000) {
      return res.status(400).json({ message: "Withdrawal amount must be between 500 and 50000 LE" });
    }

    // SECURITY FIX [C-06]: Block concurrent/duplicate withdrawal submissions.
    const existingPending = await Withdrawal.findOne({ user: userId, status: "pending" }).lean();
    if (existingPending) {
      return res.status(400).json({
        message: "You already have a pending withdrawal request. Please wait for it to be processed."
      });
    }

    if (!/^\d{11}$/.test(phoneNumber)) {
      return res.status(400).json({ message: "Phone number must be exactly 11 digits" });
    }

    if (!["vodafone_cash", "instapay"].includes(method)) {
      return res.status(400).json({ message: "Invalid payment method. Only Vodafone Cash and InstaPay are allowed" });
    }

    // SECURITY FIX [C-2]: Atomic check-and-deduct to prevent concurrent double-spend.
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, "wallet.balance": { $gte: normalizedAmount } },
      { $inc: { "wallet.balance": -normalizedAmount } },
      { new: true }
    ).lean();

    if (!updatedUser) {
      const check = await User.findById(userId).select("wallet").lean();
      if (!check) {
        return res.status(404).json({ message: "User not found" });
      }
      return res.status(400).json({
        message: `Insufficient balance. Available: ${check?.wallet?.balance || 0} LE`
      });
    }

    const withdrawal = new Withdrawal({
      user: userId,
      amount: normalizedAmount,
      method,
      countryCode: encrypt(countryCode),
      phoneNumber: encrypt(phoneNumber),
      balanceReserved: true,
    });

    try {
      await withdrawal.save();
    } catch (saveErr) {
      // Rollback reserved balance if withdrawal document fails to persist.
      await User.findByIdAndUpdate(userId, {
        $inc: { "wallet.balance": normalizedAmount },
      });
      throw saveErr;
    }

    // Keep cache in sync after atomic reservation.
    await cacheService.cacheUser(updatedUser);

    // Populate user details for socket notification
    await withdrawal.populate('user', 'username email');
    const safeWithdrawal = decryptWithdrawalForResponse(withdrawal);

    // Notify admins of new withdrawal in real-time
    socketService.notifyAdminsNewWithdrawal(safeWithdrawal);

    // Persist DB notification for all admins
    notifyAllAdmins({
      type: 'new_withdrawal_request',
      title: 'New Withdrawal Request',
      message: `${withdrawal.user.username} requested a withdrawal of ${withdrawal.amount} EGP via ${withdrawal.method}`,
      relatedModel: 'Withdrawal',
      relatedId: withdrawal._id,
      metadata: { amount: withdrawal.amount, method: withdrawal.method },
    });

    return res.status(201).json({ message: "Withdrawal request submitted successfully", data: safeWithdrawal });
  } catch (error) {
    logger.error(`Submit withdrawal error: ${error.message}`);
    return res.status(500).json({ message: "Server error" });
  } finally {
    if (lockAcquired && lockKey && redis.isReady()) {
      await redis.del(lockKey).catch(() => {});
    }
  }
};

export const getMyWithdrawals = async (req, res) => {
  try {
    const userId = req.user._id;
    // SECURITY FIX [M-06]: Cap pagination parameters to avoid oversized queries.
    const { page, limit, skip } = safePaginate(req.query, 10, 100);

    const withdrawals = await Withdrawal.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const safeWithdrawals = withdrawals.map((withdrawal) => decryptWithdrawalForResponse(withdrawal));

    const total = await Withdrawal.countDocuments({ user: userId });

    return res.status(200).json({
      data: safeWithdrawals,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error(`Get my withdrawals error: ${error.message}`);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getAllWithdrawals = async (req, res) => {
  try {
    const { status = "all" } = req.query;
    // SECURITY FIX [M-06]: Cap pagination parameters to avoid oversized queries.
    const { page, limit, skip } = safePaginate(req.query, 20, 100);
    const filter = status !== "all" ? { status } : {};

    const withdrawals = await Withdrawal.find(filter)
      .populate("user", "username email")
      .populate("reviewedBy", "username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const safeWithdrawals = withdrawals.map((withdrawal) => decryptWithdrawalForResponse(withdrawal));

    const total = await Withdrawal.countDocuments(filter);
    const pendingCount = await Withdrawal.countDocuments({ status: "pending" });

    return res.status(200).json({
      data: safeWithdrawals,
      total,
      pendingCount,
      page,
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

    // Backward compatibility: old pending withdrawals may not have reserved balance.
    if (withdrawal.balanceReserved === true) {
      withdrawal.balanceReserved = false;
    } else {
      // SECURITY FIX [C-07]: Atomic balance check-and-deduct prevents TOCTOU race.
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
    }

    withdrawal.status = "approved";
    withdrawal.reviewedBy = req.user._id;
    withdrawal.reviewedAt = new Date();
    await withdrawal.save();
    const safeWithdrawal = decryptWithdrawalForResponse(withdrawal);

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
    socketService.notifyAdminsWithdrawalUpdate(safeWithdrawal);

    // Notify user of their withdrawal approval
    socketService.notifyUserWithdrawalStatus(withdrawal.user._id.toString(), safeWithdrawal);

    // Persist DB notification for user
    createNotification({
      userId: withdrawal.user._id,
      type: 'withdrawal_approved',
      title: 'Withdrawal Approved ✅',
      message: `Your withdrawal of ${withdrawal.amount} EGP has been approved. Transfer will be processed soon.`,
      relatedModel: 'Withdrawal',
      relatedId: withdrawal._id,
    });

    return res.status(200).json({ message: "Withdrawal approved", data: safeWithdrawal });
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

    let refundApplied = false;
    if (withdrawal.balanceReserved === true) {
      const refundedUser = await User.findByIdAndUpdate(
        withdrawal.user,
        { $inc: { "wallet.balance": withdrawal.amount } },
        { new: true }
      ).lean();

      if (!refundedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      await cacheService.cacheUser(refundedUser);
      withdrawal.balanceReserved = false;
      refundApplied = true;
    }

    withdrawal.status = "rejected";
    // SECURITY FIX: Sanitize and limit rejection reason length.
    withdrawal.rejectionReason = (typeof reason === 'string' ? reason.trim().slice(0, 1000) : '') || "Request denied";
    withdrawal.reviewedBy = req.user._id;
    withdrawal.reviewedAt = new Date();

    try {
      await withdrawal.save();
    } catch (saveErr) {
      if (refundApplied) {
        await User.findByIdAndUpdate(withdrawal.user, {
          $inc: { "wallet.balance": -withdrawal.amount }
        });
      }
      throw saveErr;
    }

    const safeWithdrawal = decryptWithdrawalForResponse(withdrawal);

    // Notify admins of withdrawal update in real-time
    socketService.notifyAdminsWithdrawalUpdate(safeWithdrawal);

    // Notify user of their withdrawal rejection
    socketService.notifyUserWithdrawalStatus(withdrawal.user.toString(), safeWithdrawal);

    // Persist DB notification for user
    createNotification({
      userId: withdrawal.user,
      type: 'withdrawal_rejected',
      title: 'Withdrawal Rejected ❌',
      message: `Your withdrawal request has been rejected. Reason: ${withdrawal.rejectionReason}`,
      relatedModel: 'Withdrawal',
      relatedId: withdrawal._id,
    });

    return res.status(200).json({ message: "Withdrawal rejected", data: safeWithdrawal });
  } catch (error) {
    logger.error(`Reject withdrawal error: ${error.message}`);
    return res.status(500).json({ message: "Server error" });
  }
};
