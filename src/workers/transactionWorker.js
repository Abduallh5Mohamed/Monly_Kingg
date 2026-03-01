/**
 * Transaction Worker
 * Processes BullMQ jobs for:
 *   - tx:notifications   → send DB + socket notification
 *   - tx:release-funds   → auto-confirm: release escrow to seller
 *   - tx:auto-confirm    → hourly scan for overdue transactions
 *
 * Running inside the same process keeps it simple, but because BullMQ
 * uses distributed locking (Redis SET NX) each job is processed by
 * exactly ONE worker instance even in a PM2 cluster.
 */
import { Worker } from "bullmq";
import { queueConnection } from "../config/queue.js";
import Notification from "../modules/notifications/notification.model.js";
import Transaction from "../modules/transactions/transaction.model.js";
import socketService from "../services/socketService.js";
import logger from "../utils/logger.js";

// ── lazy import to avoid circular deps ────────────────────────────────────────
let _releaseFn = null;
async function getRelease() {
  if (!_releaseFn) {
    const mod = await import("../modules/transactions/transaction.controller.js");
    _releaseFn = mod._releaseFundsToSeller;
  }
  return _releaseFn;
}

// ─── tx:notifications worker ─────────────────────────────────────────────────
export const notificationWorker = new Worker(
  "tx-notifications",
  async (job) => {
    const { userId, type, title, message, relatedId, metadata, socketEvent, socketPayload } = job.data;

    // 1. Persist DB notification
    try {
      await Notification.create({
        user: userId,
        type,
        title,
        message,
        relatedModel: "Transaction",
        relatedId,
        metadata: metadata || {},
      });
    } catch (err) {
      // Duplicate: notification may already exist (idempotent retry)
      if (err.code !== 11000) throw err;
    }

    // 2. Mark transaction notification as sent (best-effort)
    if (metadata?.transactionId && metadata?.notificationField) {
      try {
        await Transaction.findByIdAndUpdate(metadata.transactionId, {
          $set: { [metadata.notificationField]: new Date() },
        });
      } catch (_) { /* non-fatal */ }
    }

    // 3. Emit socket (best-effort — user may be offline)
    try {
      if (socketEvent && socketService[socketEvent]) {
        const targetId = metadata?.socketTargetId || userId;
        socketService[socketEvent](targetId, socketPayload || {});
      }
    } catch (err) {
      logger.warn(`[Worker] socket emit failed (non-fatal): ${err.message}`);
    }
  },
  { connection: queueConnection, concurrency: 5 }
);

// ─── tx:release-funds worker ─────────────────────────────────────────────────
export const releaseFundsWorker = new Worker(
  "tx-release-funds",
  async (job) => {
    const { transactionId, finalStatus, note } = job.data;
    const release = await getRelease();

    const tx = await Transaction.findById(transactionId).populate("listing", "_id title");
    if (!tx) {
      logger.warn(`[Worker] release-funds: tx ${transactionId} not found — skipping`);
      return;
    }

    // Guard: only process if still waiting_buyer (idempotency)
    if (tx.status !== "waiting_buyer") {
      logger.info(`[Worker] release-funds: tx ${transactionId} already ${tx.status} — skipping`);
      return;
    }

    await release(tx, finalStatus || "auto_confirmed", note || "Auto-confirmed after 48 hours");
    logger.info(`[Worker] release-funds: tx ${transactionId} → ${finalStatus}`);
  },
  { connection: queueConnection, concurrency: 2 }
);

// ─── tx:auto-confirm worker ──────────────────────────────────────────────────
export const autoConfirmWorker = new Worker(
  "tx-auto-confirm",
  async () => {
    const { releaseFundsQueue } = await import("../queues/transactionQueue.js");

    const overdue = await Transaction.find({
      status: "waiting_buyer",
      autoConfirmAt: { $lte: new Date() },
    }).select("_id").lean();

    if (overdue.length === 0) {
      logger.info("[Worker] auto-confirm: no overdue transactions");
      return;
    }

    logger.info(`[Worker] auto-confirm: queuing ${overdue.length} transaction(s)`);

    for (const tx of overdue) {
      await releaseFundsQueue.add(
        "release",
        { transactionId: tx._id.toString(), finalStatus: "auto_confirmed" },
        {
          jobId: `release-${tx._id}`, // deduplicate: same tx won't be queued twice
        }
      );
    }
  },
  { connection: queueConnection, concurrency: 1 }
);

// ── worker error logging ───────────────────────────────────────────────────────
[notificationWorker, releaseFundsWorker, autoConfirmWorker].forEach((w) => {
  w.on("failed", (job, err) =>
    logger.error(`[Worker] ${w.name} job ${job?.id} failed: ${err.message}`)
  );
  w.on("error", (err) =>
    logger.error(`[Worker] ${w.name} error: ${err.message}`)
  );
});

export function startTransactionWorkers() {
  logger.info("[Worker] Transaction workers started (notifications, release-funds, auto-confirm)");
}
