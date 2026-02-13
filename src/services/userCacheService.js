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
      const cacheKey = `user:email:${identifier}`;
      const userData = await redis.get(cacheKey);
      if (userData) return userData;

      // Try by ID
      const userKey = redis.generateUserKey(identifier);
      const hashData = await redis.hgetall(userKey);
      if (Object.keys(hashData).length > 0) return hashData;

      // Fallback to database
      const dbQuery = identifier.includes('@') ? { email: identifier } : { _id: identifier };
      const user = await User.findOne(dbQuery).lean();

      if (user) {
        this.cacheUser(user).catch(() => { }); // Fire-and-forget
        return user;
      }
      return null;
    } catch (error) {
      logger.error(`User cache error: ${error.message}`);
      try {
        const dbQuery = identifier.includes('@') ? { email: identifier } : { _id: identifier };
        return await User.findOne(dbQuery).lean();
      } catch (dbError) {
        return null;
      }
    }
  }

  async cacheUser(user) {
    try {
      const userId = (user._id || user.id).toString();
      const userData = typeof user.toObject === 'function' ? user.toObject() : { ...user };

      // Security: Remove sensitive data
      delete userData.passwordHash;
      delete userData.refreshTokens;
      delete userData.authLogs;
      delete userData.__v;

      // Cache by ID and email in parallel
      const ops = [
        redis.hset(redis.generateUserKey(userId), 'data', userData, this.userTTL)
      ];
      if (userData.email) {
        ops.push(redis.set(`user:email:${userData.email}`, userData, this.userTTL));
      }
      await Promise.allSettled(ops);
      return true;
    } catch (error) {
      logger.error(`Cache user error: ${error.message}`);
      return false;
    }
  }

  async removeUser(userId) {
    try {
      const userKey = redis.generateUserKey(userId);
      const userData = await redis.hget(userKey, 'data');

      const ops = [redis.del(userKey), redis.del(`auth:user:${userId}`)];
      if (userData?.email) ops.push(redis.del(`user:email:${userData.email}`));
      await Promise.allSettled(ops);
      return true;
    } catch (error) {
      return false;
    }
  }

  // =================== SESSION CACHING ===================
  async cacheSession(userId, sessionData) {
    try {
      return await redis.set(redis.generateSessionKey(userId), sessionData, this.sessionTTL);
    } catch (error) {
      return false;
    }
  }

  async getSession(userId) {
    try {
      return await redis.get(redis.generateSessionKey(userId));
    } catch (error) {
      return null;
    }
  }

  async removeSession(userId) {
    try {
      return await redis.del(redis.generateSessionKey(userId));
    } catch (error) {
      return false;
    }
  }

  // =================== TEMP CODES CACHING ===================
  async cacheTempCode(email, type, code) {
    try {
      const codeKey = redis.generateTempCodeKey(email, type);
      return await redis.set(codeKey, { code, email, type, createdAt: new Date() }, this.tempCodeTTL);
    } catch (error) {
      return false;
    }
  }

  async getTempCode(email, type) {
    try {
      return await redis.get(redis.generateTempCodeKey(email, type));
    } catch (error) {
      return null;
    }
  }

  async removeTempCode(email, type) {
    try {
      return await redis.del(redis.generateTempCodeKey(email, type));
    } catch (error) {
      return false;
    }
  }

  // =================== RATE LIMITING ===================
  async checkRateLimit(ip, action, maxRequests = 10, windowSeconds = 3600) {
    try {
      const currentCount = await redis.incr(redis.generateRateLimitKey(ip, action), windowSeconds);
      const isLimited = currentCount > maxRequests;
      if (isLimited) {
        logger.warn(`Rate limit exceeded: ${action} from ${ip}`);
      }
      return { allowed: !isLimited, currentCount, maxRequests, resetTime: Date.now() + (windowSeconds * 1000) };
    } catch (error) {
      return { allowed: true, currentCount: 0, maxRequests, resetTime: null };
    }
  }

  // =================== AUTH LOGS CACHING ===================
  async addAuthLog(userId, action, ip = null, success = true) {
    try {
      return await redis.lpush(redis.generateAuthLogKey(userId), { action, success, ip, timestamp: new Date(), userId }, 50);
    } catch (error) {
      return false;
    }
  }

  async getAuthLogs(userId, limit = 10) {
    try {
      return await redis.lrange(redis.generateAuthLogKey(userId), 0, limit - 1);
    } catch (error) {
      return [];
    }
  }

  // =================== CACHE MANAGEMENT ===================
  async clearUserCache(userId) {
    try {
      await Promise.allSettled([
        this.removeUser(userId),
        this.removeSession(userId),
        redis.del(redis.generateAuthLogKey(userId))
      ]);
      return true;
    } catch (error) {
      return false;
    }
  }

  // =================== PASSWORD RESET CACHING ===================
  async cachePasswordResetToken(userId, token) {
    try {
      return await redis.set(`password_reset:${userId}`, {
        token, userId, createdAt: new Date(), expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      }, 15 * 60);
    } catch (error) {
      return false;
    }
  }

  async getPasswordResetToken(identifier) {
    try {
      let resetKey;
      if (identifier.includes('@')) {
        const userData = await this.getUser(identifier);
        if (!userData) return null;
        resetKey = `password_reset:${userData._id}`;
      } else {
        resetKey = `password_reset:${identifier}`;
      }

      const resetData = await redis.get(resetKey);
      if (resetData) {
        if (new Date(resetData.expiresAt) < new Date()) {
          redis.del(resetKey).catch(() => { });
          return null;
        }
        return resetData.token;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async removePasswordResetToken(userId) {
    try {
      return await redis.del(`password_reset:${userId}`);
    } catch (error) {
      return false;
    }
  }

  // =================== PASSWORD RESET RATE LIMITING ===================
  async checkPasswordResetRateLimit(email, maxRequests = 3, windowMinutes = 60) {
    try {
      const currentCount = await redis.incr(`password_reset_rate:${email}`, windowMinutes * 60);
      const isLimited = currentCount > maxRequests;
      if (isLimited) logger.warn(`Password reset rate limit: ${email}`);
      return { allowed: !isLimited, currentCount, maxRequests, resetTime: Date.now() + (windowMinutes * 60 * 1000) };
    } catch (error) {
      return { allowed: true, currentCount: 0, maxRequests, resetTime: null };
    }
  }

  async getCacheStats() {
    try {
      if (!redis.isReady()) return { error: 'Redis not connected' };
      const client = redis.getClient();
      const keys = await client.keys('*');
      return {
        totalKeys: keys.length,
        userKeys: keys.filter(k => k.startsWith('user:')).length,
        sessionKeys: keys.filter(k => k.startsWith('session:')).length,
        redisConnected: true,
        timestamp: new Date()
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}

const userCacheService = new UserCacheService();
export default userCacheService;