/**
 * Performance Monitoring Middleware
 * Tracks response time and logs slow requests
 */

import logger from '../utils/logger.js';

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

        // Log slow requests (> 500ms)
        if (duration > 500) {
            logger.warn(`⚠️ Slow Request: ${req.method} ${req.path} - ${duration}ms`);
        }

        // Call original end function
        originalEnd.apply(res, args);
    };

    next();
};

// Memory usage monitoring (optional, for debugging)
export const memoryMonitor = () => {
    setInterval(() => {
        const used = process.memoryUsage();
        const memoryInfo = {
            rss: `${Math.round(used.rss / 1024 / 1024)}MB`, // Total memory
            heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`,
            external: `${Math.round(used.external / 1024 / 1024)}MB`
        };

        // Only log if heap usage is high (> 500MB)
        if (used.heapUsed > 500 * 1024 * 1024) {
            logger.warn('⚠️ High Memory Usage:', memoryInfo);
        }
    }, 60000); // Check every minute
};

// Request optimization headers
export const optimizationHeaders = (req, res, next) => {
    // Cache control for static assets
    if (req.path.match(/\.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }

    // API responses - short cache
    if (req.path.startsWith('/api/')) {
        res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
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
