/**
 * Auto-Confirm Job
 *
 * Replaced the old setInterval with a BullMQ repeatable job.
 *
 * Benefits over setInterval:
 *  - Runs exactly ONCE even when PM2 runs multiple instances (Redis lock).
 *  - Survives server restarts — the repeatable job stays in Redis.
 *  - Failed runs are retried automatically with backoff.
 *
 * The actual work is done in src/workers/transactionWorker.js
 * (autoConfirmWorker → enqueues tx:release-funds jobs per overdue tx).
 */
import { scheduleAutoConfirmJob } from "../queues/transactionQueue.js";
import logger from "../utils/logger.js";

export async function startAutoConfirmJob() {
  try {
    await scheduleAutoConfirmJob();
    logger.info("[AutoConfirm] BullMQ repeatable job scheduled (every 1 hour)");
  } catch (err) {
    // If Redis is down, fallback to setInterval so the system keeps working
    logger.warn(`[AutoConfirm] BullMQ scheduling failed, falling back to setInterval: ${err.message}`);
    _startFallbackInterval();
  }
}

// ─── Fallback (Redis unavailable) ────────────────────────────────────────────
import Transaction from "../modules/transactions/transaction.model.js";
import { _releaseFundsToSeller } from "../modules/transactions/transaction.controller.js";

async function runAutoConfirmFallback() {
  try {
    const overdue = await Transaction.find({
      status: "waiting_buyer",
      autoConfirmAt: { $lte: new Date() },
    }).populate("listing", "_id title");

    if (overdue.length === 0) return;
    logger.info(`[AutoConfirm-fallback] Processing ${overdue.length} overdue transaction(s)…`);

    for (const tx of overdue) {
      try {
        await _releaseFundsToSeller(tx, "auto_confirmed", "Auto-confirmed after 48 hours");
        logger.info(`[AutoConfirm-fallback] ✅ ${tx._id} auto-confirmed`);
      } catch (err) {
        logger.error(`[AutoConfirm-fallback] ❌ ${tx._id}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`[AutoConfirm-fallback] Job error: ${err.message}`);
  }
}

function _startFallbackInterval() {
  const INTERVAL_MS = 60 * 60 * 1000;
  logger.info("[AutoConfirm] Fallback setInterval started (every 1 hour)");
  setInterval(runAutoConfirmFallback, INTERVAL_MS);
  setTimeout(runAutoConfirmFallback, 10_000);
}
