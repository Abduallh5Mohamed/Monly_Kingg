/**
 * Auto-Confirm Job
 * Runs every hour. Any transaction that is `waiting_buyer` and
 * whose `autoConfirmAt` has passed gets auto-confirmed (funds released to seller).
 */
import Transaction from "../modules/transactions/transaction.model.js";
import { _releaseFundsToSeller } from "../modules/transactions/transaction.controller.js";
import logger from "../utils/logger.js";

export async function runAutoConfirm() {
  try {
    const overdue = await Transaction.find({
      status: "waiting_buyer",
      autoConfirmAt: { $lte: new Date() },
    }).populate("listing", "_id title");

    if (overdue.length === 0) return;

    logger.info(`[AutoConfirm] Processing ${overdue.length} overdue transaction(s)…`);

    for (const tx of overdue) {
      try {
        await _releaseFundsToSeller(tx, "auto_confirmed", "Auto-confirmed after 48 hours");
        logger.info(`[AutoConfirm] ✅ Transaction ${tx._id} auto-confirmed`);
      } catch (err) {
        logger.error(`[AutoConfirm] ❌ Failed to auto-confirm ${tx._id}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`[AutoConfirm] Job error: ${err.message}`);
  }
}

// Start the job — runs every hour
export function startAutoConfirmJob() {
  const INTERVAL_MS = 60 * 60 * 1000; // 1 hour
  logger.info("[AutoConfirm] Scheduled job started (runs every 1 hour)");
  setInterval(runAutoConfirm, INTERVAL_MS);
  // Also run once on startup after a short delay
  setTimeout(runAutoConfirm, 10_000);
}
