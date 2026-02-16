/**
 * Cache Middleware for User Routes
 * 
 * Automatically handles:
 * - Read-through caching on GET requests
 * - Cache invalidation on PUT/PATCH/DELETE requests
 * - Activity tracking for LRU
 */

import cacheService from '../services/cacheService.js';
import logger from '../utils/logger.js';

/**
 * Middleware to get user from cache (Read-Through)
 * Use before controller that needs user data
 */
export const cacheUser = async (req, res, next) => {
    try {
        const userId = req.params.userId || req.params.id || req.user?._id;

        if (!userId) {
            return next(); // No user ID, skip caching
        }

        // Try to get from cache
        const cachedUser = await cacheService.getUser(userId);

        if (cachedUser) {
            // Attach to request for controller to use
            req.cachedUser = cachedUser;
            logger.info(`🎯 Middleware: User ${userId} served from cache`);
        }

        next();
    } catch (error) {
        logger.error('❌ Cache middleware error:', error.message);
        // Don't block the request on cache error
        next();
    }
};

/**
 * Middleware to invalidate cache after updates
 * Use after controller that modifies user data
 */
export const invalidateUserCache = async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = async function (data) {
        try {
            // Only invalidate on successful responses (2xx)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const userId = req.params.userId || req.params.id || req.user?._id;

                if (userId) {
                    await cacheService.invalidateUser(userId);
                    logger.info(`🗑️ Middleware: Cache invalidated for user ${userId}`);
                }
            }
        } catch (error) {
            logger.error('❌ Cache invalidation middleware error:', error.message);
            // Don't block response on cache error
        }

        // Call original json() with the data
        return originalJson(data);
    };

    next();
};

/**
 * Middleware to update cache after writes (Write-Through)
 * Use after controller that creates/updates user
 */
export const updateCacheAfterWrite = (userDataGetter) => {
    return async (req, res, next) => {
        const originalJson = res.json.bind(res);

        res.json = async function (data) {
            try {
                // Only update cache on successful responses (2xx)
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    const userId = req.params.userId || req.params.id || req.user?._id;

                    if (userId) {
                        // Get updated user data
                        const userData = typeof userDataGetter === 'function'
                            ? userDataGetter(data, req)
                            : data.user || data.data || data;

                        if (userData) {
                            const userWithId = userData._id ? userData : { ...userData, _id: userId };
                            await cacheService.cacheUser(userWithId);
                            logger.info(`💾 Middleware: Cache updated for user ${userId} after write`);
                        }
                    }
                }
            } catch (error) {
                logger.error('❌ Cache update middleware error:', error.message);
                // Don't block response on cache error
            }

            return originalJson(data);
        };

        next();
    };
};

/**
 * Middleware to track user activity
 * Use on any authenticated route
 */
export const trackActivity = async (req, res, next) => {
    // Activity tracking is now handled by Redis TTL-based expiry
    // No need to manually track last-accessed timestamps
    next();
};

export default {
    cacheUser,
    invalidateUserCache,
    updateCacheAfterWrite,
    trackActivity
};
