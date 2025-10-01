import redis from '../config/redis.js';
import logger from '../utils/logger.js';
import User from '../modules/users/user.model.js';

class UserCacheService {
  constructor() {
    this.userTTL = 3600; // 1 hour
    this.sessionTTL = 86400; // 24 hours
    this.tempCodeTTL = 900; // 15 minutes
    this.rateLimitTTL = 3600; // 1 hour
  }

  // =================== USER CACHING ===================
  async getUser(identifier) {
    try {
      // Try by email first
      let cacheKey = `user:email:${identifier}`;
      let userData = await redis.get(cacheKey);

      if (userData) {
        logger.info(`⚡ USER CACHE HIT (by email): ${identifier}`);
        return userData;
      }

      // Try by ID if email didn't work
      cacheKey = redis.generateUserKey(identifier);
      userData = await redis.hgetall(cacheKey);

      if (Object.keys(userData).length > 0) {
        logger.info(`⚡ USER CACHE HIT (by ID): ${identifier}`);
        return userData;
      }

      logger.info(`📊 USER CACHE MISS: ${identifier} - Querying database`);

      // Fallback to database
      const dbQuery = identifier.includes('@')
        ? { email: identifier }
        : { _id: identifier };

      const user = await User.findOne(dbQuery);

      if (user) {
        // Cache the user data for future requests
        await this.cacheUser(user);
        logger.info(`💾 USER CACHED from DB: ${identifier}`);
        return user.toObject();
      }

      return null;
    } catch (error) {
      logger.error(`User cache get error for ${identifier}:`, error.message);
      // Fallback to database on error
      try {
        const dbQuery = identifier.includes('@')
          ? { email: identifier }
          : { _id: identifier };
        return await User.findOne(dbQuery);
      } catch (dbError) {
        logger.error(`Database fallback error:`, dbError.message);
        return null;
      }
    }
  }

  async cacheUser(user) {
    try {
      const userId = user._id.toString();
      const userData = typeof user.toObject === 'function' ? user.toObject() : user;

      // Security: Remove sensitive data before caching
      const safeUserData = { ...userData };
      delete safeUserData.passwordHash;
      delete safeUserData.refreshTokens;
      delete safeUserData.__v;

      // Cache by ID
      const userKey = redis.generateUserKey(userId);
      await redis.hset(userKey, 'data', safeUserData, this.userTTL);

      // Cache by email for quick lookup
      const emailKey = `user:email:${safeUserData.email}`;
      await redis.set(emailKey, safeUserData, this.userTTL);

      logger.info(`✅ User ${userId} cached for ${this.userTTL} seconds (without sensitive data)`);
      return true;
    } catch (error) {
      logger.error(`Cache user error:`, error.message);
      return false;
    }
  }

  async removeUser(userId) {
    try {
      const userKey = redis.generateUserKey(userId);

      // Get user data to find email
      const userData = await redis.hget(userKey, 'data');
      if (userData && userData.email) {
        const emailKey = `user:email:${userData.email}`;
        await redis.del(emailKey);
      }

      await redis.del(userKey);
      logger.info(`🗑️ User ${userId} removed from cache`);
      return true;
    } catch (error) {
      logger.error(`Remove user cache error:`, error.message);
      return false;
    }
  }

  // =================== SESSION CACHING ===================
  async cacheSession(userId, sessionData) {
    try {
      const sessionKey = redis.generateSessionKey(userId);
      await redis.set(sessionKey, sessionData, this.sessionTTL);
      logger.info(`✅ Session cached for user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Cache session error:`, error.message);
      return false;
    }
  }

  async getSession(userId) {
    try {
      const sessionKey = redis.generateSessionKey(userId);
      const session = await redis.get(sessionKey);

      if (session) {
        logger.info(`⚡ SESSION CACHE HIT: ${userId}`);
      } else {
        logger.info(`📊 SESSION CACHE MISS: ${userId}`);
      }

      return session;
    } catch (error) {
      logger.error(`Get session error:`, error.message);
      return null;
    }
  }

  async removeSession(userId) {
    try {
      const sessionKey = redis.generateSessionKey(userId);
      await redis.del(sessionKey);
      logger.info(`🗑️ Session removed for user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Remove session error:`, error.message);
      return false;
    }
  }

  // =================== TEMP CODES CACHING ===================
  async cacheTempCode(email, type, code) {
    try {
      const codeKey = redis.generateTempCodeKey(email, type);
      await redis.set(codeKey, { code, email, type, createdAt: new Date() }, this.tempCodeTTL);
      logger.info(`✅ Temp code cached: ${type} for ${email}`);
      return true;
    } catch (error) {
      logger.error(`Cache temp code error:`, error.message);
      return false;
    }
  }

  async getTempCode(email, type) {
    try {
      const codeKey = redis.generateTempCodeKey(email, type);
      const codeData = await redis.get(codeKey);

      if (codeData) {
        logger.info(`⚡ TEMP CODE CACHE HIT: ${type} for ${email}`);
      } else {
        logger.info(`📊 TEMP CODE CACHE MISS: ${type} for ${email}`);
      }

      return codeData;
    } catch (error) {
      logger.error(`Get temp code error:`, error.message);
      return null;
    }
  }

  async removeTempCode(email, type) {
    try {
      const codeKey = redis.generateTempCodeKey(email, type);
      await redis.del(codeKey);
      logger.info(`🗑️ Temp code removed: ${type} for ${email}`);
      return true;
    } catch (error) {
      logger.error(`Remove temp code error:`, error.message);
      return false;
    }
  }

  // =================== RATE LIMITING ===================
  async checkRateLimit(ip, action, maxRequests = 10, windowSeconds = 3600) {
    try {
      const rateLimitKey = redis.generateRateLimitKey(ip, action);
      const currentCount = await redis.incr(rateLimitKey, windowSeconds);

      const isLimited = currentCount > maxRequests;

      if (isLimited) {
        logger.warn(`🚫 RATE LIMIT EXCEEDED: ${action} from ${ip} (${currentCount}/${maxRequests})`);
      } else {
        logger.info(`✅ RATE LIMIT OK: ${action} from ${ip} (${currentCount}/${maxRequests})`);
      }

      return {
        allowed: !isLimited,
        currentCount,
        maxRequests,
        resetTime: Date.now() + (windowSeconds * 1000)
      };
    } catch (error) {
      logger.error(`Rate limit check error:`, error.message);
      // Allow request on error (fail open)
      return { allowed: true, currentCount: 0, maxRequests, resetTime: null };
    }
  }

  // =================== AUTH LOGS CACHING ===================
  async addAuthLog(userId, action, ip = null, success = true) {
    try {
      const logKey = redis.generateAuthLogKey(userId);
      const logEntry = {
        action,
        success,
        ip,
        timestamp: new Date(),
        userId
      };

      await redis.lpush(logKey, logEntry, 50); // Keep last 50 logs
      logger.info(`✅ Auth log added to cache for user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Add auth log error:`, error.message);
      return false;
    }
  }

  async getAuthLogs(userId, limit = 10) {
    try {
      const logKey = redis.generateAuthLogKey(userId);
      const logs = await redis.lrange(logKey, 0, limit - 1);

      if (logs.length > 0) {
        logger.info(`⚡ AUTH LOGS CACHE HIT: ${userId} (${logs.length} logs)`);
      } else {
        logger.info(`📊 AUTH LOGS CACHE MISS: ${userId}`);
      }

      return logs;
    } catch (error) {
      logger.error(`Get auth logs error:`, error.message);
      return [];
    }
  }

  // =================== CACHE MANAGEMENT ===================
  async clearUserCache(userId) {
    try {
      await this.removeUser(userId);
      await this.removeSession(userId);

      const authLogKey = redis.generateAuthLogKey(userId);
      await redis.del(authLogKey);

      logger.info(`🧹 All cache cleared for user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Clear user cache error:`, error.message);
      return false;
    }
  }

  // =================== PASSWORD RESET CACHING ===================
  async cachePasswordResetToken(userId, token) {
    try {
      const resetKey = `password_reset:${userId}`;
      const resetData = {
        token,
        userId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
      };

      await redis.set(resetKey, resetData, 15 * 60); // 15 minutes TTL
      logger.info(`✅ Password reset token cached for user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Cache password reset token error:`, error.message);
      return false;
    }
  }

  async getPasswordResetToken(identifier) {
    try {
      let resetKey;

      // If identifier is email, find userId first
      if (identifier.includes('@')) {
        const userData = await this.getUser(identifier);
        if (!userData) return null;
        resetKey = `password_reset:${userData._id}`;
      } else {
        resetKey = `password_reset:${identifier}`;
      }

      const resetData = await redis.get(resetKey);

      if (resetData) {
        logger.info(`⚡ PASSWORD RESET CACHE HIT: ${identifier}`);
        // Check if token is expired
        if (new Date(resetData.expiresAt) < new Date()) {
          logger.warn(`⏰ Cached password reset token expired for: ${identifier}`);
          await redis.del(resetKey);
          return null;
        }
        return resetData.token;
      } else {
        logger.info(`📊 PASSWORD RESET CACHE MISS: ${identifier}`);
        return null;
      }
    } catch (error) {
      logger.error(`Get password reset token error:`, error.message);
      return null;
    }
  }

  async removePasswordResetToken(userId) {
    try {
      const resetKey = `password_reset:${userId}`;
      await redis.del(resetKey);
      logger.info(`🗑️ Password reset token removed for user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Remove password reset token error:`, error.message);
      return false;
    }
  }

  // =================== PASSWORD RESET RATE LIMITING ===================
  async checkPasswordResetRateLimit(email, maxRequests = 3, windowMinutes = 60) {
    try {
      const rateLimitKey = `password_reset_rate:${email}`;
      const currentCount = await redis.incr(rateLimitKey, windowMinutes * 60); // Convert to seconds

      const isLimited = currentCount > maxRequests;

      if (isLimited) {
        logger.warn(`🚫 PASSWORD RESET RATE LIMIT EXCEEDED: ${email} (${currentCount}/${maxRequests})`);
      } else {
        logger.info(`✅ PASSWORD RESET RATE LIMIT OK: ${email} (${currentCount}/${maxRequests})`);
      }

      return {
        allowed: !isLimited,
        currentCount,
        maxRequests,
        resetTime: Date.now() + (windowMinutes * 60 * 1000)
      };
    } catch (error) {
      logger.error(`Password reset rate limit check error:`, error.message);
      // Allow request on error (fail open)
      return { allowed: true, currentCount: 0, maxRequests, resetTime: null };
    }
  }

  async getCacheStats() {
    try {
      if (!redis.isReady()) {
        return { error: 'Redis not connected' };
      }

      const client = redis.getClient();
      const keys = await client.keys('*');

      const stats = {
        totalKeys: keys.length,
        userKeys: keys.filter(k => k.startsWith('user:')).length,
        sessionKeys: keys.filter(k => k.startsWith('session:')).length,
        tempCodeKeys: keys.filter(k => k.startsWith('temp_code:')).length,
        rateLimitKeys: keys.filter(k => k.startsWith('rate_limit:')).length,
        authLogKeys: keys.filter(k => k.startsWith('auth_logs:')).length,
        passwordResetKeys: keys.filter(k => k.startsWith('password_reset:')).length,
        redisConnected: redis.isReady(),
        timestamp: new Date()
      };

      logger.info(`📊 Cache stats retrieved: ${stats.totalKeys} total keys`);
      return stats;
    } catch (error) {
      logger.error(`Get cache stats error:`, error.message);
      return { error: error.message };
    }
  }
}

const userCacheService = new UserCacheService();

export default userCacheService;