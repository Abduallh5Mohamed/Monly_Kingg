/**
 * BullMQ connection configuration
 * Uses ioredis (already in project deps) so BullMQ can manage its own connection.
 * The existing `redis` client (cacheService) is kept separate.
 */
import IORedis from "ioredis";
import logger from "../utils/logger.js";

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = parseInt(process.env.REDIS_PORT || "6379");
const redisDb = parseInt(process.env.REDIS_DB || "0");
const redisPassword = process.env.REDIS_PASSWORD || undefined;

export const queueConnection = new IORedis({
  host: redisHost,
  port: redisPort,
  db: redisDb,
  password: redisPassword || undefined,
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,    // required by BullMQ
  lazyConnect: true,
});

queueConnection.on("connect", () =>
  logger.info("[Queue] Redis (ioredis) connected for BullMQ")
);
queueConnection.on("error", (err) =>
  logger.warn(`[Queue] Redis (ioredis) error: ${err.message}`)
);
