/**
 * API Response Caching Middleware
 * Features:
 * - Redis-backed GET response caching
 * - ETag support for conditional requests (304 Not Modified)
 * - Cache-Control headers with stale-while-revalidate
 * - In-process LRU cache for ultra-hot paths (sub-ms response)
 */

import redis from '../config/redis.js';
import cacheService from '../services/cacheService.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

// ─── In-Process LRU Cache (avoids Redis round-trip for hot data) ───
const processCache = new Map();
const PROCESS_CACHE_MAX = 500;

function processGet(key) {
    const entry = processCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        processCache.delete(key);
        return null;
    }
    return entry;
}

function processSet(key, data, etag, durationSec) {
    processCache.set(key, {
        data,
        etag,
        expiresAt: Date.now() + durationSec * 1000,
    });
    // Evict oldest if too large
    if (processCache.size > PROCESS_CACHE_MAX) {
        const firstKey = processCache.keys().next().value;
        processCache.delete(firstKey);
    }
}

function generateETag(data) {
    const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
    return `"${hash.substring(0, 16)}"`;
}

/**
 * Cache GET responses with ETag + stale-while-revalidate
 * @param {number} duration - Cache duration in seconds (default: 5 minutes)
 */
export const cacheResponse = (duration = 300) => {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // User-scoped cache key to prevent data leakage between users
        const userId = req.user?._id || req.user?.id || 'anon';
        const cacheKey = `api_cache:${userId}:${req.originalUrl || req.url}`;

        // Set Cache-Control header (browsers + CDN can cache)
        res.setHeader('Cache-Control', `public, max-age=${Math.floor(duration / 2)}, stale-while-revalidate=${duration}`);

        try {
            // 1. Check in-process cache first (sub-millisecond)
            const processEntry = processGet(cacheKey);
            if (processEntry) {
                // ETag conditional check (304 Not Modified)
                const clientEtag = req.headers['if-none-match'];
                if (clientEtag && clientEtag === processEntry.etag) {
                    return res.status(304).end();
                }
                res.setHeader('ETag', processEntry.etag);
                res.setHeader('X-Cache', 'HIT-MEMORY');
                return res.json(processEntry.data);
            }

            // 2. Check Redis cache
            if (redis.isReady()) {
                const cachedData = await redis.get(cacheKey);
                if (cachedData) {
                    const etag = generateETag(cachedData);
                    // Save to process cache for next hit
                    processSet(cacheKey, cachedData, etag, Math.min(duration, 60));

                    const clientEtag = req.headers['if-none-match'];
                    if (clientEtag && clientEtag === etag) {
                        return res.status(304).end();
                    }
                    res.setHeader('ETag', etag);
                    res.setHeader('X-Cache', 'HIT-REDIS');
                    return res.json(cachedData);
                }
            }

            // 3. Cache miss — intercept res.json to cache the response
            res.setHeader('X-Cache', 'MISS');
            const originalJson = res.json.bind(res);

            res.json = function (data) {
                // Only cache successful responses (2xx)
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const etag = generateETag(data);
                    res.setHeader('ETag', etag);

                    // Store in both caches
                    processSet(cacheKey, data, etag, Math.min(duration, 60));
                    if (redis.isReady()) {
                        redis.set(cacheKey, data, duration)
                            .catch(err => logger.error('Cache save error:', err.message));
                    }
                }
                return originalJson(data);
            };

            next();
        } catch (error) {
            logger.error('Cache middleware error:', error.message);
            next();
        }
    };
};

/**
 * Clear cache by pattern (Redis + process cache)
 * @param {string} pattern - Redis key pattern (e.g., 'api_cache:*')
 */
export const clearCache = async (pattern = 'api_cache:*') => {
    try {
        // Clear process cache matching pattern
        const searchStr = pattern.replace(/\*/g, '');
        for (const key of processCache.keys()) {
            if (key.includes(searchStr) || searchStr === 'api_cache:') {
                processCache.delete(key);
            }
        }

        if (!redis.isReady()) {
            return { success: true, message: 'Process cache cleared (Redis not connected)' };
        }

        // Use SCAN-based invalidation (never KEYS in production)
        const result = await cacheService.invalidateApiCache(pattern);
        return result;
    } catch (error) {
        logger.error('Clear cache error:', error.message);
        return { success: false, message: error.message };
    }
};

/**
 * Middleware to clear cache after data modifications
 * @param {string|string[]} patterns - Redis key pattern(s) to clear
 *
 * NOTE: Cache keys are stored as  api_cache:{userId}:{url}
 *       So patterns MUST use a wildcard before the URL segment:
 *         ✅  'api_cache:*:/api/v1/listings*'
 *         ❌  'api_cache:/api/v1/listings/*'   ← userId is missing
 *
 * Fire-and-forget: never blocks or delays the HTTP response.
 */
export const invalidateCache = (...patterns) => {
    return (req, res, next) => {
        const originalJson = res.json.bind(res);

        res.json = function (data) {
            // Fire async invalidation without blocking the response
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const allPatterns = patterns.flat();
                Promise.allSettled(allPatterns.map(p => clearCache(p)))
                    .catch(err => logger.error('[Cache] invalidateCache error:', err.message));
            }

            return originalJson(data);
        };

        next();
    };
};

export default {
    cacheResponse,
    clearCache,
    invalidateCache
};
