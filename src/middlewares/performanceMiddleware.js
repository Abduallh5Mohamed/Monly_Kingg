/**
 * Performance Monitoring Middleware
 * Tracks response time and logs slow requests
 */

import logger from '../utils/logger.js';

// Track recently logged slow requests to avoid flooding logs
const _slowRequestLog = new Map(); // path -> lastLoggedAt
const SLOW_LOG_INTERVAL = 10_000; // Only log same path once per 10 seconds

// Response time tracking
export const responseTimeTracker = (req, res, next) => {
    const startTime = Date.now();

    // Store original end function
    const originalEnd = res.end;

    // Override end function to add header before response is sent
    res.end = function (...args) {
        const duration = Date.now() - startTime;

        // Add response time header BEFORE sending response
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
                logger.warn(`⚠️ Slow Request: ${req.method} ${req.path} - ${duration}ms`);
            }

            // Periodically clean up old entries
            if (_slowRequestLog.size > 200) {
                for (const [k, t] of _slowRequestLog) {
                    if (now - t > 60_000) _slowRequestLog.delete(k);
                }
            }
        }

        // Call original end function
        originalEnd.apply(res, args);
    };

    next();
};

// Memory usage monitoring (optional, for debugging)
// Memory usage monitoring with cleanup support
let memoryMonitorInterval = null;
export const memoryMonitor = () => {
    if (memoryMonitorInterval) clearInterval(memoryMonitorInterval);
    memoryMonitorInterval = setInterval(() => {
        const used = process.memoryUsage();

        // Only log if heap usage is high (> 500MB)
        if (used.heapUsed > 500 * 1024 * 1024) {
            logger.warn('⚠️ High Memory Usage:', {
                rss: `${Math.round(used.rss / 1024 / 1024)}MB`,
                heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
            });
        }
    }, 60000);
};

// Request optimization headers
export const optimizationHeaders = (req, res, next) => {
    // Cache control for static assets (images, fonts, CSS, JS bundles)
    if (req.path.match(/\.(jpg|jpeg|png|gif|ico|css|woff|woff2|avif|webp|svg)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // Next.js hashed static bundles — safe to cache forever
    else if (req.path.startsWith('/_next/static/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // API responses — never cache, always fresh
    else if (req.path.startsWith('/api/')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
    // HTML pages — always revalidate to get latest version
    else {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }

    next();
};

// Connection keep-alive
export const keepAlive = (req, res, next) => {
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=5');
    next();
};

export default {
    responseTimeTracker,
    memoryMonitor,
    optimizationHeaders,
    keepAlive
};
