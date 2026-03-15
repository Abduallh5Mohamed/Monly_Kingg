import mongoose from "mongoose";
import Transaction from "./transaction.model.js";
import Listing from "../listings/listing.model.js";
import User from "../users/user.model.js";
import Discount from "../discounts/discount.model.js";
import Campaign from "../campaigns/campaign.model.js";
import Notification from "../notifications/notification.model.js";
import SellerRequest from "../sellers/sellerRequest.model.js";
import { notifyAllAdmins } from "../notifications/notificationHelper.js";
import cacheService from "../../services/cacheService.js";
import socketService from "../../services/socketService.js";
import logger from "../../utils/logger.js";
import { sendEmail } from "../../utils/email.js";
import { buildTransactionInvoiceEmail } from "../../utils/emailTemplates.js";
import { encrypt, decrypt } from "../../utils/encryption.js";
import { updateSellerLevel } from "../seller-levels/sellerLevel.service.js";
import { safePaginate } from "../../utils/pagination.js";
import { notificationQueue } from "../../queues/transactionQueue.js";

// ─── Credential encryption helpers ───────────────────────────────────────────
function encryptCredentials(credentials) {
  return credentials.map(c => ({
    key: c.key,
    value: encrypt(c.value),
  }));
}

function decryptCredentials(credentials) {
  if (!credentials || !Array.isArray(credentials)) return [];
  try {
    return credentials.map(c => ({
      key: c.key,
      value: decrypt(c.value),
    }));
  } catch (err) {
    logger.error(`[Transaction] Credential decryption failed: ${err.message}`);
    return [];
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

async function createNotification({ userId, type, title, message, relatedId, metadata = {} }) {
  try {
    await Notification.create({
      user: userId,
      type,
      title,
      message,
      relatedModel: "Transaction",
      relatedId,
      metadata,
    });
  } catch (err) {
    logger.error(`[Transaction] createNotification error: ${err.message}`);
  }
}

/**
 * Enqueue a notification via BullMQ so it survives a server crash.
 * The worker (transactionWorker.js) handles the actual DB insert + socket emit.
 */
async function queueNotification({ userId, type, title, message, relatedId, metadata = {}, socketEvent, socketPayload }) {
  try {
    await notificationQueue.add("notify", {
      userId,
      type,
      title,
      message,
      relatedId: relatedId?.toString(),
      metadata,
      socketEvent,
      socketPayload,
    });
  } catch (err) {
    // Fallback: send directly if queue is unavailable
    logger.warn(`[Transaction] notificationQueue unavailable, sending directly: ${err.message}`);
    await createNotification({ userId, type, title, message, relatedId, metadata });
    try {
      if (socketEvent && socketService[socketEvent]) {
        socketService[socketEvent](metadata?.socketTargetId || userId, socketPayload || {});
      }
    } catch (_) { /* non-fatal */ }
  }
}

function sendMonlyKingInvoiceEmail({ to, subject, payload }) {
  if (!to) return Promise.resolve();
  return Promise.resolve(
    sendEmail(to, subject, buildTransactionInvoiceEmail(payload))
  ).catch((err) => {
    logger.warn(`[Transaction] invoice email failed for ${to}: ${err.message}`);
  });
}

// ─── POST /api/v1/transactions ───────────────────────────────────────────────
// Buyer starts the purchase — deducts balance to hold
export const createTransaction = async (req, res) => {
  try {
    const buyerId = req.user._id.toString();
    const { listingId } = req.body;

    // ── Idempotency ── ──────────────────────────────────────────────────────
    // Client must send a UUID in X-Idempotency-Key to prevent double-charge
    // on network retries. Same key → same response, no second deduction.
    const rawIdempotencyHeader = req.headers["x-idempotency-key"];
    let idempotencyKey = null;
    if (rawIdempotencyHeader) {
      const trimmed = String(rawIdempotencyHeader).trim();
      if (trimmed.length > 64 || !/^[a-zA-Z0-9\-_]+$/.test(trimmed)) {
        return res.status(400).json({ success: false, message: "Invalid idempotency key format" });
      }
      idempotencyKey = trimmed;
    }

    if (idempotencyKey) {
      const existing = await Transaction.findOne({ idempotencyKey }).lean();
      if (existing) {
        return res.status(200).json({
          success: true,
          message: "Purchase already initiated (idempotent response).",
          data: { transactionId: existing._id },
        });
      }
    }

    if (!listingId) {
      return res.status(400).json({ success: false, message: "listingId is required" });
    }

    // Load listing
    const listing = await Listing.findById(listingId).populate("seller", "_id username email");
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }
    if (listing.seller._id.toString() === buyerId) {
      return res.status(400).json({ success: false, message: "You cannot buy your own listing" });
    }

    // ── Determine the final price (check discounts & campaigns in parallel) ──
    let finalPrice = listing.price;
    let discountApplied = null;

    const now = new Date();
    const gameId = listing.game?._id || listing.game;

    const [activeDiscount, voluntaryCampaign, mandatoryCampaign] = await Promise.all([
      Discount.findOne({
        listing: listingId,
        status: "active",
        $or: [{ endDate: null }, { endDate: { $gte: now } }],
      }).lean(),
      Campaign.findOne({
        type: "voluntary",
        status: "active",
        endDate: { $gte: now },
        "participatingListings.listing": listing._id,
      }).lean(),
      Campaign.findOne({
        type: "mandatory",
        status: "active",
        endDate: { $gte: now },
        games: gameId,
      }).lean(),
    ]);

    // Priority: individual discount > voluntary > mandatory
    if (activeDiscount) {
      finalPrice = activeDiscount.discountedPrice;
      discountApplied = {
        type: "discount",
        percent: activeDiscount.discountPercent,
        originalPrice: activeDiscount.originalPrice,
        finalPrice: activeDiscount.discountedPrice,
      };
    } else if (voluntaryCampaign) {
      finalPrice = +(listing.price * (1 - voluntaryCampaign.discountPercent / 100)).toFixed(2);
      discountApplied = {
        type: "campaign_voluntary",
        campaignId: voluntaryCampaign._id,
        percent: voluntaryCampaign.discountPercent,
        originalPrice: listing.price,
        finalPrice,
      };
    } else if (mandatoryCampaign) {
      finalPrice = +(listing.price * (1 - mandatoryCampaign.discountPercent / 100)).toFixed(2);
      discountApplied = {
        type: "campaign_mandatory",
        campaignId: mandatoryCampaign._id,
        percent: mandatoryCampaign.discountPercent,
        originalPrice: listing.price,
        finalPrice,
      };
    }

    let updatedBuyer;
    let transaction;
    const session = await mongoose.startSession();

    try {
      // SECURITY FIX [VULN-01]: Wrap debit + listing lock + transaction create in one DB transaction.
      await session.withTransaction(async () => {
        updatedBuyer = await User.findOneAndUpdate(
          {
            _id: buyerId,
            "wallet.balance": { $gte: finalPrice },
          },
          {
            $inc: {
              "wallet.balance": -finalPrice,
              "wallet.hold": finalPrice,
            },
          },
          { new: true, session }
        );

        if (!updatedBuyer) {
          const insufficientBalanceError = new Error("Insufficient balance");
          insufficientBalanceError.code = "INSUFFICIENT_BALANCE";
          throw insufficientBalanceError;
        }

        const lockedListing = await Listing.findOneAndUpdate(
          { _id: listingId, status: "available" },
          { $set: { status: "in_progress" } },
          { new: true, session }
        );

        if (!lockedListing) {
          const listingUnavailableError = new Error("Listing is no longer available");
          listingUnavailableError.code = "LISTING_UNAVAILABLE";
          throw listingUnavailableError;
        }

        const createdTransactions = await Transaction.create([
          {
            buyer: buyerId,
            seller: listing.seller._id,
            listing: listingId,
            amount: finalPrice,
            originalAmount: discountApplied ? discountApplied.originalPrice : undefined,
            discountPercent: discountApplied ? discountApplied.percent : undefined,
            status: "waiting_seller",
            idempotencyKey: idempotencyKey || undefined,
            timeline: [{ event: "purchase_initiated", note: `Buyer ${updatedBuyer.username} initiated purchase${discountApplied ? ` (${discountApplied.percent}% discount applied)` : ''}` }],
          }
        ], { session });

        transaction = createdTransactions[0];
      });
    } catch (txnErr) {
      if (txnErr?.code === "INSUFFICIENT_BALANCE") {
        const buyer = await User.findById(buyerId).select("wallet").lean();
        if (!buyer) {
          return res.status(404).json({ success: false, message: "User not found" });
        }
        return res.status(400).json({
          success: false,
          message: "Insufficient balance",
          required: finalPrice,
          available: buyer.wallet?.balance || 0,
        });
      }

      if (txnErr?.code === "LISTING_UNAVAILABLE") {
        return res.status(400).json({ success: false, message: "Listing is no longer available" });
      }

      if (txnErr?.code === 11000 && idempotencyKey) {
        const existing = await Transaction.findOne({ idempotencyKey }).lean();
        if (existing) {
          return res.status(200).json({
            success: true,
            message: "Purchase already initiated (idempotent response).",
            data: { transactionId: existing._id },
          });
        }
      }

      throw txnErr;
    } finally {
      // SECURITY FIX [VULN-01]: Always release DB session resources.
      await session.endSession();
    }

    // ── Step 4: Queue seller notification (durable) ─────────────────────────
    // Survives a server crash — BullMQ retries until the worker processes it.
    const sellerId = listing.seller._id.toString();
    await queueNotification({
      userId: sellerId,
      type: "purchase_initiated",
      title: "New Purchase!",
      message: `${updatedBuyer.username} purchased "${listing.title}" for ${finalPrice} EGP${discountApplied ? ` (${discountApplied.percent}% off)` : ''}. Please submit the account credentials.`,
      relatedId: transaction._id,
      metadata: {
        transactionId: transaction._id.toString(),
        listingTitle: listing.title,
        amount: finalPrice,
        notificationField: "sellerNotifiedAt",
        socketTargetId: sellerId,
      },
      socketEvent: "notifySellerNewPurchase",
      socketPayload: {
        transactionId: transaction._id,
        listingId: listing._id,
        listingTitle: listing.title,
        amount: finalPrice,
        buyerUsername: updatedBuyer.username,
      },
    });

    // Send branded invoice emails (no credentials included)
    await Promise.allSettled([
      sendMonlyKingInvoiceEmail({
        to: updatedBuyer.email,
        subject: "MonlyKing invoice - purchase created",
        payload: {
          heading: "Purchase Initiated",
          intro: "Your purchase has been created and is now waiting for seller credentials.",
          transactionId: transaction._id.toString(),
          status: "waiting_seller",
          listingTitle: listing.title,
          amount: finalPrice,
          originalAmount: discountApplied ? discountApplied.originalPrice : finalPrice,
          discountPercent: discountApplied ? discountApplied.percent : null,
          buyerName: updatedBuyer.username,
          buyerEmail: updatedBuyer.email,
          sellerName: listing.seller.username,
          sellerEmail: listing.seller.email,
          note: "This invoice contains transaction details only. Account credentials are never emailed.",
          createdAt: transaction.createdAt,
        },
      }),
      sendMonlyKingInvoiceEmail({
        to: listing.seller.email,
        subject: "MonlyKing invoice - new sale request",
        payload: {
          heading: "New Sale Request",
          intro: "A buyer started a purchase for your listing. Submit credentials inside the platform.",
          transactionId: transaction._id.toString(),
          status: "waiting_seller",
          listingTitle: listing.title,
          amount: finalPrice,
          originalAmount: discountApplied ? discountApplied.originalPrice : finalPrice,
          discountPercent: discountApplied ? discountApplied.percent : null,
          buyerName: updatedBuyer.username,
          buyerEmail: updatedBuyer.email,
          sellerName: listing.seller.username,
          sellerEmail: listing.seller.email,
          note: "Do not share credentials by email. Submit them only through the secured transaction page.",
          createdAt: transaction.createdAt,
        },
      }),
    ]);

    return res.status(201).json({
      success: true,
      message: "Purchase initiated. Waiting for seller to submit credentials.",
      data: { transactionId: transaction._id },
    });
  } catch (err) {
    logger.error(`[Transaction] createTransaction error: ${err.message}`);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── POST /api/v1/transactions/:id/credentials ──────────────────────────────
// Seller submits account credentials
export const submitCredentials = async (req, res) => {
  try {
    const sellerId = req.user._id.toString();
    const transaction = await Transaction.findById(req.params.id)
      .populate("buyer", "_id username")
      .populate("listing", "_id title");

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }
    if (transaction.seller.toString() !== sellerId) {
      return res.status(403).json({ success: false, message: "Not your transaction" });
    }
    if (transaction.status !== "waiting_seller") {
      return res.status(400).json({ success: false, message: "Credentials already submitted" });
    }

    const { credentials } = req.body; // [{ key, value }]
    if (!credentials || !Array.isArray(credentials) || credentials.length === 0) {
      return res.status(400).json({ success: false, message: "credentials array is required" });
    }
    // SECURITY FIX [L-04]: Validate credentials array size and key/value lengths.
    if (credentials.length > 20) {
      return res.status(400).json({ success: false, message: "Too many credential fields (max 20)" });
    }
    for (const cred of credentials) {
      if (!cred || typeof cred.key !== "string" || typeof cred.value !== "string") {
        return res.status(400).json({ success: false, message: "Invalid credential format" });
      }
      if (cred.key.length > 100 || cred.value.length > 500) {
        return res.status(400).json({ success: false, message: "Credential key/value exceeds maximum length" });
      }
    }

    const AUTO_CONFIRM_HOURS = 48;
    const autoConfirmAt = new Date(Date.now() + AUTO_CONFIRM_HOURS * 60 * 60 * 1000);

    // ✅ SECURITY: Encrypt credential values before storing in database
    transaction.credentials = encryptCredentials(credentials);
    transaction.status = "waiting_buyer";
    transaction.autoConfirmAt = autoConfirmAt;
    transaction.timeline.push({
      event: "credentials_sent",
      note: `Seller submitted ${credentials.length} credential field(s)`,
    });
    await transaction.save();

    // Notify buyer
    const buyerId = transaction.buyer._id.toString();
    await queueNotification({
      userId: buyerId,
      type: "credentials_sent",
      title: "🔑 Account Credentials Ready!",
      message: `The seller sent the credentials for "${transaction.listing.title}". Please verify and confirm within 48 hours.`,
      relatedId: transaction._id,
      metadata: {
        transactionId: transaction._id.toString(),
        listingTitle: transaction.listing.title,
        notificationField: "buyerNotifiedAt",
        socketTargetId: buyerId,
      },
      socketEvent: "notifyBuyerCredentialsSent",
      socketPayload: {
        transactionId: transaction._id,
        listingTitle: transaction.listing.title,
        autoConfirmAt,
      },
    });

    return res.json({
      success: true,
      message: "Credentials submitted. Buyer has 48 hours to confirm.",
    });
  } catch (err) {
    logger.error(`[Transaction] submitCredentials error: ${err.message}`);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
  
// ─── POST /api/v1/transactions/:id/confirm ──────────────────────────────────
// Buyer confirms receipt — releases funds to seller
export const confirmReceived = async (req, res) => {
  try {
    const buyerId = req.user._id.toString();
    const transaction = await Transaction.findById(req.params.id)
      .populate("listing", "_id title");

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }
    if (transaction.buyer.toString() !== buyerId) {
      return res.status(403).json({ success: false, message: "Not your transaction" });
    }
    if (transaction.status !== "waiting_buyer") {
      return res.status(400).json({ success: false, message: "Cannot confirm at this stage" });
    }

    await _releaseFundsToSeller(transaction, "completed", "Buyer confirmed receipt");

    return res.json({
      success: true,
      message: "Purchase confirmed. Funds released to seller.",
    });
  } catch (err) {
    logger.error(`[Transaction] confirmReceived error: ${err.message}`);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── POST /api/v1/transactions/:id/dispute ──────────────────────────────────
// Buyer opens a dispute
export const openDispute = async (req, res) => {
  try {
    const buyerId = req.user._id.toString();
    const { reason } = req.body;

    const transaction = await Transaction.findById(req.params.id)
      .populate("listing", "_id title");

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }
    if (transaction.buyer.toString() !== buyerId) {
      return res.status(403).json({ success: false, message: "Not your transaction" });
    }
    if (transaction.status !== "waiting_buyer") {
      return res.status(400).json({ success: false, message: "Cannot dispute at this stage" });
    }

    // SECURITY FIX [L-03]: Enforce dispute reason length limits.
    const sanitizedReason = typeof reason === "string"
      ? reason.trim().slice(0, 1000)
      : "No reason provided";

    transaction.status = "disputed";
    transaction.disputeReason = sanitizedReason || "No reason provided";
    transaction.timeline.push({ event: "dispute_opened", note: sanitizedReason || "Buyer opened dispute" });
    await transaction.save();

    // Notify admin via socket
    socketService.notifyAdminsDispute({
      transactionId: transaction._id,
      buyerId,
      sellerId: transaction.seller.toString(),
      listingTitle: transaction.listing.title,
      amount: transaction.amount,
      reason: transaction.disputeReason,
    });

    // DB notification for the seller
    await createNotification({
      userId: transaction.seller.toString(),
      type: "purchase_disputed",
      title: "⚠️ Dispute Opened",
      message: `A buyer opened a dispute on "${transaction.listing.title}": ${transaction.disputeReason}`,
      relatedId: transaction._id,
      metadata: { transactionId: transaction._id.toString() },
    });

    // DB notification for all admins
    notifyAllAdmins({
      type: 'new_dispute',
      title: 'New Dispute Needs Review ⚠️',
      message: `A buyer opened a dispute on "${transaction.listing.title}" worth ${transaction.amount} EGP`,
      relatedModel: 'Transaction',
      relatedId: transaction._id,
      metadata: { transactionId: transaction._id.toString() },
    });

    return res.json({ success: true, message: "Dispute opened. Admin will review shortly." });
  } catch (err) {
    logger.error(`[Transaction] openDispute error: ${err.message}`);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── POST /api/v1/transactions/:id/resolve ──────────────────────────────────
// Admin resolves dispute — refund buyer OR release to seller
export const adminResolveDispute = async (req, res) => {
  try {
    const { decision, note } = req.body; // decision: "refund" | "release"
    const adminId = req.user._id.toString();

    if (!["refund", "release"].includes(decision)) {
      return res.status(400).json({ success: false, message: "decision must be 'refund' or 'release'" });
    }

    const transaction = await Transaction.findById(req.params.id)
      .populate("listing", "_id title");

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }
    if (transaction.status !== "disputed") {
      return res.status(400).json({ success: false, message: "Transaction is not disputed" });
    }

    transaction.resolvedBy = adminId;
    transaction.resolvedNote = note || "";

    if (decision === "refund") {
      await _refundBuyer(transaction, note);
    } else {
      await _releaseFundsToSeller(transaction, "completed", note || "Admin released funds to seller");
    }

    return res.json({
      success: true,
      message: decision === "refund" ? "Buyer refunded." : "Funds released to seller.",
    });
  } catch (err) {
    logger.error(`[Transaction] adminResolveDispute error: ${err.message}`);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── GET /api/v1/transactions/mine ──────────────────────────────────────────
export const getMyTransactions = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { role, status } = req.query;
    // SECURITY FIX [M-06]: Cap pagination parameters to avoid oversized queries.
    const { page, limit, skip } = safePaginate(req.query, 20, 100);

    const filter = {};
    if (role === "buyer") filter.buyer = userId;
    else if (role === "seller") filter.seller = userId;
    else filter.$or = [{ buyer: userId }, { seller: userId }];

    if (status) filter.status = status;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .select("-credentials") // ✅ SECURITY: Never include credentials in list views
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("listing", "title coverImage price game")
        .populate("buyer", "username avatar")
        .populate("seller", "username avatar"),
      Transaction.countDocuments(filter),
    ]);

    // Count pending actions for the current user
    const pendingAsBuyer = await Transaction.countDocuments({ buyer: userId, status: "waiting_buyer" });
    const pendingAsSeller = await Transaction.countDocuments({ seller: userId, status: "waiting_seller" });

    return res.json({
      success: true,
      data: transactions,
      pagination: { total, page, limit },
      pendingCounts: { asBuyer: pendingAsBuyer, asSeller: pendingAsSeller },
    });
  } catch (err) {
    logger.error(`[Transaction] getMyTransactions error: ${err.message}`);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── GET /api/v1/transactions/pending-count ─────────────────────────────────
export const getPendingCount = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const [asBuyer, asSeller] = await Promise.all([
      Transaction.countDocuments({ buyer: userId, status: "waiting_buyer" }),
      Transaction.countDocuments({ seller: userId, status: "waiting_seller" }),
    ]);
    return res.json({ success: true, data: { asBuyer, asSeller, total: asBuyer + asSeller } });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── GET /api/v1/transactions/:id ───────────────────────────────────────────
export const getTransactionById = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const transaction = await Transaction.findById(req.params.id)
      .populate({
        path: "listing",
        select: "title coverImage price details game",
        populate: { path: "game", select: "name fields" },
      })
      .populate("buyer", "username avatar email")
      .populate("seller", "username avatar");

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    const isParty =
      transaction.buyer._id.toString() === userId ||
      transaction.seller._id.toString() === userId ||
      req.user.role === "admin";

    if (!isParty) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const data = transaction.toObject();
    const isBuyer = transaction.buyer._id.toString() === userId;
    const isAdmin = req.user.role === "admin";

    // ✅ SECURITY: Credentials are encrypted at rest.
    // Only decrypt for: admin (always) or buyer (during active purchase phases)
    const buyerCanSee = isBuyer && ["waiting_buyer", "disputed"].includes(data.status);

    if (isAdmin) {
      // Admin always gets decrypted credentials
      data.credentials = decryptCredentials(data.credentials);
    } else if (buyerCanSee) {
      // Buyer sees decrypted credentials only during verification/dispute
      data.credentials = decryptCredentials(data.credentials);
    } else {
      // Seller and buyer (after completion) never see credentials
      data.credentials = [];
    }

    return res.json({ success: true, data });
  } catch (err) {
    logger.error(`[Transaction] getTransactionById error: ${err.message}`);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Admin: GET /api/v1/transactions/admin/all ──────────────────────────────
export const adminGetAll = async (req, res) => {
  try {
    const { status, search } = req.query;
    // SECURITY FIX [M-06]: Cap pagination parameters to avoid oversized queries.
    const { page, limit, skip } = safePaginate(req.query, 30, 100);
    const filter = {};
    if (status) filter.status = status;

    // Search by transaction ID
    if (search) {
      const trimmed = search.trim();
      if (mongoose.Types.ObjectId.isValid(trimmed)) {
        filter._id = trimmed;
      }
      // Removed unsafe $regex on _id to prevent ReDoS
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .select("-credentials") // ✅ SECURITY: Never include credentials in admin list view
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("listing", "title price")
        .populate("buyer", "username email")
        .populate("seller", "username email"),
      Transaction.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: transactions,
      pagination: { total, page, limit },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Admin: GET /api/v1/transactions/admin/:id ──────────────────────────────
export const adminGetTransactionDetail = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate("listing", "title coverImage price details images game")
      .populate("buyer", "username avatar email")
      .populate("seller", "username avatar email");

    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    const data = transaction.toObject();

    // ✅ SECURITY: Decrypt credentials for admin view
    data.credentials = decryptCredentials(data.credentials);

    // Fetch seller's verification request (ID photos)
    const sellerRequest = await SellerRequest.findOne({ user: transaction.seller._id })
      .select("fullName idType idImage faceImageFront faceImageLeft faceImageRight status")
      .lean();

    if (sellerRequest) {
      data.sellerRequest = sellerRequest;
    }

    return res.json({ success: true, data });
  } catch (err) {
    logger.error(`[Transaction] adminGetTransactionDetail error: ${err.message}`);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Internal helpers ────────────────────────────────────────────────────────

async function _releaseFundsToSeller(transaction, finalStatus, note) {
  const sellerId = transaction.seller.toString();
  const buyerId = transaction.buyer.toString();

  // ── Load site settings for commission % and payout delay ────────────────
  const SiteSettings = (await import("../admin/siteSettings.model.js")).default;
  const settings = await SiteSettings.getSingleton();

  const payoutDelayDays = settings.sellerPayoutDelayDays || 0;

  // ── Check if seller is commission-exempt ────────────────────────────────
  const seller = await User.findById(sellerId).select("commissionExempt stats.level stats.levelOverride").lean();
  const isExempt = seller?.commissionExempt === true;

  // ── Determine commission: exempt → 0, rank-specific → rank rate, else → global ──
  let commissionPercent;
  if (isExempt) {
    commissionPercent = 0;
  } else {
    const globalCommission = settings.commissionPercent || 0;
    // Check for rank-level commission rate
    const LevelConfig = (await import("../seller-levels/levelConfig.model.js")).default;
    const { getRankForLevel } = await import("../seller-levels/sellerLevel.service.js");
    const levelConfig = await LevelConfig.getConfig();
    const sellerLevel = seller?.stats?.levelOverride || seller?.stats?.level || 1;
    const rankInfo = getRankForLevel(sellerLevel, levelConfig);
    if (rankInfo.commissionPercent !== null && rankInfo.commissionPercent < globalCommission) {
      commissionPercent = rankInfo.commissionPercent;
    } else {
      commissionPercent = globalCommission;
    }
  }

  // ── Calculate commission ────────────────────────────────────────────────
  const commissionAmount = +(transaction.amount * commissionPercent / 100).toFixed(2);
  const sellerNetAmount = +(transaction.amount - commissionAmount).toFixed(2);

  // ── Atomic: release buyer hold ──────────────────────────────────────────
  await User.findByIdAndUpdate(buyerId, {
    $inc: { "wallet.hold": -transaction.amount },
  });

  // ── Credit commission to admin balance ──────────────────────────────────
  if (commissionAmount > 0) {
    await SiteSettings.findByIdAndUpdate(settings._id, {
      $inc: { adminCommissionBalance: commissionAmount },
    });
  }

  // ── Determine if we should delay payout or pay immediately ──────────────
  if (payoutDelayDays > 0) {
    // Hold the seller net amount — will be released after N days by the payout job
    const payoutAt = new Date(Date.now() + payoutDelayDays * 24 * 60 * 60 * 1000);

    // Update transaction with commission info and payout schedule
    transaction.status = finalStatus;
    transaction.commissionPercent = commissionPercent;
    transaction.commissionAmount = commissionAmount;
    transaction.sellerNetAmount = sellerNetAmount;
    transaction.payoutStatus = "pending_payout";
    transaction.payoutAt = payoutAt;
    transaction.timeline.push({ event: finalStatus, note });
    transaction.timeline.push({
      event: "payout_scheduled",
      note: `Seller payout of ${sellerNetAmount} EGP scheduled for ${payoutAt.toISOString().split('T')[0]} (${payoutDelayDays} day hold, ${commissionPercent}% commission deducted)`,
    });
    await transaction.save();

    // Update seller stats (volume & trades count) even though payment is delayed
    await User.findByIdAndUpdate(sellerId, {
      $inc: {
        "stats.totalVolume": transaction.amount,
        "stats.successfulTrades": 1,
      },
    });
  } else {
    // No delay — pay seller immediately (minus commission)
    const updatedSeller = await User.findByIdAndUpdate(
      sellerId,
      {
        $inc: {
          "wallet.balance": sellerNetAmount,
          "stats.totalVolume": transaction.amount,
          "stats.successfulTrades": 1,
        },
      },
      { new: true }
    );

    // Sync updated seller to cache (best-effort)
    if (updatedSeller) {
      cacheService.cacheUser?.(updatedSeller)?.catch(() => { });
    }

    // Update transaction with commission info
    transaction.status = finalStatus;
    transaction.commissionPercent = commissionPercent;
    transaction.commissionAmount = commissionAmount;
    transaction.sellerNetAmount = sellerNetAmount;
    transaction.payoutStatus = "paid_out";
    transaction.paidOutAt = new Date();
    transaction.timeline.push({ event: finalStatus, note });
    if (commissionAmount > 0) {
      transaction.timeline.push({
        event: "commission_deducted",
        note: `${commissionPercent}% commission (${commissionAmount} EGP) deducted. Seller received ${sellerNetAmount} EGP.`,
      });
    }
    await transaction.save();
  }

  // Recalculate seller level (async, non-blocking)
  updateSellerLevel(sellerId).catch(err =>
    logger.error(`[Transaction] sellerLevel update failed: ${err.message}`)
  );

  // Mark listing sold
  await Listing.findByIdAndUpdate(transaction.listing._id || transaction.listing, {
    status: "sold",
  });

  const [buyerUser, sellerUser, listingDoc] = await Promise.all([
    User.findById(buyerId).select("username email").lean(),
    User.findById(sellerId).select("username email").lean(),
    Listing.findById(transaction.listing._id || transaction.listing).select("title").lean(),
  ]);

  // ── Durable notifications (survive server crash) ─────────────────────────
  const paymentMsg = payoutDelayDays > 0
    ? `Transaction confirmed! ${sellerNetAmount} EGP will be credited to your wallet in ${payoutDelayDays} days (${commissionPercent}% commission deducted).`
    : `${sellerNetAmount} EGP has been credited to your wallet for the sale${commissionAmount > 0 ? ` (${commissionPercent}% commission deducted)` : ''}.`;

  await queueNotification({
    userId: sellerId,
    type: finalStatus === "auto_confirmed" ? "auto_confirmed" : "purchase_confirmed",
    title: payoutDelayDays > 0 ? "✅ Sale Confirmed!" : "💰 Payment Received!",
    message: paymentMsg,
    relatedId: transaction._id,
    metadata: {
      transactionId: transaction._id.toString(),
      amount: sellerNetAmount,
      socketTargetId: sellerId,
    },
    socketEvent: finalStatus === "auto_confirmed" ? "notifySellerAutoConfirmed" : "notifySellerPurchaseConfirmed",
    socketPayload: { transactionId: transaction._id, amount: sellerNetAmount },
  });

  // Invoice update email to both parties
  const statusLabel = finalStatus === "auto_confirmed" ? "auto_confirmed" : "completed";
  const listingTitle = listingDoc?.title || "Listing";
  await Promise.allSettled([
    sendMonlyKingInvoiceEmail({
      to: buyerUser?.email,
      subject: `MonlyKing invoice update - ${statusLabel}`,
      payload: {
        heading: "Transaction Updated",
        intro: "Your transaction status has been updated.",
        transactionId: transaction._id.toString(),
        status: statusLabel,
        listingTitle,
        amount: transaction.amount,
        originalAmount: transaction.originalAmount || transaction.amount,
        discountPercent: transaction.discountPercent,
        buyerName: buyerUser?.username,
        buyerEmail: buyerUser?.email,
        sellerName: sellerUser?.username,
        sellerEmail: sellerUser?.email,
        note: `Seller net amount: ${sellerNetAmount.toFixed(2)} EGP. Commission: ${commissionAmount.toFixed(2)} EGP (${commissionPercent}%).`,
        createdAt: transaction.createdAt,
      },
    }),
    sendMonlyKingInvoiceEmail({
      to: sellerUser?.email,
      subject: `MonlyKing invoice update - ${statusLabel}`,
      payload: {
        heading: "Sale Status Updated",
        intro: "A sale on your listing was finalized.",
        transactionId: transaction._id.toString(),
        status: statusLabel,
        listingTitle,
        amount: transaction.amount,
        originalAmount: transaction.originalAmount || transaction.amount,
        discountPercent: transaction.discountPercent,
        buyerName: buyerUser?.username,
        buyerEmail: buyerUser?.email,
        sellerName: sellerUser?.username,
        sellerEmail: sellerUser?.email,
        note: `You will receive ${sellerNetAmount.toFixed(2)} EGP${payoutDelayDays > 0 ? ` after ${payoutDelayDays} day(s)` : ""}.`,
        createdAt: transaction.createdAt,
      },
    }),
  ]);

  // Notify buyer of status update (best-effort — not critical)
  try {
    socketService.notifyTransactionUpdate(buyerId, { transactionId: transaction._id, status: finalStatus });
    socketService.notifyTransactionUpdate(sellerId, { transactionId: transaction._id, status: finalStatus });
  } catch (_) { /* non-fatal */ }
}

async function _refundBuyer(transaction, note) {
  const buyerId = transaction.buyer.toString();
  const sellerId = transaction.seller.toString();

  // Atomic: return hold back to buyer balance
  await User.findByIdAndUpdate(buyerId, {
    $inc: { "wallet.hold": -transaction.amount, "wallet.balance": transaction.amount },
  });

  // Restore listing to available
  await Listing.findByIdAndUpdate(transaction.listing._id || transaction.listing, {
    status: "available",
  });

  transaction.status = "refunded";
  transaction.timeline.push({ event: "refunded", note: note || "Admin refunded buyer" });
  await transaction.save();

  const [buyerUser, sellerUser, listingDoc] = await Promise.all([
    User.findById(buyerId).select("username email").lean(),
    User.findById(sellerId).select("username email").lean(),
    Listing.findById(transaction.listing._id || transaction.listing).select("title").lean(),
  ]);

  // Durable notification to buyer
  await queueNotification({
    userId: buyerId,
    type: "dispute_resolved",
    title: "✅ Refund Processed",
    message: `Your ${transaction.amount} EGP has been refunded after admin review.`,
    relatedId: transaction._id,
    metadata: {
      transactionId: transaction._id.toString(),
      amount: transaction.amount,
      socketTargetId: buyerId,
    },
    socketEvent: "notifyDisputeResolved",
    socketPayload: { transactionId: transaction._id, decision: "refund" },
  });

  await Promise.allSettled([
    sendMonlyKingInvoiceEmail({
      to: buyerUser?.email,
      subject: "MonlyKing invoice update - refunded",
      payload: {
        heading: "Refund Processed",
        intro: "Your transaction was refunded after admin review.",
        transactionId: transaction._id.toString(),
        status: "refunded",
        listingTitle: listingDoc?.title || "Listing",
        amount: transaction.amount,
        originalAmount: transaction.originalAmount || transaction.amount,
        discountPercent: transaction.discountPercent,
        buyerName: buyerUser?.username,
        buyerEmail: buyerUser?.email,
        sellerName: sellerUser?.username,
        sellerEmail: sellerUser?.email,
        note: `${transaction.amount.toFixed(2)} EGP has been returned to your wallet balance.`,
        createdAt: transaction.createdAt,
      },
    }),
    sendMonlyKingInvoiceEmail({
      to: sellerUser?.email,
      subject: "MonlyKing invoice update - refunded",
      payload: {
        heading: "Order Refunded",
        intro: "A transaction linked to your listing was refunded.",
        transactionId: transaction._id.toString(),
        status: "refunded",
        listingTitle: listingDoc?.title || "Listing",
        amount: transaction.amount,
        originalAmount: transaction.originalAmount || transaction.amount,
        discountPercent: transaction.discountPercent,
        buyerName: buyerUser?.username,
        buyerEmail: buyerUser?.email,
        sellerName: sellerUser?.username,
        sellerEmail: sellerUser?.email,
        note: "Listing was returned to available state.",
        createdAt: transaction.createdAt,
      },
    }),
  ]);

  try {
    socketService.notifyDisputeResolved(sellerId, { transactionId: transaction._id, decision: "refund" });
    socketService.notifyTransactionUpdate(buyerId, { transactionId: transaction._id, status: "refunded" });
    socketService.notifyTransactionUpdate(sellerId, { transactionId: transaction._id, status: "refunded" });
  } catch (_) { /* non-fatal */ }
}

export { _releaseFundsToSeller }; // exported for cron job
