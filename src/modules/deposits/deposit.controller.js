import Deposit from "./deposit.model.js";
import User from "../users/user.model.js";
import cacheService from '../../services/cacheService.js';
import socketService from '../../services/socketService.js';
import { notifyAllAdmins, createNotification } from '../notifications/notificationHelper.js';
import AuditLog from '../admin/auditLog.model.js';
import logger from '../../utils/logger.js';

const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return input
        .trim()
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '');
};

const validateContactInfo = (contact) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9+\-\s()]{10,20}$/;
    return emailRegex.test(contact) || phoneRegex.test(contact);
};

export const submitDeposit = async (req, res) => {
    try {
        const userId = req.user._id;
        // SECURITY FIX: Idempotency key prevents race-condition double submission.
        const rawIdempotencyHeader = req.headers["x-idempotency-key"];
        const idempotencyKey = typeof rawIdempotencyHeader === "string" && rawIdempotencyHeader.trim()
            ? rawIdempotencyHeader.trim()
            : null;
        const {
            paymentMethod,
            amount,
            senderFullName,
            senderPhoneOrEmail,
            depositDate,
            gameTitle
        } = req.body;

        const sanitizedFullName = sanitizeInput(senderFullName);
        const sanitizedPhoneOrEmail = sanitizeInput(senderPhoneOrEmail);
        const sanitizedGameTitle = gameTitle ? sanitizeInput(gameTitle) : undefined;

        if (!paymentMethod || !amount || !sanitizedFullName || !sanitizedPhoneOrEmail || !depositDate) {
            return res.status(400).json({ message: "All fields are required (payment method, amount, sender name, sender phone/email, deposit date)" });
        }

        if (sanitizedFullName.length < 2 || sanitizedFullName.length > 100) {
            return res.status(400).json({ message: "Sender name must be between 2 and 100 characters" });
        }

        if (!validateContactInfo(sanitizedPhoneOrEmail)) {
            return res.status(400).json({ message: "Please provide a valid email address or phone number" });
        }

        if (!["instapay", "vodafone_cash"].includes(paymentMethod)) {
            return res.status(400).json({ message: "Payment method must be either 'instapay' or 'vodafone_cash'" });
        }

        const parsedAmount = Number(amount);
        const normalizedAmount = Math.round(parsedAmount * 100) / 100;
        if (!Number.isFinite(parsedAmount) || normalizedAmount < 500 || normalizedAmount > 50000) {
            return res.status(400).json({ message: "Amount must be between 500 and 50000 LE" });
        }

        const depositDateTime = new Date(depositDate);
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

        if (depositDateTime > now) {
            return res.status(400).json({ message: "Deposit date cannot be in the future" });
        }
        if (depositDateTime < thirtyDaysAgo) {
            return res.status(400).json({ message: "Deposit date cannot be older than 30 days" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "Receipt image is required" });
        }

        if (idempotencyKey) {
            const existing = await Deposit.findOne({ idempotencyKey }).lean();
            if (existing) {
                return res.status(200).json({
                    message: "Already submitted",
                    data: {
                        _id: existing._id,
                        amount: existing.amount,
                        paymentMethod: existing.paymentMethod,
                        status: existing.status,
                        createdAt: existing.createdAt,
                    }
                });
            }
        }

        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
            return res.status(400).json({ message: "Only JPEG, PNG, and WEBP images are allowed" });
        }

        if (req.file.size > 10 * 1024 * 1024) {
            return res.status(400).json({ message: "Image size must not exceed 10MB" });
        }

        const recentDeposit = await Deposit.findOne({
            user: userId,
            createdAt: { $gte: new Date(Date.now() - 60000) }
        });

        if (recentDeposit) {
            return res.status(429).json({ message: "Please wait at least 1 minute between deposit requests" });
        }

        const receiptImagePath = `/uploads/receipts/${req.file.filename}`;

        const deposit = new Deposit({
            user: userId,
            paymentMethod,
            amount: normalizedAmount,
            senderFullName: sanitizedFullName,
            senderPhoneOrEmail: sanitizedPhoneOrEmail,
            depositDate: depositDateTime,
            receiptImage: receiptImagePath,
            gameTitle: sanitizedGameTitle,
            paidAmount: normalizedAmount,
            creditedAmount: normalizedAmount,
            idempotencyKey: idempotencyKey || undefined,
        });

        try {
            await deposit.save();
        } catch (saveErr) {
            if (saveErr?.code === 11000 && idempotencyKey) {
                const existing = await Deposit.findOne({ idempotencyKey }).lean();
                if (existing) {
                    return res.status(200).json({
                        message: "Already submitted",
                        data: {
                            _id: existing._id,
                            amount: existing.amount,
                            paymentMethod: existing.paymentMethod,
                            status: existing.status,
                            createdAt: existing.createdAt,
                        }
                    });
                }
            }
            throw saveErr;
        }

        // Populate user details for socket notification
        await deposit.populate('user', 'username email phone profile.province profile.phone');

        // Notify admins of new deposit in real-time
        socketService.notifyAdminsNewDeposit(deposit);

        // Persist DB notification for all admins
        notifyAllAdmins({
            type: 'new_deposit_request',
            title: 'New Deposit Request',
            message: `${deposit.user.username} requested a deposit of ${deposit.amount} EGP via ${deposit.paymentMethod}`,
            relatedModel: 'Deposit',
            relatedId: deposit._id,
            metadata: { amount: deposit.amount, paymentMethod: deposit.paymentMethod },
        });

        return res.status(201).json({
            message: "Deposit request submitted successfully",
            data: {
                _id: deposit._id,
                amount: deposit.amount,
                paymentMethod: deposit.paymentMethod,
                status: deposit.status,
                createdAt: deposit.createdAt
            }
        });
    } catch (error) {
        logger.error(`Submit deposit error: ${error.message}`);
        return res.status(500).json({ message: "Server error" });
    }
};

export const getMyDeposits = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 10 } = req.query;

        const deposits = await Deposit.find({ user: userId })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Deposit.countDocuments({ user: userId });

        return res.status(200).json({
            data: deposits,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        logger.error(`Get my deposits error: ${error.message}`);
        return res.status(500).json({ message: "Server error" });
    }
};

export const getAllDeposits = async (req, res) => {
    try {
        const { status = "all", page = 1, limit = 20 } = req.query;
        const filter = status !== "all" ? { status } : {};

        const deposits = await Deposit.find(filter)
            .populate("user", "username email phone profile.province profile.phone")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        const total = await Deposit.countDocuments(filter);
        const pendingCount = await Deposit.countDocuments({ status: "pending" });

        return res.status(200).json({
            data: deposits,
            total,
            pendingCount,
            page: Number(page),
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        logger.error(`Get all deposits error: ${error.message}`);
        return res.status(500).json({ message: "Server error" });
    }
};

export const approveDeposit = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount: editedAmount } = req.body;

        const deposit = await Deposit.findById(id).populate("user");

        if (!deposit) {
            return res.status(404).json({ message: "Deposit not found" });
        }
        if (deposit.status !== "pending") {
            return res.status(400).json({ message: "Deposit already processed" });
        }

        let amountToCredit = deposit.amount || deposit.paidAmount || deposit.creditedAmount || 0;

        if (editedAmount !== undefined && editedAmount !== null) {
            const parsedAmount = Number(editedAmount);
            const normalizedAmount = Math.round(parsedAmount * 100) / 100;
            if (!Number.isFinite(parsedAmount) || normalizedAmount < 500 || normalizedAmount > 50000) {
                return res.status(400).json({
                    message: "Invalid amount. Must be between 500 and 50000 LE"
                });
            }
            amountToCredit = normalizedAmount;
            deposit.amount = normalizedAmount;
        }

        deposit.status = "approved";
        deposit.processedBy = req.user._id;
        deposit.processedAt = new Date();
        await deposit.save();

        // Credit user balance
        await cacheService.updateBalanceWithSync(
            deposit.user._id,
            amountToCredit,
            `deposit approval #${id}`
        );

        // Deduct from admin balance
        if (req.user.role === 'admin') {
            await cacheService.updateBalanceWithSync(
                req.user._id,
                -amountToCredit,
                `deposit approval #${id} (admin deduction)`
            );
        }

        try {
            await AuditLog.create({
                admin: req.user._id,
                performedBy: req.user._id,
                category: "user_management",
                action: "wallet_deposit_approved",
                targetModel: "Deposit",
                targetId: deposit._id,
                targetUser: deposit.user._id,
                details: {
                    depositId: deposit._id.toString(),
                    amountCredited: amountToCredit,
                    paymentMethod: deposit.paymentMethod,
                },
                metadata: {
                    depositId: deposit._id.toString(),
                    amountCredited: amountToCredit,
                },
                ip: req.ip,
                userAgent: req.get("User-Agent"),
                timestamp: new Date(),
            });
        } catch (auditErr) {
            logger.error(`AuditLog failed for deposit approval ${deposit._id}: ${auditErr.message}`);
        }

        // Real-time: notify admins of deposit update
        socketService.notifyAdminsDepositUpdate(deposit);
        // Real-time: notify user of approval
        socketService.notifyUserDepositStatus(deposit.user._id.toString(), deposit);

        // Persist DB notification for user
        createNotification({
            userId: deposit.user._id,
            type: 'deposit_approved',
            title: 'Deposit Approved ✅',
            message: `${amountToCredit} EGP has been added to your balance successfully`,
            relatedModel: 'Deposit',
            relatedId: deposit._id,
        });

        return res.status(200).json({
            message: `Deposit approved and ${amountToCredit} LE added to balance`,
            data: deposit
        });
    } catch (error) {
        logger.error(`Approve deposit error: ${error.message}`);
        return res.status(500).json({ message: "Server error" });
    }
};

export const rejectDeposit = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const deposit = await Deposit.findById(id).populate("user", "username email");
        if (!deposit) {
            return res.status(404).json({ message: "Deposit not found" });
        }
        if (deposit.status !== "pending") {
            return res.status(400).json({ message: "Deposit already processed" });
        }

        deposit.status = "rejected";
        deposit.rejectionReason = reason || "Rejected by admin";
        await deposit.save();

        // Real-time: notify admins of deposit update
        socketService.notifyAdminsDepositUpdate(deposit);
        // Real-time: notify user of rejection
        socketService.notifyUserDepositStatus(deposit.user._id.toString(), deposit);

        // Persist DB notification for user
        createNotification({
            userId: deposit.user._id,
            type: 'deposit_rejected',
            title: 'Deposit Rejected ❌',
            message: `Your deposit request has been rejected. Reason: ${deposit.rejectionReason}`,
            relatedModel: 'Deposit',
            relatedId: deposit._id,
        });

        return res.status(200).json({ message: "Deposit rejected", data: deposit });
    } catch (error) {
        logger.error(`Reject deposit error: ${error.message}`);
        return res.status(500).json({ message: "Server error" });
    }
};
