/**
 * API Response Caching Middleware
 * Caches GET requests to improve performance
 */

import redis from '../config/redis.js';
import cacheService from '../services/cacheService.js';
import logger from '../utils/logger.js';

/**
 * Cache GET responses
 * @param {number} duration - Cache duration in seconds (default: 5 minutes)
 */
export const cacheResponse = (duration = 300) => {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Skip caching if Redis is not connected
        if (!redis.isReady()) {
            return next();
        }

        // User-scoped cache key to prevent data leakage between users
        const userId = req.user?._id || req.user?.id || 'anon';
        const cacheKey = `api_cache:${userId}:${req.originalUrl || req.url}`;

        try {
            // Try to get cached response
            const cachedData = await redis.get(cacheKey);

            if (cachedData) {
                return res.json(cachedData);
            }

            // Cache miss - intercept res.json to cache the response
            const originalJson = res.json.bind(res);

            res.json = function (data) {
                // Only cache successful responses (2xx)
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    redis.set(cacheKey, data, duration)
                        .catch(err => logger.error('Cache save error:', err.message));
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
 * Clear cache by pattern
 * @param {string} pattern - Redis key pattern (e.g., 'api_cache:*')
 */
export const clearCache = async (pattern = 'api_cache:*') => {
    try {
        if (!redis.isReady()) {
            return { success: false, message: 'Redis not connected' };
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
 * @param {string} pattern - Redis key pattern to clear
 */
export const invalidateCache = (pattern) => {
    return async (req, res, next) => {
        const originalJson = res.json.bind(res);

        res.json = async function (data) {
            // Only clear cache on successful modifications
            if (res.statusCode >= 200 && res.statusCode < 300) {
                await clearCache(pattern);
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
