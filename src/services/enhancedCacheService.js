/**
 * Enhanced Cache Service with Write-Through Pattern
 * 
 * System Design Principles:
 * 1. Write-Through: All writes go to DB first, then cache
 * 2. Read-Through: Read from cache, fallback to DB, then populate cache
 * 3. LRU Eviction: Redis auto-evicts least recently used entries
 * 4. Activity Tracking: Track last access time for manual cleanup
 * 
 * Cache Structure:
 * - user:{userId} -> User data with lastAccessed timestamp
 * - user:{userId}:activity -> Last activity timestamp
 * - cache:stats -> Cache statistics
 */

import redisService from '../config/redis.js';
import User from '../modules/users/user.model.js';
import logger from '../utils/logger.js';

class EnhancedCacheService {
    constructor() {
        this.DEFAULT_TTL = 3600; // 1 hour
        this.INACTIVE_THRESHOLD = 30 * 24 * 60 * 60; // 30 days in seconds
        this.MAX_CACHE_SIZE_MB = 512; // 512MB max cache size
    }

    /**
     * ==========================================
     * WRITE-THROUGH OPERATIONS
     * ==========================================
     * All writes go to DB first, then cache
     */

    /**
     * Update user in DB and cache (Write-Through)
     */
    async updateUser(userId, updateData) {
        try {
            // 1. Write to Database FIRST
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                { $set: updateData },
                { new: true, runValidators: true }
            ).select('-passwordHash -verificationCode -resetPasswordToken -refreshTokens').lean();

            if (!updatedUser) {
                throw new Error('User not found');
            }

            // 2. Update Cache AFTER successful DB write
            await this._updateCacheUser(userId, updatedUser);

            logger.info(`✅ Write-Through: User ${userId} updated in DB and Cache`);
            return updatedUser;
        } catch (error) {
            logger.error(`❌ Write-Through failed for user ${userId}:`, error.message);
            // Cache update failed, but DB write succeeded - acceptable
            throw error;
        }
    }

    /**
     * Create user in DB and cache (Write-Through)
     */
    async createUserCache(userId, userData) {
        try {
            // User already created in DB via auth flow
            // Just populate cache
            await this._updateCacheUser(userId, userData);
            logger.info(`✅ User ${userId} cached after creation`);
            return true;
        } catch (error) {
            logger.error(`❌ Failed to cache new user ${userId}:`, error.message);
            return false;
        }
    }

    /**
     * Delete user from DB and cache
     */
    async deleteUser(userId) {
        try {
            // 1. Delete from Database FIRST
            await User.findByIdAndDelete(userId);

            // 2. Remove from Cache
            await this._removeCacheUser(userId);

            logger.info(`✅ User ${userId} deleted from DB and Cache`);
            return true;
        } catch (error) {
            logger.error(`❌ Delete failed for user ${userId}:`, error.message);
            throw error;
        }
    }

    /**
     * ==========================================
     * READ-THROUGH OPERATIONS
     * ==========================================
     * Read from cache first, fallback to DB
     */

    /**
     * Get user with Read-Through pattern
     */
    async getUser(userId) {
        try {
            // 1. Try Cache FIRST
            const cached = await this._getCacheUser(userId);
            if (cached) {
                // Update last accessed time
                await this._updateLastAccessed(userId);
                logger.info(`🎯 Cache HIT: User ${userId}`);
                return cached;
            }

            // 2. Cache MISS - Get from Database
            logger.info(`📊 Cache MISS: User ${userId} - Fetching from DB`);
            const user = await User.findById(userId)
                .select('-passwordHash -verificationCode -resetPasswordToken -refreshTokens')
                .lean();

            if (!user) {
                return null;
            }

            // 3. Populate Cache for next time
            await this._updateCacheUser(userId, user);

            return user;
        } catch (error) {
            logger.error(`❌ Read-Through failed for user ${userId}:`, error.message);
            // Return null on error, don't throw
            return null;
        }
    }

    /**
     * Get multiple users efficiently
     */
    async getUsers(userIds) {
        try {
            const results = await Promise.all(
                userIds.map(id => this.getUser(id))
            );
            return results.filter(user => user !== null);
        } catch (error) {
            logger.error('❌ Batch getUsers failed:', error.message);
            return [];
        }
    }

    /**
     * ==========================================
     * CACHE INVALIDATION
     * ==========================================
     */

    /**
     * Invalidate user cache (force refresh on next read)
     */
    async invalidateUser(userId) {
        try {
            await this._removeCacheUser(userId);
            logger.info(`🗑️ Cache invalidated for user ${userId}`);
            return true;
        } catch (error) {
            logger.error(`❌ Cache invalidation failed for user ${userId}:`, error.message);
            return false;
        }
    }

    /**
     * Invalidate multiple users
     */
    async invalidateUsers(userIds) {
        try {
            await Promise.all(userIds.map(id => this.invalidateUser(id)));
            return true;
        } catch (error) {
            logger.error('❌ Batch invalidation failed:', error.message);
            return false;
        }
    }

    /**
     * ==========================================
     * LRU CLEANUP (Evict Inactive Users)
     * ==========================================
     */

    /**
     * Clean up inactive users from cache (not DB!)
     * Users who haven't accessed the site in 30+ days
     */
    async cleanupInactiveUsers() {
        try {
            if (!redisService.isReady()) {
                logger.warn('⚠️ Redis not ready for cleanup');
                return { cleaned: 0, skipped: true };
            }

            const client = redisService.getClient();
            const now = Date.now();
            const cutoffTime = now - (this.INACTIVE_THRESHOLD * 1000);

            // Get all user keys
            const keys = await client.keys('user:*:activity');
            let cleanedCount = 0;

            for (const key of keys) {
                try {
                    const lastAccessed = await client.get(key);
                    if (lastAccessed && parseInt(lastAccessed) < cutoffTime) {
                        // User inactive for 30+ days - remove from cache ONLY
                        const userId = key.replace('user:', '').replace(':activity', '');
                        await this._removeCacheUser(userId);
                        cleanedCount++;
                        logger.info(`🧹 Cleaned inactive user ${userId} from cache`);
                    }
                } catch (err) {
                    // Continue on individual key error
                    logger.warn(`⚠️ Error processing key ${key}:`, err.message);
                }
            }

            logger.info(`✅ Cleanup complete: ${cleanedCount} inactive users removed from cache`);
            return { cleaned: cleanedCount, skipped: false };
        } catch (error) {
            logger.error('❌ Cleanup failed:', error.message);
            return { cleaned: 0, error: error.message };
        }
    }

    /**
     * Get cache statistics
     */
    async getCacheStats() {
        try {
            if (!redisService.isReady()) {
                return { available: false };
            }

            const client = redisService.getClient();
            const info = await client.info('stats');
            const memory = await client.info('memory');

            // Count user keys
            const userKeys = await client.keys('user:*');
            const activityKeys = await client.keys('user:*:activity');

            // Parse memory usage
            const memoryMatch = memory.match(/used_memory_human:(\S+)/);
            const memoryUsed = memoryMatch ? memoryMatch[1] : 'unknown';

            return {
                available: true,
                cachedUsers: userKeys.length / 2, // Each user has 2 keys (data + activity)
                totalKeys: userKeys.length + activityKeys.length,
                memoryUsed,
                threshold: `${this.INACTIVE_THRESHOLD / 86400} days`,
            };
        } catch (error) {
            logger.error('❌ Failed to get cache stats:', error.message);
            return { available: false, error: error.message };
        }
    }

    /**
     * Force evict user from cache (admin operation)
     */
    async forceEvictUser(userId) {
        try {
            await this._removeCacheUser(userId);
            logger.info(`🔨 Force evicted user ${userId} from cache`);
            return true;
        } catch (error) {
            logger.error(`❌ Force eviction failed for user ${userId}:`, error.message);
            return false;
        }
    }

    /**
     * ==========================================
     * PRIVATE HELPER METHODS
     * ==========================================
     */

    /**
     * Internal: Update user in cache
     */
    async _updateCacheUser(userId, userData) {
        if (!redisService.isReady()) {
            return false;
        }

        try {
            const client = redisService.getClient();
            const userKey = `user:${userId}`;
            const activityKey = `user:${userId}:activity`;

            // Store user data
            await client.setEx(userKey, this.DEFAULT_TTL, JSON.stringify({
                ...userData,
                cachedAt: Date.now()
            }));

            // Store last accessed timestamp
            await client.set(activityKey, Date.now().toString());
            await client.expire(activityKey, this.INACTIVE_THRESHOLD);

            logger.info(`💾 Cache updated: ${userKey}`);
            return true;
        } catch (error) {
            logger.error(`❌ Failed to update cache for user ${userId}:`, error.message);
            return false;
        }
    }

    /**
     * Internal: Get user from cache
     */
    async _getCacheUser(userId) {
        if (!redisService.isReady()) {
            return null;
        }

        try {
            const client = redisService.getClient();
            const userKey = `user:${userId}`;
            const data = await client.get(userKey);

            if (data) {
                return JSON.parse(data);
            }
            return null;
        } catch (error) {
            logger.error(`❌ Failed to get cache for user ${userId}:`, error.message);
            return null;
        }
    }

    /**
     * Internal: Remove user from cache
     */
    async _removeCacheUser(userId) {
        if (!redisService.isReady()) {
            return false;
        }

        try {
            const client = redisService.getClient();
            const userKey = `user:${userId}`;
            const activityKey = `user:${userId}:activity`;

            await client.del(userKey);
            await client.del(activityKey);

            logger.info(`🗑️ Cache deleted: ${userKey}`);
            return true;
        } catch (error) {
            logger.error(`❌ Failed to remove cache for user ${userId}:`, error.message);
            return false;
        }
    }

    /**
     * Internal: Update last accessed timestamp
     */
    async _updateLastAccessed(userId) {
        if (!redisService.isReady()) {
            return false;
        }

        try {
            const client = redisService.getClient();
            const activityKey = `user:${userId}:activity`;

            await client.set(activityKey, Date.now().toString());
            await client.expire(activityKey, this.INACTIVE_THRESHOLD);

            return true;
        } catch (error) {
            // Don't log this error - it's not critical
            return false;
        }
    }
}

// Export singleton instance
const enhancedCacheService = new EnhancedCacheService();
export default enhancedCacheService;
