/**
 * Performance Monitoring Middleware
 * Optimized: merged headers into single middleware, regex compiled once
 */

import logger from '../utils/logger.js';

// Precompiled regex for static asset detection
const STATIC_ASSET_RE = /\.(jpg|jpeg|png|gif|ico|css|woff|woff2|avif|webp|svg)$/;

// Track recently logged slow requests to avoid flooding logs
const _slowRequestLog = new Map();
const SLOW_LOG_INTERVAL = 10_000;

// Response time tracking — only attached to /api routes by server-integrated.js
export const responseTimeTracker = (req, res, next) => {
    const startTime = Date.now();
    const originalEnd = res.end;

    res.end = function (...args) {
        const duration = Date.now() - startTime;

        if (!res.headersSent) {
            res.setHeader('X-Response-Time', `${duration}ms`);
        }

        // Log slow requests (> 1000ms), deduplicated per path
        if (duration > 1000) {
            const now = Date.now();
            const key = `${req.method}:${req.path}`;
            const lastLogged = _slowRequestLog.get(key) || 0;

            if (now - lastLogged > SLOW_LOG_INTERVAL) {
                _slowRequestLog.set(key, now);
                logger.warn(`Slow Request: ${req.method} ${req.path} - ${duration}ms`);
            }

            // Compact map occasionally
            if (_slowRequestLog.size > 200) {
                for (const [k, t] of _slowRequestLog) {
                    if (now - t > 60_000) _slowRequestLog.delete(k);
                }
            }
        }

        originalEnd.apply(res, args);
    };

    next();
};

// Memory monitor with cleanup support
let memoryMonitorInterval = null;
export const memoryMonitor = () => {
    if (memoryMonitorInterval) clearInterval(memoryMonitorInterval);
    memoryMonitorInterval = setInterval(() => {
        const used = process.memoryUsage();
        if (used.heapUsed > 500 * 1024 * 1024) {
            logger.warn('High Memory Usage:', {
                rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
                heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
            });
        }
    }, 60000);
};

// Combined optimization headers + keep-alive (single middleware instead of two)
export const optimizationHeaders = (req, res, next) => {
    // Keep-alive for all
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=5');

    // Static asset caching
    if (STATIC_ASSET_RE.test(req.path)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (req.path.startsWith('/_next/static/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (req.path.startsWith('/api/')) {
        res.setHeader('Cache-Control', 'no-store');
    }

    next();
};

// keepAlive is now merged into optimizationHeaders — export a no-op for backward compat
export const keepAlive = (req, res, next) => next();

export default {
    responseTimeTracker,
    memoryMonitor,
    optimizationHeaders,
    keepAlive
};
