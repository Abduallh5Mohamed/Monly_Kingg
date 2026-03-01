/**
 * Transaction Queues
 *
 * Three durable queues backed by Redis (BullMQ):
 *
 *  tx:notifications  — send DB + socket notifications after a transaction event.
 *                      If the server was down when the event fired, the job
 *                      stays in Redis and is processed on restart.
 *
 *  tx:release-funds  — release escrowed funds to the seller
 *                      (auto-confirm expiry). Processed once even when
 *                      multiple PM2 instances are running.
 *
 *  tx:auto-confirm   — repeatable (every 1 h) scan for overdue transactions.
 *                      Replaces the old setInterval — runs on exactly ONE
 *                      worker instance at a time.
 */
import { Queue } from "bullmq";
import { queueConnection } from "../config/queue.js";

export const notificationQueue = new Queue("tx-notifications", {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 100 },
  },
});

export const releaseFundsQueue = new Queue("tx-release-funds", {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 3000 },
    removeOnComplete: { count: 200 },
    removeOnFail: { count: 100 },
  },
});

export const autoConfirmQueue = new Queue("tx-auto-confirm", {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "fixed", delay: 5000 },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 20 },
  },
});

/**
 * Schedule the repeatable auto-confirm scan (every 1 hour).
 * Safe to call multiple times — BullMQ deduplicates by key.
 */
export async function scheduleAutoConfirmJob() {
  await autoConfirmQueue.add(
    "scan",
    {},
    {
      repeat: { every: 60 * 60 * 1000 }, // every 1 hour
      jobId: "auto-confirm-scan",         // stable ID prevents duplicates
    }
  );
}
