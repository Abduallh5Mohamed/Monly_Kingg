import Deposit from "./deposit.model.js";
import User from "../users/user.model.js";

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

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount < 100 || parsedAmount > 1000000) {
            return res.status(400).json({ message: "Amount must be between 100 LE and 1,000,000 LE" });
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
            amount: parsedAmount,
            senderFullName: sanitizedFullName,
            senderPhoneOrEmail: sanitizedPhoneOrEmail,
            depositDate: depositDateTime,
            receiptImage: receiptImagePath,
            gameTitle: sanitizedGameTitle,
            paidAmount: parsedAmount,
            creditedAmount: parsedAmount
        });

        await deposit.save();

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
        console.error("Submit deposit error:", error);
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
        console.error("Get my deposits error:", error);
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
        console.error("Get all deposits error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

export const approveDeposit = async (req, res) => {
    try {
        const { id } = req.params;
        const deposit = await Deposit.findById(id).populate("user");

        if (!deposit) {
            return res.status(404).json({ message: "Deposit not found" });
        }
        if (deposit.status !== "pending") {
            return res.status(400).json({ message: "Deposit already processed" });
        }

        deposit.status = "approved";
        deposit.processedBy = req.user._id;
        deposit.processedAt = new Date();
        await deposit.save();

        const amountToCredit = deposit.amount || deposit.paidAmount || deposit.creditedAmount || 0;

        const user = await User.findById(deposit.user._id);
        if (user) {
            user.wallet.balance = (user.wallet.balance || 0) + amountToCredit;
            await user.save();
        }

        const admin = await User.findById(req.user._id);
        if (admin && admin.role === 'admin') {
            admin.wallet.balance = (admin.wallet.balance || 0) - amountToCredit;
            await admin.save();
        }

        return res.status(200).json({
            message: `Deposit approved and ${amountToCredit} LE added to balance`,
            data: deposit
        });
    } catch (error) {
        console.error("Approve deposit error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

export const rejectDeposit = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const deposit = await Deposit.findById(id);
        if (!deposit) {
            return res.status(404).json({ message: "Deposit not found" });
        }
        if (deposit.status !== "pending") {
            return res.status(400).json({ message: "Deposit already processed" });
        }

        deposit.status = "rejected";
        await deposit.save();

        return res.status(200).json({ message: "Deposit rejected", data: deposit });
    } catch (error) {
        console.error("Reject deposit error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};
