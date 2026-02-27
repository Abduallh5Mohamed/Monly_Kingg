/**
 * Ranking API Routes
 * 
 * Public endpoints for fetching ranked listings:
 *   GET /api/v1/rankings/homepage     → all 3 sections at once
 *   GET /api/v1/rankings/best-seller  → top best sellers
 *   GET /api/v1/rankings/trending     → trending now
 *   GET /api/v1/rankings/popular      → most popular
 * 
 * Tracking:
 *   POST /api/v1/rankings/view/:id    → record a view
 * 
 * Admin:
 *   POST /api/v1/rankings/recalculate → force recalc (auth required)
 *   GET  /api/v1/rankings/status      → job status (auth required)
 */

import express from 'express';
import rankingService from '../services/rankingService.js';
import rankingJob from '../jobs/rankingJob.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { cacheResponse } from '../middlewares/apiCacheMiddleware.js';
import { adClickLimiter, adminHeavyLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

// In-flight request deduplication for homepage rankings
let homepageInflight = null;

// ─── PUBLIC: Homepage rankings (all 3 sections) ─────────────
router.get('/homepage', cacheResponse(120), async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 30);

        // Deduplicate concurrent requests: reuse a single in-flight promise
        if (!homepageInflight) {
            homepageInflight = rankingService.getHomepageRankings(limit)
                .finally(() => { homepageInflight = null; });
        }
        const data = await homepageInflight;

        return res.json({ success: true, data });
    } catch (error) {
        console.error('Rankings homepage error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// ─── PUBLIC: Individual sections ─────────────────────────────
router.get('/best-seller', cacheResponse(120), async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 30);
        const gameId = req.query.game || null;
        const data = await rankingService.getTopListings('bestSeller', limit, gameId);
        return res.json({ success: true, data });
    } catch (error) {
        console.error('Best seller error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

router.get('/trending', cacheResponse(120), async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 30);
        const gameId = req.query.game || null;
        const data = await rankingService.getTopListings('trending', limit, gameId);
        return res.json({ success: true, data });
    } catch (error) {
        console.error('Trending error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

router.get('/popular', cacheResponse(120), async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 30);
        const gameId = req.query.game || null;
        const data = await rankingService.getTopListings('popular', limit, gameId);
        return res.json({ success: true, data });
    } catch (error) {
        console.error('Popular error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// ─── PUBLIC: Record view (call from listing detail page) ─────
router.post('/view/:id', adClickLimiter, async (req, res) => {
    try {
        const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        const result = await rankingService.recordView(req.params.id, ip);
        return res.json({ success: true, ...result });
    } catch (error) {
        console.error('View tracking error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// ─── ADMIN: Force recalculation ──────────────────────────────
router.post('/recalculate', authMiddleware, adminHeavyLimiter, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin only' });
        }

        const result = await rankingService.recalculateAllScores();
        return res.json({ success: true, data: result });
    } catch (error) {
        console.error('Recalculate error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

// ─── ADMIN: Job status ───────────────────────────────────────
router.get('/status', authMiddleware, adminHeavyLimiter, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin only' });
        }
        return res.json({ success: true, data: rankingJob.getStatus() });
    } catch (error) {
        return res.status(500).json({ message: 'Server error' });
    }
});

export default router;
