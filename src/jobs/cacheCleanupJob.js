/**
 * Cache Cleanup Job
 * 
 * Runs periodically to remove inactive users from cache
 * (Users who haven't accessed the site in 30+ days)
 * 
 * This is NOT deleting from database - only from cache!
 */

import cacheService from '../services/cacheService.js';
import logger from '../utils/logger.js';

class CacheCleanupJob {
    constructor() {
        this.intervalMs = 6 * 60 * 60 * 1000; // Run every 6 hours
        this.timer = null;
        this.isRunning = false;
    }

    /**
     * Start the cleanup job
     */
    start() {
        if (this.timer) {
            logger.warn('⚠️ Cleanup job already running');
            return;
        }

        logger.info(`🧹 Cache cleanup job started (runs every ${this.intervalMs / 1000 / 60 / 60} hours)`);

        // Run immediately on start
        this.runCleanup();

        // Then run periodically
        this.timer = setInterval(() => {
            this.runCleanup();
        }, this.intervalMs);
    }

    /**
     * Stop the cleanup job
     */
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            logger.info('🛑 Cache cleanup job stopped');
        }
    }

    /**
     * Execute cleanup
     */
    async runCleanup() {
        if (this.isRunning) {
            logger.warn('⚠️ Previous cleanup still running, skipping...');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            logger.info('🧹 Starting cache cleanup...');

            // Get stats before cleanup
            const statsBefore = await cacheService.getCacheStats();

            // Run cleanup
            const result = await cacheService.cleanupInactiveEntries();

            // Get stats after cleanup
            const statsAfter = await cacheService.getCacheStats();

            const duration = Date.now() - startTime;

            if (result.skipped) {
                logger.info('⏭️ Cleanup skipped (Redis not ready)');
            } else {
                logger.info(`✅ Cleanup complete in ${duration}ms`);
                logger.info(`   Users removed: ${result.cleaned}`);
                logger.info(`   Cached users before: ${statsBefore.cachedUsers}`);
                logger.info(`   Cached users after: ${statsAfter.cachedUsers}`);
                logger.info(`   Memory before: ${statsBefore.memoryUsed}`);
                logger.info(`   Memory after: ${statsAfter.memoryUsed}`);
            }
        } catch (error) {
            logger.error('❌ Cleanup job failed:', error.message);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Manually trigger cleanup (for testing/admin)
     */
    async trigger() {
        logger.info('🔨 Manual cleanup triggered');
        await this.runCleanup();
    }

    /**
     * Get cleanup job status
     */
    getStatus() {
        return {
            running: !!this.timer,
            currentlyExecuting: this.isRunning,
            intervalHours: this.intervalMs / 1000 / 60 / 60,
        };
    }
}

// Export singleton
const cacheCleanupJob = new CacheCleanupJob();
export default cacheCleanupJob;
