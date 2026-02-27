/**
 * Ranking Recalculation Job
 * 
 * Cron Strategy:
 *   ┌──────────────────┬───────────┬────────────────────────────────┐
 *   │ Task             │ Frequency │ Why                            │
 *   ├──────────────────┼───────────┼────────────────────────────────┤
 *   │ Score recalc     │ 15 min    │ Trending needs near-realtime   │
 *   │ Reset viewsToday │ Daily     │ Rolling 24h window             │
 *   │ Reset views7d    │ Weekly    │ Rolling 7d window              │
 *   │ Reset views30d   │ Monthly   │ Rolling 30d window             │
 *   └──────────────────┴───────────┴────────────────────────────────┘
 */

import rankingService from '../services/rankingService.js';
import logger from '../utils/logger.js';

class RankingJob {
    constructor() {
        this.scoreTimer = null;
        this.dailyTimer = null;
        this.weeklyTimer = null;
        this.monthlyTimer = null;
        this.isRunning = false;
    }

    /**
     * Start all ranking jobs
     */
    start() {
        if (this.scoreTimer) {
            logger.warn('⚠️ Ranking job already running');
            return;
        }

        logger.info('📊 Ranking job started');

        // Run immediately on startup
        this._safeRecalc();

        // Score recalculation — every 15 minutes
        this.scoreTimer = setInterval(() => {
            this._safeRecalc();
        }, 15 * 60 * 1000);

        // Daily view reset — every 24 hours
        this.dailyTimer = setInterval(() => {
            this._safeReset('daily');
        }, 24 * 60 * 60 * 1000);

        // Weekly view reset — every 7 days
        this.weeklyTimer = setInterval(() => {
            this._safeReset('weekly');
        }, 7 * 24 * 60 * 60 * 1000);

        // Monthly view reset — every 30 days
        this.monthlyTimer = setInterval(() => {
            this._safeReset('monthly');
        }, 30 * 24 * 60 * 60 * 1000);
    }

    /**
     * Stop all jobs
     */
    stop() {
        [this.scoreTimer, this.dailyTimer, this.weeklyTimer, this.monthlyTimer].forEach(t => {
            if (t) clearInterval(t);
        });
        this.scoreTimer = this.dailyTimer = this.weeklyTimer = this.monthlyTimer = null;
        logger.info('🛑 Ranking job stopped');
    }

    /**
     * Safe recalculation (prevents concurrent runs)
     */
    async _safeRecalc() {
        if (this.isRunning) {
            logger.warn('⏭️ Previous ranking recalc still running, skipping...');
            return;
        }

        this.isRunning = true;
        try {
            const result = await rankingService.recalculateAllScores();
            logger.info(`📊 Ranking recalc done: ${result.recalculated} listings in ${result.duration}ms`);
        } catch (error) {
            logger.error('❌ Ranking recalc failed:', error.message);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Safe view window reset
     */
    async _safeReset(window) {
        try {
            await rankingService.resetViewWindows(window);
        } catch (error) {
            logger.error(`❌ View reset (${window}) failed:`, error.message);
        }
    }

    /**
     * Manual trigger (for admin panel)
     */
    async trigger() {
        logger.info('🔨 Manual ranking recalc triggered');
        await this._safeRecalc();
    }

    /**
     * Get job status
     */
    getStatus() {
        return {
            running: !!this.scoreTimer,
            currentlyRecalculating: this.isRunning,
            intervals: {
                scoreRecalc: '15 min',
                dailyReset: '24 hrs',
                weeklyReset: '7 days',
                monthlyReset: '30 days',
            },
        };
    }
}

const rankingJob = new RankingJob();
export default rankingJob;
