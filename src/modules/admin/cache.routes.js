/**
 * Cache Admin Routes
 * 
 * Endpoints for monitoring and managing cache
 * (Admin only)
 */

import express from 'express';
import enhancedCacheService from '../../services/enhancedCacheService.js';
import cacheCleanupJob from '../../jobs/cacheCleanupJob.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import { requireAdmin } from '../../middlewares/roleMiddleware.js';

const router = express.Router();

// All routes require admin
router.use(authMiddleware, requireAdmin);

/**
 * GET /api/v1/admin/cache/stats
 * Get cache statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await enhancedCacheService.getCacheStats();
        const jobStatus = cacheCleanupJob.getStatus();

        res.json({
            success: true,
            data: {
                cache: stats,
                cleanupJob: jobStatus,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get cache stats',
            error: error.message,
        });
    }
});

/**
 * POST /api/v1/admin/cache/cleanup
 * Manually trigger cache cleanup
 */
router.post('/cleanup', async (req, res) => {
    try {
        await cacheCleanupJob.trigger();

        res.json({
            success: true,
            message: 'Cache cleanup triggered',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to trigger cleanup',
            error: error.message,
        });
    }
});

/**
 * DELETE /api/v1/admin/cache/user/:userId
 * Force evict specific user from cache
 */
router.delete('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const success = await enhancedCacheService.forceEvictUser(userId);

        if (success) {
            res.json({
                success: true,
                message: `User ${userId} evicted from cache`,
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Failed to evict user',
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to evict user',
            error: error.message,
        });
    }
});

/**
 * POST /api/v1/admin/cache/invalidate/:userId
 * Invalidate user cache (will be refreshed on next read)
 */
router.post('/invalidate/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const success = await enhancedCacheService.invalidateUser(userId);

        if (success) {
            res.json({
                success: true,
                message: `Cache invalidated for user ${userId}`,
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Failed to invalidate cache',
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to invalidate cache',
            error: error.message,
        });
    }
});

/**
 * GET /api/v1/admin/cache/user/:userId
 * Check if user is in cache
 */
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const cached = await enhancedCacheService.getUser(userId);

        if (cached) {
            res.json({
                success: true,
                cached: true,
                data: cached,
            });
        } else {
            res.json({
                success: true,
                cached: false,
                message: 'User not in cache',
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to check cache',
            error: error.message,
        });
    }
});

export default router;
