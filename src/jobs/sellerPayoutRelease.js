/**
 * Seller Payout Release Job
 *
 * Runs periodically to release funds to sellers whose payout delay has expired.
 * Checks for transactions with payoutStatus = "pending_payout" and payoutAt <= now.
 */
import Transaction from "../modules/transactions/transaction.model.js";
import User from "../modules/users/user.model.js";
import cacheService from "../services/cacheService.js";
import logger from "../utils/logger.js";

export async function runSellerPayoutRelease() {
    try {
        const now = new Date();

        // Find all transactions ready for payout
        const readyForPayout = await Transaction.find({
            payoutStatus: "pending_payout",
            payoutAt: { $lte: now },
            status: { $in: ["completed", "auto_confirmed"] },
        }).populate("listing", "_id title");

        if (readyForPayout.length === 0) return;

        logger.info(`[PayoutRelease] Processing ${readyForPayout.length} pending payout(s)…`);

        for (const tx of readyForPayout) {
            try {
                const sellerId = tx.seller.toString();
                const sellerNetAmount = tx.sellerNetAmount || tx.amount;

                // ── Atomic: credit seller balance ──────────────────────────────────
                const updatedSeller = await User.findByIdAndUpdate(
                    sellerId,
                    {
                        $inc: { "wallet.balance": sellerNetAmount },
                    },
                    { new: true }
                );

                // Sync updated seller to cache
                if (updatedSeller) {
                    cacheService.cacheUser?.(updatedSeller)?.catch(() => { });
                }

                // Update transaction payout status
                tx.payoutStatus = "paid_out";
                tx.paidOutAt = new Date();
                tx.timeline.push({
                    event: "payout_released",
                    note: `${sellerNetAmount} EGP released to seller wallet after hold period.`,
                });
                await tx.save();

                logger.info(`[PayoutRelease] ✅ ${tx._id} — ${sellerNetAmount} EGP released to seller ${sellerId}`);

                // Best-effort notification to seller
                try {
                    const Notification = (await import("../modules/notifications/notification.model.js")).default;
                    await Notification.create({
                        user: sellerId,
                        type: "payout_released",
                        title: "💰 Payment Released!",
                        message: `${sellerNetAmount} EGP has been credited to your wallet for your sale.`,
                        relatedModel: "Transaction",
                        relatedId: tx._id,
                        metadata: { transactionId: tx._id.toString(), amount: sellerNetAmount },
                    });
                } catch (notifErr) {
                    logger.error(`[PayoutRelease] Notification error for ${tx._id}: ${notifErr.message}`);
                }
            } catch (err) {
                logger.error(`[PayoutRelease] ❌ ${tx._id}: ${err.message}`);
            }
        }

        logger.info(`[PayoutRelease] Done processing payouts.`);
    } catch (err) {
        logger.error(`[PayoutRelease] Job error: ${err.message}`);
    }
}

/**
 * Start the payout release interval — runs every 1 hour.
 */
export function startPayoutReleaseJob() {
    const INTERVAL_MS = 60 * 60 * 1000; // 1 hour
    logger.info("[PayoutRelease] Job started (every 1 hour)");
    setInterval(runSellerPayoutRelease, INTERVAL_MS);
    // Run once 15 seconds after startup
    setTimeout(runSellerPayoutRelease, 15_000);
}
