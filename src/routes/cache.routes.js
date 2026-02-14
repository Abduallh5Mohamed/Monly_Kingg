import express from 'express';
import cacheSyncService from '../services/cacheSyncService.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/roleMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();

router.get('/stats', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const stats = await cacheSyncService.getCacheStats();
        return res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Cache stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to get cache stats',
            error: error.message
        });
    }
});

router.post('/validate/:userId', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await cacheSyncService.validateCacheConsistency(userId);

        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('Cache validation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to validate cache',
            error: error.message
        });
    }
});

router.post('/sync/:userId', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await cacheSyncService.getUserWithSync(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.json({
            success: true,
            message: 'User cache synced successfully',
            data: user
        });
    } catch (error) {
        logger.error('Cache sync error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to sync cache',
            error: error.message
        });
    }
});

router.post('/invalidate/:userId', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await cacheSyncService.invalidateUserCache(userId);

        return res.json({
            success: true,
            message: 'Cache invalidated successfully',
            data: { invalidated: result }
        });
    } catch (error) {
        logger.error('Cache invalidation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to invalidate cache',
            error: error.message
        });
    }
});

router.post('/bulk-sync', authMiddleware, requireAdmin, async (req, res) => {
    try {
        const { userIds } = req.body;

        if (!userIds || !Array.isArray(userIds)) {
            return res.status(400).json({
                success: false,
                message: 'userIds array is required'
            });
        }

        const result = await cacheSyncService.bulkSyncUsers(userIds);

        return res.json({
            success: true,
            message: 'Bulk sync completed',
            data: result
        });
    } catch (error) {
        logger.error('Bulk sync error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to bulk sync',
            error: error.message
        });
    }
});

export default router;
