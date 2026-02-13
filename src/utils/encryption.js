import crypto from 'crypto';

// ✅ SECURITY: Data encryption utility for sensitive information
// Uses AES-256-GCM for strong encryption with authentication

/**
 * Get encryption key from environment or generate a secure default
 * IMPORTANT: In production, ALWAYS set ENCRYPTION_KEY in .env
 */
const getEncryptionKey = () => {
    const envKey = process.env.ENCRYPTION_KEY;

    if (!envKey) {
        console.warn('⚠️ WARNING: ENCRYPTION_KEY not set in .env - using fallback (NOT secure for production)');
        console.warn('⚠️ Please set ENCRYPTION_KEY in your .env file with a 32-byte hex string');

        // Fallback key (NOT secure, only for development)
        return Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
    }

    // Convert hex string to buffer
    return Buffer.from(envKey, 'hex');
};

const ENCRYPTION_KEY = getEncryptionKey(); // Must be 32 bytes (256 bits)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // AES block size
const AUTH_TAG_LENGTH = 16; // GCM authentication tag

/**
 * Encrypt sensitive data
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted text in format: iv:authTag:encryptedData (hex)
 */
export const encrypt = (text) => {
    if (!text || typeof text !== 'string') {
        return text; // Return as-is if not a string
    }

    try {
        // Generate random initialization vector
        const iv = crypto.randomBytes(IV_LENGTH);

        // Create cipher
        const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

        // Encrypt the text
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Get authentication tag
        const authTag = cipher.getAuthTag();

        // Return in format: iv:authTag:encryptedData
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
        console.error('❌ Encryption error:', error.message);
        throw new Error('Failed to encrypt data');
    }
};

/**
 * Decrypt sensitive data
 * @param {string} encryptedText - Encrypted text in format: iv:authTag:encryptedData (hex)
 * @returns {string} - Decrypted plain text
 */
export const decrypt = (encryptedText) => {
    if (!encryptedText || typeof encryptedText !== 'string') {
        return encryptedText; // Return as-is if not a string
    }

    try {
        // Split the encrypted text into components
        const parts = encryptedText.split(':');

        if (parts.length !== 3) {
            // Data is not encrypted (backward compatibility)
            return encryptedText;
        }

        const [ivHex, authTagHex, encryptedData] = parts;

        // Convert from hex
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        // Create decipher
        const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);

        // Decrypt the data
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('❌ Decryption error:', error.message);
        // Return encrypted text if decryption fails (backward compatibility)
        return encryptedText;
    }
};

/**
 * Hash sensitive data (one-way, cannot be reversed)
 * Useful for phone numbers, emails when you only need to compare, not retrieve
 * @param {string} text - Text to hash
 * @returns {string} - SHA-256 hash (hex)
 */
export const hash = (text) => {
    if (!text || typeof text !== 'string') {
        return text;
    }

    return crypto
        .createHash('sha256')
        .update(text)
        .digest('hex');
};

/**
 * Generate a secure random token
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} - Random token (hex)
 */
export const generateToken = (length = 32) => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Mask sensitive information for logging (e.g., phone: 01234567890 -> 012****7890)
 * @param {string} text - Text to mask
 * @param {number} visibleStart - Characters to show at start
 * @param {number} visibleEnd - Characters to show at end
 * @returns {string} - Masked text
 */
export const maskSensitive = (text, visibleStart = 3, visibleEnd = 4) => {
    if (!text || typeof text !== 'string' || text.length <= visibleStart + visibleEnd) {
        return text;
    }

    const start = text.substring(0, visibleStart);
    const end = text.substring(text.length - visibleEnd);
    const masked = '*'.repeat(Math.min(text.length - visibleStart - visibleEnd, 8));

    return `${start}${masked}${end}`;
};

/**
 * Generate encryption key for .env file
 * Run this once and add the output to your .env as ENCRYPTION_KEY=<output>
 */
export const generateEncryptionKey = () => {
    const key = crypto.randomBytes(32).toString('hex');
    console.log('\n🔐 Generated Encryption Key (add to .env):');
    console.log(`ENCRYPTION_KEY=${key}\n`);
    return key;
};

export default {
    encrypt,
    decrypt,
    hash,
    generateToken,
    maskSensitive,
    generateEncryptionKey
};
