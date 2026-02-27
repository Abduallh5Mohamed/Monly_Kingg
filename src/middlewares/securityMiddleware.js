// Enhanced input sanitization middleware
import DOMPurify from 'isomorphic-dompurify';

// Sanitize strings to prevent XSS
function sanitizeString(str) {
    if (typeof str !== 'string') return str;

    // Remove potential XSS payloads
    return DOMPurify.sanitize(str, {
        ALLOWED_TAGS: [], // No HTML tags allowed
        ALLOWED_ATTR: [] // No attributes allowed
    }).trim();
}

// Recursively sanitize all string values in an object
function deepSanitize(obj) {
    if (obj === null || typeof obj !== 'object') {
        return typeof obj === 'string' ? sanitizeString(obj) : obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(deepSanitize);
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        // Skip already processed keys
        if (key.startsWith('$') || key.includes('.')) continue;

        sanitized[key] = deepSanitize(value);
    }
    return sanitized;
}

export const enhancedSanitizer = (req, res, next) => {
    try {
        // Sanitize request body (mutable — safe to reassign)
        if (req.body && typeof req.body === 'object') {
            req.body = deepSanitize(req.body);
        }

        // Sanitize query parameters in-place (req.query may be a getter in Express 5+)
        if (req.query && typeof req.query === 'object') {
            for (const key of Object.keys(req.query)) {
                if (typeof req.query[key] === 'string') {
                    req.query[key] = sanitizeString(req.query[key]);
                }
            }
        }

        // Sanitize URL parameters in-place
        if (req.params && typeof req.params === 'object') {
            for (const key of Object.keys(req.params)) {
                if (typeof req.params[key] === 'string') {
                    req.params[key] = sanitizeString(req.params[key]);
                }
            }
        }

        next();
    } catch (error) {
        // Non-fatal — continue request
        next();
    }
};

// Rate limiting for sensitive endpoints (use centralized rate limiter)
import { createRateLimiter } from './rateLimiter.js';

export const sensitiveEndpointLimiter = createRateLimiter('login', {
    max: 5,
    message: 'Too many sensitive requests from this IP, please try again later.'
}, {
    useUserKey: false,
    progressive: true
});