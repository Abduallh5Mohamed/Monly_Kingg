/**
 * Startup Recovery Scanner
 *
 * Runs once every time the server starts. Finds any transactions whose
 * notifications were never delivered (server crashed between DB write and
 * notification dispatch) and re-queues them.
 *
 * Cases detected:
 *
 *  1. "waiting_seller" tx without sellerNotifiedAt
 *     → seller never got the "you have a new purchase" notification.
 *       Re-queue it so the seller knows to submit credentials.
 *
 *  2. "waiting_buyer" tx without buyerNotifiedAt
 *     → buyer never got the "credentials ready" notification.
 *       Re-queue it.
 *
 *  3. "waiting_seller" tx older than 1 hour
 *     → possibly the listing is stuck as "in_progress" but the transaction
 *       record was never fully committed. Log for admin review.
 *       (Would require MongoDB sessions for true rollback; this is an alert.)
 */
import Transaction from "../modules/transactions/transaction.model.js";
import User from "../modules/users/user.model.js";
import { notificationQueue } from "../queues/transactionQueue.js";
import logger from "../utils/logger.js";

export async function runStartupRecovery() {
  try {
    logger.info("[Recovery] Starting startup recovery scan…");

    await _recoverMissingSellerNotifications();
    await _recoverMissingBuyerNotifications();
    await _detectOrphanedTransactions();

    logger.info("[Recovery] Startup recovery scan complete");
  } catch (err) {
    logger.error(`[Recovery] Scan error: ${err.message}`);
  }
}

// ─── 1. Seller never got "new purchase" notification ─────────────────────────
async function _recoverMissingSellerNotifications() {
  const unnotified = await Transaction.find({
    status: "waiting_seller",
    sellerNotifiedAt: { $exists: false },
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // last 7 days
  })
    .populate("listing", "title")
    .populate("buyer", "username")
    .lean();

  if (unnotified.length === 0) return;
  logger.warn(`[Recovery] ${unnotified.length} transaction(s) with missing seller notification — re-queuing`);

  for (const tx of unnotified) {
    const buyerName = tx.buyer?.username || "A buyer";
    const listingTitle = tx.listing?.title || "an item";

    await notificationQueue.add(
      "notify",
      {
        userId: tx.seller.toString(),
        type: "purchase_initiated",
        title: "New Purchase! (recovered)",
        message: `${buyerName} purchased "${listingTitle}" for ${tx.amount} EGP. Please submit the account credentials.`,
        relatedId: tx._id.toString(),
        metadata: {
          transactionId: tx._id.toString(),
          listingTitle,
          amount: tx.amount,
          notificationField: "sellerNotifiedAt",
          socketTargetId: tx.seller.toString(),
        },
        socketEvent: "notifySellerNewPurchase",
        socketPayload: {
          transactionId: tx._id,
          listingTitle,
          amount: tx.amount,
          buyerUsername: buyerName,
          recovered: true,
        },
      },
      { jobId: `recover-seller-${tx._id}` } // stable ID prevents double-queuing
    );
  }
}

// ─── 2. Buyer never got "credentials ready" notification ─────────────────────
async function _recoverMissingBuyerNotifications() {
  const unnotified = await Transaction.find({
    status: "waiting_buyer",
    buyerNotifiedAt: { $exists: false },
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  })
    .populate("listing", "title")
    .lean();

  if (unnotified.length === 0) return;
  logger.warn(`[Recovery] ${unnotified.length} transaction(s) with missing buyer notification — re-queuing`);

  for (const tx of unnotified) {
    const listingTitle = tx.listing?.title || "an item";

    await notificationQueue.add(
      "notify",
      {
        userId: tx.buyer.toString(),
        type: "credentials_sent",
        title: "🔑 Account Credentials Ready! (recovered)",
        message: `The seller sent the credentials for "${listingTitle}". Please verify and confirm.`,
        relatedId: tx._id.toString(),
        metadata: {
          transactionId: tx._id.toString(),
          listingTitle,
          notificationField: "buyerNotifiedAt",
          socketTargetId: tx.buyer.toString(),
        },
        socketEvent: "notifyBuyerCredentialsSent",
        socketPayload: {
          transactionId: tx._id,
          listingTitle,
          autoConfirmAt: tx.autoConfirmAt,
          recovered: true,
        },
      },
      { jobId: `recover-buyer-${tx._id}` }
    );
  }
}

// ─── 3. Alert on orphaned / very old waiting_seller transactions ──────────────
async function _detectOrphanedTransactions() {
  const ONE_HOUR_AGO = new Date(Date.now() - 60 * 60 * 1000);

  const orphans = await Transaction.find({
    status: "waiting_seller",
    sellerNotifiedAt: { $exists: false },
    createdAt: { $lt: ONE_HOUR_AGO },
  })
    .select("_id buyer seller amount createdAt")
    .lean();

  if (orphans.length === 0) return;

  logger.error(
    `[Recovery] ⚠️  ${orphans.length} transaction(s) older than 1 hour with no seller notification. ` +
    `These may be partially-committed. IDs: ${orphans.map(t => t._id).join(", ")}. ` +
    `Check buyer wallet.hold vs open transactions manually.`
  );
}
