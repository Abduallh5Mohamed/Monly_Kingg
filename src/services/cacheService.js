/**
 * Unified Cache Service
 * 
 * Replaces: userCacheService, cacheSyncService, enhancedCacheService
 * 
 * Design Principles:
 * 1. Single source of truth — ONE service for ALL caching
 * 2. Consistent storage format — always STRING (JSON.stringify via redis.set)
 * 3. Read-Through: cache → DB fallback → populate cache
 * 4. Write-Through: DB first → cache after
 * 5. SCAN-based cleanup (never KEYS in production)
 * 6. Graceful degradation — all ops fail silently, never block requests
 * 
 * Key Patterns:
 *   user:{userId}           → user profile data (TTL: 5 min)
 *   user:email:{email}      → same user data, indexed by email (TTL: 5 min)
 *   auth:user:{userId}      → authenticated user for middleware (TTL: 5 min)
 *   session:{userId}        → session tokens (TTL: 24 hr)
 *   temp_code:{type}:{email}→ verification codes (TTL: 15 min)
 *   password_reset:{userId} → reset tokens (TTL: 15 min)
 *   password_reset_rate:{e} → rate limiter (TTL: 1 hr)
 *   rate_limit:{act}:{ip}   → rate limiter (TTL: varies)
 *   auth_logs:{userId}      → login history list (TTL: 7 days)
 *   games:all               → all active games (TTL: 6 hr)
 *   game:slug:{slug}        → single game (TTL: 6 hr)
 *   admin:stats             → dashboard aggregation (TTL: 3 min)
 *   api_cache:{uid}:{url}   → API response cache (TTL: varies)
 */

import redis from '../config/redis.js';
import logger from '../utils/logger.js';
import User from '../modules/users/user.model.js';

// ─── TTL Constants (seconds) ─────────────────────────────────
const TTL = {
  USER: 300,            // 5 minutes — short enough to stay fresh
  SESSION: 86400,       // 24 hours
  TEMP_CODE: 900,       // 15 minutes
  PASSWORD_RESET: 900,  // 15 minutes
  RATE_LIMIT: 3600,     // 1 hour
  AUTH_LOG: 604800,     // 7 days
  GAMES: 21600,         // 6 hours — rarely changes
  ADMIN_STATS: 180,     // 3 minutes
  API_RESPONSE: 300,    // 5 minutes (default, overridden per-route)
};

// ─── Sensitive fields to strip before caching ────────────────
const SENSITIVE_FIELDS = [
  'passwordHash', 'refreshTokens', 'authLogs', '__v',
  'verificationCode', 'verificationCodeValidation',
  'forgotPasswordCode', 'forgotPasswordCodeValidation',
  'twoFA', 'resetPasswordToken',
];

function stripSensitive(data) {
  const clean = typeof data?.toObject === 'function' ? data.toObject() : { ...data };
  for (const field of SENSITIVE_FIELDS) {
    delete clean[field];
  }
  return clean;
}

// ─── SCAN helper (replaces dangerous KEYS command) ───────────
async function scanKeys(pattern, count = 100) {
  if (!redis.isReady()) return [];
  const client = redis.getClient();
  const keys = [];
  let cursor = '0';
  try {
    do {
      const result = await client.sendCommand(['SCAN', cursor, 'MATCH', pattern, 'COUNT', String(count)]);
      cursor = result[0];
      if (result[1] && result[1].length > 0) {
        keys.push(...result[1]);
      }
    } while (cursor !== '0');
  } catch (error) {
    logger.error(`[Cache] scanKeys error for pattern ${pattern}: ${error.message}`);
  }
  return keys;
}

// ════════════════════════════════════════════════════════════════
// USER CACHE
// ════════════════════════════════════════════════════════════════

/**
 * Get user by ID or email (Read-Through)
 * Cache → DB → populate cache
 */
async function getUser(identifier) {
  try {
    const isEmail = typeof identifier === 'string' && identifier.includes('@');
    const cacheKey = isEmail ? `user:email:${identifier}` : `user:${identifier}`;

    // 1. Try cache
    const cached = await redis.get(cacheKey);
    if (cached) return cached;

    // 2. Cache miss — query DB
    const query = isEmail ? { email: identifier } : { _id: identifier };
    const user = await User.findOne(query)
      .select('-passwordHash -verificationCode -resetPasswordToken -refreshTokens -authLogs -__v')
      .lean();

    if (user) {
      cacheUser(user).catch(() => { }); // fire-and-forget
    }
    return user || null;
  } catch (error) {
    logger.error(`[Cache] getUser error: ${error.message}`);
    // Fallback to DB
    try {
      const query = typeof identifier === 'string' && identifier.includes('@')
        ? { email: identifier } : { _id: identifier };
      return await User.findOne(query).lean();
    } catch { return null; }
  }
}

/**
 * Cache user profile by ID + email index
 */
async function cacheUser(user) {
  try {
    const userId = (user._id || user.id).toString();
    const clean = stripSensitive(user);

    const ops = [redis.set(`user:${userId}`, clean, TTL.USER)];
    if (clean.email) {
      ops.push(redis.set(`user:email:${clean.email}`, clean, TTL.USER));
    }
    await Promise.allSettled(ops);
    return true;
  } catch (error) {
    logger.error(`[Cache] cacheUser error: ${error.message}`);
    return false;
  }
}

/**
 * Invalidate all cached keys for a user
 */
async function invalidateUser(userId, email = null) {
  try {
    const ops = [
      redis.del(`user:${userId}`),
      redis.del(`auth:user:${userId}`),
      redis.del(`session:${userId}`),
    ];

    // Try to find email from cached data if not provided
    if (!email) {
      const cached = await redis.get(`user:${userId}`);
      if (cached?.email) email = cached.email;
    }
    if (email) {
      ops.push(redis.del(`user:email:${email}`));
    }

    await Promise.allSettled(ops);
    return true;
  } catch (error) {
    logger.error(`[Cache] invalidateUser error: ${error.message}`);
    return false;
  }
}

/**
 * Write-Through: update user in DB, then re-cache
 */
async function updateUserWithSync(userId, updates) {
  try {
    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select('-passwordHash -verificationCode -resetPasswordToken -refreshTokens -authLogs -__v').lean();

    if (updatedUser) {
      await cacheUser(updatedUser);
    }
    return updatedUser;
  } catch (error) {
    logger.error(`[Cache] updateUserWithSync error: ${error.message}`);
    throw error;
  }
}

/**
 * Write-Through: update user balance atomically, then sync cache
 * CRITICAL: Financial operation — uses atomic $inc, DB is source of truth
 */
async function updateBalanceWithSync(userId, balanceChange, reason = 'balance update') {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { 'wallet.balance': balanceChange } },
      { new: true }
    ).select('-passwordHash -verificationCode -resetPasswordToken -refreshTokens -authLogs -__v').lean();

    if (!updatedUser) throw new Error('User not found');

    await cacheUser(updatedUser);

    logger.info(`[Cache] Balance: user ${userId} changed by ${balanceChange} → ${updatedUser.wallet?.balance} (${reason})`);
    return updatedUser;
  } catch (error) {
    logger.error(`[Cache] updateBalanceWithSync error: ${error.message}`);
    throw error;
  }
}

/**
 * Write-Through: delete user from DB and cache
 */
async function deleteUser(userId) {
  try {
    const user = await User.findByIdAndDelete(userId);
    if (user) {
      await invalidateUser(userId, user.email);
      await redis.del(`auth_logs:${userId}`);
    }
    return true;
  } catch (error) {
    logger.error(`[Cache] deleteUser error: ${error.message}`);
    throw error;
  }
}

/**
 * Clear all cache entries for a user
 */
async function clearUserCache(userId) {
  try {
    await Promise.allSettled([
      invalidateUser(userId),
      redis.del(`auth_logs:${userId}`),
    ]);
    return true;
  } catch { return false; }
}

// ════════════════════════════════════════════════════════════════
// SESSION CACHE (Redis-only — no DB)
// ════════════════════════════════════════════════════════════════

async function cacheSession(userId, sessionData) {
  return redis.set(`session:${userId}`, sessionData, TTL.SESSION);
}

async function getSession(userId) {
  return redis.get(`session:${userId}`);
}

async function removeSession(userId) {
  return redis.del(`session:${userId}`);
}

// ════════════════════════════════════════════════════════════════
// TEMP CODES (Redis-only)
// ════════════════════════════════════════════════════════════════

async function cacheTempCode(email, type, code) {
  return redis.set(`temp_code:${type}:${email}`, { code, email, type, createdAt: new Date() }, TTL.TEMP_CODE);
}

async function getTempCode(email, type) {
  return redis.get(`temp_code:${type}:${email}`);
}

async function removeTempCode(email, type) {
  return redis.del(`temp_code:${type}:${email}`);
}

// ════════════════════════════════════════════════════════════════
// PASSWORD RESET (Redis-only)
// ════════════════════════════════════════════════════════════════

async function cachePasswordResetToken(userId, token) {
  return redis.set(`password_reset:${userId}`, {
    token, userId, createdAt: new Date(),
    expiresAt: new Date(Date.now() + TTL.PASSWORD_RESET * 1000),
  }, TTL.PASSWORD_RESET);
}

async function getPasswordResetToken(identifier) {
  try {
    let resetKey;
    if (typeof identifier === 'string' && identifier.includes('@')) {
      const user = await getUser(identifier);
      if (!user) return null;
      resetKey = `password_reset:${user._id}`;
    } else {
      resetKey = `password_reset:${identifier}`;
    }
    const data = await redis.get(resetKey);
    if (data) {
      if (new Date(data.expiresAt) < new Date()) {
        redis.del(resetKey).catch(() => { });
        return null;
      }
      return data.token;
    }
    return null;
  } catch { return null; }
}

async function removePasswordResetToken(userId) {
  return redis.del(`password_reset:${userId}`);
}

async function checkPasswordResetRateLimit(email, maxRequests = 3, windowMinutes = 60) {
  try {
    const count = await redis.incr(`password_reset_rate:${email}`, windowMinutes * 60);
    const limited = count > maxRequests;
    if (limited) logger.warn(`[Cache] Password reset rate limit: ${email}`);
    return { allowed: !limited, currentCount: count, maxRequests };
  } catch {
    return { allowed: true, currentCount: 0, maxRequests };
  }
}

// ════════════════════════════════════════════════════════════════
// RATE LIMITING (Redis-only)
// ════════════════════════════════════════════════════════════════

async function checkRateLimit(ip, action, maxRequests = 10, windowSeconds = 3600) {
  try {
    const count = await redis.incr(`rate_limit:${action}:${ip}`, windowSeconds);
    const limited = count > maxRequests;
    if (limited) logger.warn(`[Cache] Rate limit exceeded: ${action} from ${ip}`);
    return { allowed: !limited, currentCount: count, maxRequests };
  } catch {
    return { allowed: true, currentCount: 0, maxRequests };
  }
}

// ════════════════════════════════════════════════════════════════
// AUTH LOGS (Redis-only, now with TTL)
// ════════════════════════════════════════════════════════════════

async function addAuthLog(userId, action, ip = null, success = true) {
  try {
    const key = `auth_logs:${userId}`;
    const result = await redis.lpush(key, { action, success, ip, timestamp: new Date(), userId }, 50);
    // Set TTL on auth logs — prevents unbounded growth
    if (redis.isReady()) {
      await redis.getClient().sendCommand(['EXPIRE', key, String(TTL.AUTH_LOG)]);
    }
    return result;
  } catch { return false; }
}

async function getAuthLogs(userId, limit = 10) {
  return redis.lrange(`auth_logs:${userId}`, 0, limit - 1);
}

// ════════════════════════════════════════════════════════════════
// GAMES CACHE (MongoDB + Redis, 6-hour TTL)
// ════════════════════════════════════════════════════════════════

async function getCachedGames() {
  try {
    const cached = await redis.get('games:all');
    if (cached) return cached;
    return null; // caller must fetch from DB and call cacheGames()
  } catch { return null; }
}

async function cacheGames(games) {
  return redis.set('games:all', games, TTL.GAMES);
}

async function getCachedGameBySlug(slug) {
  try {
    const cached = await redis.get(`game:slug:${slug}`);
    if (cached) return cached;
    return null;
  } catch { return null; }
}

async function cacheGameBySlug(slug, game) {
  return redis.set(`game:slug:${slug}`, game, TTL.GAMES);
}

async function invalidateGamesCache() {
  try {
    // Clear all game keys
    const keys = await scanKeys('game*');
    if (keys.length > 0 && redis.isReady()) {
      await redis.getClient().sendCommand(['DEL', ...keys]);
    }
    await redis.del('games:all');
    return true;
  } catch { return false; }
}

// ════════════════════════════════════════════════════════════════
// ADMIN STATS CACHE (Aggregation, 3-min TTL)
// ════════════════════════════════════════════════════════════════

async function getCachedAdminStats() {
  return redis.get('admin:stats');
}

async function cacheAdminStats(stats) {
  return redis.set('admin:stats', stats, TTL.ADMIN_STATS);
}

async function invalidateAdminStats() {
  return redis.del('admin:stats');
}

// ════════════════════════════════════════════════════════════════
// API RESPONSE CACHE (with SCAN-based invalidation)
// ════════════════════════════════════════════════════════════════

async function invalidateApiCache(pattern = 'api_cache:*') {
  try {
    const keys = await scanKeys(pattern);
    if (keys.length > 0 && redis.isReady()) {
      await redis.getClient().sendCommand(['DEL', ...keys]);
      logger.info(`[Cache] Cleared ${keys.length} API cache entries`);
    }
    return { success: true, count: keys.length };
  } catch (error) {
    logger.error(`[Cache] invalidateApiCache error: ${error.message}`);
    return { success: false, count: 0 };
  }
}

// ════════════════════════════════════════════════════════════════
// CACHE VALIDATION & STATS
// ════════════════════════════════════════════════════════════════

async function validateCacheConsistency(userId) {
  try {
    const cached = await redis.get(`user:${userId}`);
    const dbUser = await User.findById(userId).lean();

    if (!dbUser) {
      if (cached) {
        await invalidateUser(userId);
        return { consistent: true, action: 'deleted_stale' };
      }
      return { consistent: true };
    }

    if (!cached) {
      await cacheUser(dbUser);
      return { consistent: false, action: 'rebuilt' };
    }

    // Check balance consistency
    const cacheBalance = cached?.wallet?.balance || 0;
    const dbBalance = dbUser?.wallet?.balance || 0;

    if (cacheBalance !== dbBalance) {
      await cacheUser(dbUser);
      logger.warn(`[Cache] Inconsistency fixed: user ${userId} cache=${cacheBalance}, db=${dbBalance}`);
      return { consistent: false, action: 'fixed', difference: dbBalance - cacheBalance };
    }

    return { consistent: true };
  } catch (error) {
    return { consistent: false, error: error.message };
  }
}

async function bulkSyncUsers(userIds) {
  try {
    const users = await User.find({ _id: { $in: userIds } })
      .select('-passwordHash -verificationCode -resetPasswordToken -refreshTokens -authLogs -__v')
      .lean();

    const results = await Promise.allSettled(users.map(u => cacheUser(u)));
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    return { succeeded, failed: results.length - succeeded, total: userIds.length };
  } catch (error) {
    logger.error(`[Cache] bulkSyncUsers error: ${error.message}`);
    throw error;
  }
}

async function getCacheStats() {
  try {
    if (!redis.isReady()) return { available: false };
    const client = redis.getClient();

    // Use SCAN instead of KEYS
    const userKeys = await scanKeys('user:*');
    const sessionKeys = await scanKeys('session:*');
    const apiKeys = await scanKeys('api_cache:*');
    const gameKeys = await scanKeys('game*');

    const memory = await client.info('memory');
    const memMatch = memory.match(/used_memory_human:(\S+)/);

    return {
      available: true,
      userKeys: userKeys.length,
      sessionKeys: sessionKeys.length,
      apiCacheKeys: apiKeys.length,
      gameKeys: gameKeys.length,
      memoryUsed: memMatch ? memMatch[1] : 'unknown',
      timestamp: new Date(),
    };
  } catch (error) {
    return { available: false, error: error.message };
  }
}

// ════════════════════════════════════════════════════════════════
// CLEANUP (SCAN-based, replaces enhancedCacheService.cleanupInactiveUsers)
// ════════════════════════════════════════════════════════════════

async function cleanupInactiveEntries() {
  try {
    if (!redis.isReady()) return { cleaned: 0, skipped: true };

    // Clean up expired API caches (SCAN-based)
    const apiKeys = await scanKeys('api_cache:*');
    let cleaned = 0;

    // Redis handles TTL-based expiry automatically, but we can force-clean
    // stale entries if they somehow linger
    for (const key of apiKeys) {
      const ttlResult = await redis.getClient().sendCommand(['TTL', key]);
      const ttl = parseInt(ttlResult, 10);
      if (ttl === -1) { // No TTL set — orphaned key
        await redis.del(key);
        cleaned++;
      }
    }

    logger.info(`[Cache] Cleanup complete: ${cleaned} orphaned keys removed`);
    return { cleaned, skipped: false };
  } catch (error) {
    logger.error(`[Cache] Cleanup error: ${error.message}`);
    return { cleaned: 0, error: error.message };
  }
}

// ════════════════════════════════════════════════════════════════
// EXPORT
// ════════════════════════════════════════════════════════════════

const cacheService = {
  // TTL constants (for external reference)
  TTL,

  // User
  getUser,
  cacheUser,
  invalidateUser,
  updateUserWithSync,
  updateBalanceWithSync,
  deleteUser,
  clearUserCache,

  // Session
  cacheSession,
  getSession,
  removeSession,

  // Temp codes
  cacheTempCode,
  getTempCode,
  removeTempCode,

  // Password reset
  cachePasswordResetToken,
  getPasswordResetToken,
  removePasswordResetToken,
  checkPasswordResetRateLimit,

  // Rate limiting
  checkRateLimit,

  // Auth logs
  addAuthLog,
  getAuthLogs,

  // Games
  getCachedGames,
  cacheGames,
  getCachedGameBySlug,
  cacheGameBySlug,
  invalidateGamesCache,

  // Admin stats
  getCachedAdminStats,
  cacheAdminStats,
  invalidateAdminStats,

  // API response cache
  invalidateApiCache,

  // Validation & management
  validateCacheConsistency,
  bulkSyncUsers,
  getCacheStats,
  cleanupInactiveEntries,

  // Utility
  scanKeys,
};

export default cacheService;
