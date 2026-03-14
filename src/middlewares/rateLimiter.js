/**
 * Production-Grade Rate Limiting System
 * ======================================
 * Architecture follows the same pattern used by GitHub, Stripe, Discord:
 *
 *   1. Global limiter (high ceiling) — catches DDoS / automated abuse
 *      - Development: Very high limit (50k/15min) for hot-reload
 *      - Production: Moderate limit (10k/15min) for protection
 *   2. Strict per-action limiters ONLY on sensitive write operations:
 *      login, register, password reset, financial transactions, uploads
 *   3. NO per-route limiter on regular GET/read endpoints — the global
 *      limiter is sufficient to prevent abuse without blocking normal
 *      SPA navigation (a single page load fires 5-8 parallel API calls)
 *   4. Whitelist for health checks, static assets, and public endpoints
 *
 * Technical details:
 * - Redis-backed sliding window counters (with memory fallback)
 * - IP + UserID hybrid keying
 * - Anti-brute-force progressive penalties on auth endpoints
 * - Bot detection heuristics
 * - Standard RateLimit headers (draft-ietf-httpapi-ratelimit-headers)
 * - Environment-aware limits (relaxed in development, strict in production)
 */

import redisService from '../config/redis.js';

// ─── CONFIGURATION ──────────────────────────────────────────────────────────

/**
 * Rate limit policies per category.
 * windowMs  = sliding window in milliseconds
 * max       = max requests per window
 * message   = error message on 429
 */
/**
 * Limits designed for SPA usage patterns:
 *   - Global limiter is VERY generous in development, moderate in production
 *   - Write/sensitive endpoints get their own strict limiters
 *   - A single page load fires 5-8 parallel API calls — all counted under global only
 *   - This prevents the "stacking" problem where multiple per-route limiters
 *     each consume separate counters and combine to block normal browsing
 */
const isDevelopment = process.env.NODE_ENV !== 'production';

const POLICIES = {
  // ── Global catch-all (all /api routes) ──
  // Development: Very high limit to allow hot-reload and dev tools
  // Production: Moderate limit to prevent DDoS while allowing normal usage
  global: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 50000 : 10000, // 50k in dev, 10k in prod
    message: 'Too many requests from this IP, please try again later.'
  },

  // ── Auth – strict (actual credential attempts only) ──
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 100 : 20,
    message: 'Too many login attempts. Please try again in 15 minutes.'
  },
  refresh: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 500 : 200,
    message: 'Too many token refresh requests. Please try again later.'
  },
  register: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: isDevelopment ? 50 : 10,
    message: 'Too many registration attempts. Please try again later.'
  },
  verifyEmail: {
    windowMs: 15 * 60 * 1000,
    max: isDevelopment ? 100 : 30,
    message: 'Too many verification attempts. Please try again later.'
  },
  resendCode: {
    windowMs: 60 * 1000,
    max: isDevelopment ? 20 : 5,
    message: 'Too many verification code requests. Please wait 1 minute.'
  },
  passwordReset: {
    windowMs: 15 * 60 * 1000,
    max: isDevelopment ? 120 : 20,
    message: 'Too many password reset attempts. Please try again later.'
  },

  // ── Write operations ──
  userWrite: {
    windowMs: 1 * 60 * 1000,
    max: isDevelopment ? 300 : 100,
    message: 'Too many write requests. Please slow down.'
  },

  // ── Financial operations (keep strict) ──
  deposit: {
    windowMs: 15 * 60 * 1000,
    max: isDevelopment ? 50 : 15,
    message: 'Too many deposit requests. Please wait 15 minutes.'
  },
  withdrawal: {
    windowMs: 15 * 60 * 1000,
    max: isDevelopment ? 50 : 15,
    message: 'Too many withdrawal requests. Please wait 15 minutes.'
  },

  // ── File uploads ──
  upload: {
    windowMs: 60 * 60 * 1000,
    max: isDevelopment ? 200 : 50,
    message: 'Too many file uploads. Please wait before uploading more.'
  },

  // ── Chat messages (write action) ──
  chatMessage: {
    windowMs: 1 * 60 * 1000,
    max: isDevelopment ? 300 : 100,
    message: 'Sending messages too fast. Please slow down.'
  },

  // ── Admin ──
  admin: {
    windowMs: 5 * 60 * 1000,
    max: isDevelopment ? 5000 : 1000,
    message: 'Too many admin requests. Please wait a few minutes.'
  },
  adminHeavy: {
    windowMs: 5 * 60 * 1000,
    max: isDevelopment ? 500 : 100,
    message: 'Too many heavy admin operations. Please wait a few minutes.'
  },

  // ── Listing creation / mutation ──
  listingWrite: {
    windowMs: 15 * 60 * 1000,
    max: isDevelopment ? 200 : 50,
    message: 'Too many listing changes. Please slow down.'
  },

  // ── Seller / Promotion requests ──
  sellerRequest: {
    windowMs: 60 * 60 * 1000,
    max: isDevelopment ? 30 : 10,
    message: 'Too many seller requests. Please try again later.'
  },

  // ── Ad click (public, prevent abuse) ──
  adClick: {
    windowMs: 1 * 60 * 1000,
    max: isDevelopment ? 300 : 100,
    message: 'Too many ad interactions.'
  }
};

// ─── IN-MEMORY FALLBACK STORE ───────────────────────────────────────────────

class MemoryStore {
  constructor() {
    this.hits = new Map();         // key → { count, resetAt }
    this.blocked = new Map();      // key → unblockAt
    this.maxSize = 100000;         // Cap to prevent OOM under distributed attacks
    // Cleanup expired entries every 60 seconds
    this._cleanupInterval = setInterval(() => this._cleanup(), 60_000);
    if (this._cleanupInterval.unref) this._cleanupInterval.unref();
  }

  _cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.hits) {
      if (entry.resetAt <= now) this.hits.delete(key);
    }
    for (const [key, unblockAt] of this.blocked) {
      if (unblockAt <= now) this.blocked.delete(key);
    }
  }

  /**
   * Increment counter for key within a window.
   * @returns {{ count: number, resetAt: number }}
   */
  increment(key, windowMs) {
    const now = Date.now();
    const entry = this.hits.get(key);

    if (!entry || entry.resetAt <= now) {
      // Evict oldest entries if at capacity
      if (this.hits.size >= this.maxSize) {
        const firstKey = this.hits.keys().next().value;
        this.hits.delete(firstKey);
      }
      const newEntry = { count: 1, resetAt: now + windowMs };
      this.hits.set(key, newEntry);
      return newEntry;
    }

    entry.count++;
    return entry;
  }

  /**
   * Block a key for `durationMs`.
   */
  block(key, durationMs) {
    this.blocked.set(key, Date.now() + durationMs);
  }

  /**
   * Check if key is blocked.
   * @returns {number} remaining ms if blocked, 0 otherwise
   */
  isBlocked(key) {
    const unblockAt = this.blocked.get(key);
    if (!unblockAt) return 0;
    const remaining = unblockAt - Date.now();
    if (remaining <= 0) {
      this.blocked.delete(key);
      return 0;
    }
    return remaining;
  }
}

const memoryStore = new MemoryStore();

// ─── REDIS SLIDING WINDOW ──────────────────────────────────────────────────

/**
 * Sliding-window counter using Redis INCR + EXPIRE (pipelined).
 * Falls back to in-memory store when Redis is unavailable.
 *
 * @returns {{ count: number, resetAt: number, remaining: number }}
 */
async function slidingWindowCheck(key, windowMs, max) {
  const windowSec = Math.ceil(windowMs / 1000);

  // Try Redis first
  if (redisService.isReady()) {
    try {
      const client = redisService.getClient();
      // Pipeline: 1 round-trip instead of 3 sequential calls
      const results = await client.multi()
        .incr(key)
        .expire(key, windowSec)  // reset TTL on each hit
        .ttl(key)
        .exec();

      const count = results[0]; // INCR result
      const ttl = results[2];   // TTL result
      const resetAt = Date.now() + (ttl > 0 ? ttl * 1000 : windowMs);

      return {
        count,
        resetAt,
        remaining: Math.max(0, max - count)
      };
    } catch {
      // Redis failed mid-request – fall through to memory
    }
  }

  // Memory fallback
  const entry = memoryStore.increment(key, windowMs);
  return {
    count: entry.count,
    resetAt: entry.resetAt,
    remaining: Math.max(0, max - entry.count)
  };
}

// ─── BLOCK / BAN CHECK (REDIS + MEMORY) ────────────────────────────────────

async function isKeyBlocked(blockKey) {
  // Redis
  if (redisService.isReady()) {
    try {
      const client = redisService.getClient();
      const ttl = await client.ttl(blockKey);
      if (ttl > 0) return ttl * 1000;
    } catch {
      // fallback below
    }
  }
  // Memory
  return memoryStore.isBlocked(blockKey);
}

async function blockKey(blockKeyStr, durationMs) {
  const durationSec = Math.ceil(durationMs / 1000);
  // Redis
  if (redisService.isReady()) {
    try {
      const client = redisService.getClient();
      await client.set(blockKeyStr, '1', { EX: durationSec });
    } catch {
      // fallback below
    }
  }
  // Always also set in memory (secondary guard)
  memoryStore.block(blockKeyStr, durationMs);
}

// ─── KEY GENERATION ─────────────────────────────────────────────────────────

/**
 * Generate a composite key: IP + optional UserID.
 * For auth routes (login/register), use IP only.
 */
function generateKey(req, policyName, useUserKey = true) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const userId = useUserKey && req.user?._id ? `:uid:${req.user._id}` : '';
  return `rl:${policyName}:${ip}${userId}`;
}

// ─── BOT DETECTION HEURISTICS ───────────────────────────────────────────────

const BOT_PATTERNS = [
  /curl\//i, /wget\//i, /python-requests/i, /httpie\//i,
  /go-http-client/i, /java\//i, /okhttp/i,
  /scrapy/i, /phantomjs/i, /headlesschrome/i
];

/**
 * Lightweight bot detection — only flag clear automated clients.
 * Avoids false positives on legitimate browser variations, SSR, or
 * mobile apps that may lack some headers.
 */
function isLikelyBot(req) {
  const ua = req.headers['user-agent'] || '';

  // Completely empty user-agent → suspicious
  if (!ua) return true;

  // Known CLI / scraping tool signatures
  for (const pattern of BOT_PATTERNS) {
    if (pattern.test(ua)) return true;
  }

  return false;
}

// ─── PROGRESSIVE PENALTY (ANTI-BRUTE-FORCE) ─────────────────────────────────

/**
 * Brute-force protection for auth-related endpoints.
 * After exceeding the rate limit:
 *   - 1st breach  → block 5 min
 *   - 2nd breach  → block 15 min
 *   - 3rd+ breach → block 60 min
 */
const PENALTY_TIERS = [
  5 * 60 * 1000,       // 5 min
  15 * 60 * 1000,      // 15 min
  60 * 60 * 1000       // 60 min
];

async function applyProgressivePenalty(ip, policyName) {
  const breachCountKey = `rl:breach:${policyName}:${ip}`;
  let breachCount = 0;

  if (redisService.isReady()) {
    try {
      const client = redisService.getClient();
      breachCount = await client.incr(breachCountKey);
      if (breachCount === 1) {
        // Expire breach counter after 24 hours
        await client.expire(breachCountKey, 86400);
      }
    } catch {
      breachCount = 1;
    }
  } else {
    // Memory: just use tier 0
    breachCount = 1;
  }

  const tierIndex = Math.min(breachCount - 1, PENALTY_TIERS.length - 1);
  const blockDuration = PENALTY_TIERS[tierIndex];
  const blockKeyStr = `rl:block:${policyName}:${ip}`;

  await blockKey(blockKeyStr, blockDuration);

  return blockDuration;
}

// ─── STANDARD RATE-LIMIT HEADERS ────────────────────────────────────────────

function setRateLimitHeaders(res, max, remaining, resetAt) {
  res.setHeader('RateLimit-Limit', max);
  res.setHeader('RateLimit-Remaining', Math.max(0, remaining));
  res.setHeader('RateLimit-Reset', Math.ceil(resetAt / 1000));
  // Also set draft-7 combined header
  res.setHeader('RateLimit-Policy', `${max};w=${Math.ceil((resetAt - Date.now()) / 1000)}`);
}

// ─── CORE FACTORY: createRateLimiter ──────────────────────────────────────

/**
 * Create a rate-limiting middleware for the given policy.
 *
 * @param {string} policyName  – key in POLICIES object
 * @param {object} [overrides] – optional overrides for windowMs / max / message
 * @param {object} [options]
 * @param {boolean} [options.useUserKey=true]   – include userId in key
 * @param {boolean} [options.progressive=false] – enable progressive penalty
 * @param {boolean} [options.botPenalty=false]   – halve limits for detected bots
 * @param {boolean} [options.skipSuccessful=false] – don't count 2xx responses
 */
export function createRateLimiter(policyName, overrides = {}, options = {}) {
  const policy = { ...POLICIES[policyName], ...overrides };
  const {
    useUserKey = true,
    progressive = false,
    botPenalty = false,
    skipSuccessful = false,
    skip = null
  } = options;

  if (!policy || !policy.windowMs || !policy.max) {
    throw new Error(`[RateLimiter] Unknown or invalid policy: "${policyName}"`);
  }

  return async (req, res, next) => {
    try {
      // Skip rate limiting if skip function returns true
      if (skip && typeof skip === 'function' && skip(req)) {
        return next();
      }

      const ip = req.ip || req.socket?.remoteAddress || 'unknown';

      // ── Skip non-API / static resources ──
      if (policyName === 'global') {
        // Only rate-limit /api routes; skip Next.js pages, assets, etc.
        if (!req.path.startsWith('/api')) return next();
        if (req.path.includes('/socket.io/')) return next();
        if (req.path === '/health') return next();
        // Additional whitelisted paths for development
        if (req.path.startsWith('/_next/')) return next();
        if (req.path.startsWith('/uploads/')) return next();
        if (req.path === '/favicon.ico') return next();
      }

      // ── Check if IP is blocked (progressive penalty) ──
      if (progressive) {
        const blockKeyStr = `rl:block:${policyName}:${ip}`;
        const blockedMs = await isKeyBlocked(blockKeyStr);
        if (blockedMs > 0) {
          const retryAfter = Math.ceil(blockedMs / 1000);
          res.setHeader('Retry-After', retryAfter);
          return res.status(429).json({
            success: false,
            message: `You are temporarily blocked due to repeated violations. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
            retryAfter
          });
        }
      }

      // ── Determine effective limits ──
      let effectiveMax = policy.max;
      if (botPenalty && isLikelyBot(req)) {
        effectiveMax = Math.max(1, Math.floor(effectiveMax / 2));
      }

      // ── Sliding window check ──
      const key = generateKey(req, policyName, useUserKey);
      const { count, resetAt, remaining } = await slidingWindowCheck(
        key,
        policy.windowMs,
        effectiveMax
      );

      // ── Set standard headers on every response ──
      setRateLimitHeaders(res, effectiveMax, remaining, resetAt);

      // ── Skip counting on successful responses (optional) ──
      if (skipSuccessful) {
        const originalEnd = res.end;
        res.end = function (...args) {
          // If status is 2xx, decrement the counter (best effort)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const decrKey = key;
            if (redisService.isReady()) {
              redisService.getClient().decr(decrKey).catch(() => { });
            }
          }
          originalEnd.apply(res, args);
        };
      }

      // ── Check if limit exceeded ──
      if (count > effectiveMax) {
        const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfter);

        // Apply progressive penalty if enabled
        if (progressive) {
          const blockDuration = await applyProgressivePenalty(ip, policyName);
          return res.status(429).json({
            success: false,
            message: policy.message,
            retryAfter: Math.ceil(blockDuration / 1000),
            blocked: true
          });
        }

        return res.status(429).json({
          success: false,
          message: policy.message,
          retryAfter
        });
      }

      next();
    } catch (err) {
      // Rate limiter should never break the request pipeline
      console.error('[RateLimiter] Error:', err.message);
      next();
    }
  };
}

// ─── PRE-BUILT MIDDLEWARE EXPORTS ───────────────────────────────────────────
// Architecture: Global limiter protects ALL routes. Additional limiters only
// on sensitive write/mutation endpoints.

// Global (applied in server.js — the ONLY limiter for read endpoints)
// Whitelist: paths that should NOT be rate limited
const WHITELIST_PATHS = [
  '/api/health',
  '/api/ping',
  '/.well-known',
  '/uploads',
  '/assets',
  '/_next/static',
  '/_next/image',
  '/favicon.ico'
];

export const globalLimiter = createRateLimiter('global', {}, {
  useUserKey: false,
  botPenalty: !isDevelopment, // Only apply bot penalty in production
  skip: (req) => {
    // Skip rate limiting for whitelisted paths
    const path = req.path || req.url;
    return WHITELIST_PATHS.some(whitelist => path.startsWith(whitelist));
  }
});

// ── Auth routes (progressive penalty, IP-only) ──
export const loginLimiter = createRateLimiter('login', {}, {
  useUserKey: false,
  progressive: true,
  botPenalty: true
});

export const refreshLimiter = createRateLimiter('refresh', {}, {
  useUserKey: false
});

export const registerLimiter = createRateLimiter('register', {}, {
  useUserKey: false,
  progressive: true,
  botPenalty: true
});

export const verifyEmailLimiter = createRateLimiter('verifyEmail', {}, {
  useUserKey: false,
  progressive: true
});

export const resendLimiter = createRateLimiter('resendCode', {}, {
  useUserKey: false
});

export const passwordResetLimiter = createRateLimiter('passwordReset', {}, {
  useUserKey: false,
  progressive: false,
  botPenalty: false
});

// ── Write operations ──
export const userWriteLimiter = createRateLimiter('userWrite');

// ── Financial ──
export const depositLimiter = createRateLimiter('deposit', {}, {
  progressive: true
});
export const withdrawalLimiter = createRateLimiter('withdrawal', {}, {
  progressive: true
});

// ── Upload ──
export const uploadLimiter = createRateLimiter('upload');

// ── Chat messages ──
export const chatMessageLimiter = createRateLimiter('chatMessage');

// ── Admin ──
export const adminLimiter = createRateLimiter('admin');
export const adminHeavyLimiter = createRateLimiter('adminHeavy');

// ── Listings ──
export const listingWriteLimiter = createRateLimiter('listingWrite');

// ── Seller / Promotion ──
export const sellerRequestLimiter = createRateLimiter('sellerRequest');

// ── Ads ──
export const adClickLimiter = createRateLimiter('adClick', {}, {
  useUserKey: false,
  botPenalty: true
});

// ─── UTILITY: Combine multiple limiters ─────────────────────────────────────

/**
 * Apply multiple rate limiters in sequence.
 * Usage: router.post('/upload', combineLimiters(uploadLimiter, userWriteLimiter), handler)
 */
export function combineLimiters(...limiters) {
  return async (req, res, next) => {
    let i = 0;
    const runNext = async (err) => {
      if (err) return next(err);
      if (res.headersSent) return; // A limiter already sent 429
      if (i >= limiters.length) return next();
      const limiter = limiters[i++];
      try {
        await limiter(req, res, runNext);
      } catch (e) {
        next(e);
      }
    };
    await runNext();
  };
}

// ─── EXPORT POLICIES for external reference/testing ─────────────────────────
export { POLICIES };
