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
        // Sanitize request body
        if (req.body && typeof req.body === 'object') {
            req.body = deepSanitize(req.body);
        }

        // Sanitize query parameters
        if (req.query && typeof req.query === 'object') {
            req.query = deepSanitize(req.query);
        }

        // Sanitize URL parameters
        if (req.params && typeof req.params === 'object') {
            req.params = deepSanitize(req.params);
        }

        next();
    } catch (error) {
        // Log error but don't block request
        console.error('Sanitization error:', error);
        next();
    }
};

// Rate limiting for sensitive endpoints
export const sensitiveEndpointLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs for sensitive operations
    message: {
        error: 'Too many sensitive requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});