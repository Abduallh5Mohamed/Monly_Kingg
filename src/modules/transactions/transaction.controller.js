import mongoose from "mongoose";
import Transaction from "./transaction.model.js";
import Listing from "../listings/listing.model.js";
import User from "../users/user.model.js";
import Discount from "../discounts/discount.model.js";
import Campaign from "../campaigns/campaign.model.js";
import Notification from "../notifications/notification.model.js";
import SellerRequest from "../sellers/sellerRequest.model.js";
import cacheService from "../../services/cacheService.js";
import socketService from "../../services/socketService.js";
import logger from "../../utils/logger.js";
import { encrypt, decrypt } from "../../utils/encryption.js";

// ─── Credential encryption helpers ───────────────────────────────────────────
function encryptCredentials(credentials) {
  return credentials.map(c => ({
    key: c.key,
    value: encrypt(c.value),
  }));
}

function decryptCredentials(credentials) {
  if (!credentials || !Array.isArray(credentials)) return [];
  return credentials.map(c => ({
    key: c.key,
    value: decrypt(c.value),
  }));
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

// ─── POST /api/v1/transactions ───────────────────────────────────────────────
// Buyer starts the purchase — deducts balance to hold
export const createTransaction = async (req, res) => {
  try {
    const buyerId = req.user._id.toString();
    const { listingId } = req.body;

    if (!listingId) {
      return res.status(400).json({ success: false, message: "listingId is required" });
    }

    // Load listing
    const listing = await Listing.findById(listingId).populate("seller", "_id username");
    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }
    if (listing.status !== "available") {
      return res.status(400).json({ success: false, message: "Listing is not available" });
    }
    if (listing.seller._id.toString() === buyerId) {
      return res.status(400).json({ success: false, message: "You cannot buy your own listing" });
    }

    // ── Determine the final price (check discounts & campaigns) ──
    let finalPrice = listing.price;
    let discountApplied = null;

    const now = new Date();

    // 1) Individual listing discount
    const activeDiscount = await Discount.findOne({
      listing: listingId,
      status: "active",
      $or: [{ endDate: null }, { endDate: { $gte: now } }],
    }).lean();

    if (activeDiscount) {
      finalPrice = activeDiscount.discountedPrice;
      discountApplied = {
        type: "discount",
        percent: activeDiscount.discountPercent,
        originalPrice: activeDiscount.originalPrice,
        finalPrice: activeDiscount.discountedPrice,
      };
    } else {
      // 2) Voluntary campaign
      const voluntaryCampaign = await Campaign.findOne({
        type: "voluntary",
        status: "active",
        endDate: { $gte: now },
        "participatingListings.listing": listing._id,
      }).lean();

      if (voluntaryCampaign) {
        finalPrice = +(listing.price * (1 - voluntaryCampaign.discountPercent / 100)).toFixed(2);
        discountApplied = {
          type: "campaign_voluntary",
          campaignId: voluntaryCampaign._id,
          percent: voluntaryCampaign.discountPercent,
          originalPrice: listing.price,
          finalPrice,
        };
      } else {
        // 3) Mandatory campaign
        const gameId = listing.game?._id || listing.game;
        const mandatoryCampaign = await Campaign.findOne({
          type: "mandatory",
          status: "active",
          endDate: { $gte: now },
          games: gameId,
        }).lean();

        if (mandatoryCampaign) {
          finalPrice = +(listing.price * (1 - mandatoryCampaign.discountPercent / 100)).toFixed(2);
          discountApplied = {
            type: "campaign_mandatory",
            campaignId: mandatoryCampaign._id,
            percent: mandatoryCampaign.discountPercent,
            originalPrice: listing.price,
            finalPrice,
          };
        }
      }
    }

    // Load buyer and check balance
    const buyer = await User.findById(buyerId);
    if (!buyer) return res.status(404).json({ success: false, message: "User not found" });

    const balance = buyer.wallet?.balance || 0;
    if (balance < finalPrice) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance",
        required: finalPrice,
        available: balance,
      });
    }

    // Atomic: deduct from balance, add to hold
    buyer.wallet.balance -= finalPrice;
    buyer.wallet.hold = (buyer.wallet.hold || 0) + finalPrice;
    await buyer.save();

    // Mark listing as in_progress
    listing.status = "in_progress";
    await listing.save();

    // Create transaction
    const transaction = await Transaction.create({
      buyer: buyerId,
      seller: listing.seller._id,
      listing: listingId,
      amount: finalPrice,
      originalAmount: discountApplied ? discountApplied.originalPrice : undefined,
      discountPercent: discountApplied ? discountApplied.percent : undefined,
      status: "waiting_seller",
      timeline: [{ event: "purchase_initiated", note: `Buyer ${buyer.username} initiated purchase${discountApplied ? ` (${discountApplied.percent}% discount applied)` : ''}` }],
    });

    // Notify seller via DB + socket
    const sellerId = listing.seller._id.toString();
    await createNotification({
      userId: sellerId,
      type: "purchase_initiated",
      title: "New Purchase!",
      message: `${buyer.username} purchased "${listing.title}" for ${finalPrice} EGP${discountApplied ? ` (${discountApplied.percent}% off)` : ''}. Please submit the account credentials.`,
      relatedId: transaction._id,
      metadata: { transactionId: transaction._id, listingTitle: listing.title, amount: finalPrice },
    });
    socketService.notifySellerNewPurchase(sellerId, {
      transactionId: transaction._id,
      listingId: listing._id,
      listingTitle: listing.title,
      amount: finalPrice,
      buyerUsername: buyer.username,
    });

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
    await createNotification({
      userId: buyerId,
      type: "credentials_sent",
      title: "🔑 Account Credentials Ready!",
      message: `The seller sent the credentials for "${transaction.listing.title}". Please verify and confirm within 48 hours.`,
      relatedId: transaction._id,
      metadata: { transactionId: transaction._id, listingTitle: transaction.listing.title },
    });
    socketService.notifyBuyerCredentialsSent(buyerId, {
      transactionId: transaction._id,
      listingTitle: transaction.listing.title,
      autoConfirmAt,
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

    transaction.status = "disputed";
    transaction.disputeReason = reason || "No reason provided";
    transaction.timeline.push({ event: "dispute_opened", note: reason || "Buyer opened dispute" });
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

    // DB notification for admin users (all admins)
    await createNotification({
      userId: transaction.seller.toString(), // also notify seller
      type: "purchase_disputed",
      title: "⚠️ Dispute Opened",
      message: `A buyer opened a dispute for "${transaction.listing.title}": ${transaction.disputeReason}`,
      relatedId: transaction._id,
      metadata: { transactionId: transaction._id },
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
    const { role, status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (role === "buyer") filter.buyer = userId;
    else if (role === "seller") filter.seller = userId;
    else filter.$or = [{ buyer: userId }, { seller: userId }];

    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .select("-credentials") // ✅ SECURITY: Never include credentials in list views
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
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
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
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
      .populate("listing", "title coverImage price details game")
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
    const { status, page = 1, limit = 30, search } = req.query;
    const filter = {};
    if (status) filter.status = status;

    // Search by transaction ID
    if (search) {
      const trimmed = search.trim();
      if (mongoose.Types.ObjectId.isValid(trimmed)) {
        filter._id = trimmed;
      } else {
        // Try partial match on the hex string
        filter.$or = [
          ...(trimmed.length >= 3 ? [{ _id: { $regex: trimmed, $options: "i" } }] : []),
        ];
        if (!filter.$or.length) delete filter.$or;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .select("-credentials") // ✅ SECURITY: Never include credentials in admin list view
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("listing", "title price")
        .populate("buyer", "username email")
        .populate("seller", "username email"),
      Transaction.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: transactions,
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
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

  // Release buyer hold
  await User.findByIdAndUpdate(buyerId, {
    $inc: { "wallet.hold": -transaction.amount },
  });

  // Credit seller balance
  await cacheService.updateBalanceWithSync(sellerId, transaction.amount, "sale_completed");

  // Update seller stats (totalVolume, successfulTrades) and recalculate level
  await User.findByIdAndUpdate(sellerId, {
    $inc: { "stats.totalVolume": transaction.amount, "stats.successfulTrades": 1 },
  });
  // Recalculate seller level (async, non-blocking for the transaction)
  updateSellerLevel(sellerId).catch(err =>
    logger.error(`[Transaction] sellerLevel update failed: ${err.message}`)
  );

  // Mark listing sold
  await Listing.findByIdAndUpdate(transaction.listing._id || transaction.listing, {
    status: "sold",
  });

  transaction.status = finalStatus;
  transaction.timeline.push({ event: finalStatus, note });
  await transaction.save();

  // Notify seller
  await createNotification({
    userId: sellerId,
    type: finalStatus === "auto_confirmed" ? "auto_confirmed" : "purchase_confirmed",
    title: "💰 Payment Received!",
    message: `${transaction.amount} EGP has been credited to your wallet for the sale.`,
    relatedId: transaction._id,
    metadata: { transactionId: transaction._id, amount: transaction.amount },
  });

  if (finalStatus === "auto_confirmed") {
    socketService.notifySellerAutoConfirmed(sellerId, {
      transactionId: transaction._id,
      amount: transaction.amount,
    });
  } else {
    socketService.notifySellerPurchaseConfirmed(sellerId, {
      transactionId: transaction._id,
      amount: transaction.amount,
    });
  }

  socketService.notifyTransactionUpdate(buyerId, { transactionId: transaction._id, status: finalStatus });
  socketService.notifyTransactionUpdate(sellerId, { transactionId: transaction._id, status: finalStatus });
}

async function _refundBuyer(transaction, note) {
  const buyerId = transaction.buyer.toString();
  const sellerId = transaction.seller.toString();

  // Return hold back to buyer balance
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

  await createNotification({
    userId: buyerId,
    type: "dispute_resolved",
    title: "✅ Refund Processed",
    message: `Your ${transaction.amount} EGP has been refunded after admin review.`,
    relatedId: transaction._id,
    metadata: { transactionId: transaction._id, amount: transaction.amount },
  });

  socketService.notifyDisputeResolved(buyerId, { transactionId: transaction._id, decision: "refund" });
  socketService.notifyDisputeResolved(sellerId, { transactionId: transaction._id, decision: "refund" });
  socketService.notifyTransactionUpdate(buyerId, { transactionId: transaction._id, status: "refunded" });
  socketService.notifyTransactionUpdate(sellerId, { transactionId: transaction._id, status: "refunded" });
}

export { _releaseFundsToSeller }; // exported for cron job
