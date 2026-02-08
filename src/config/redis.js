import { createClient } from 'redis';
import logger from '../utils/logger.js';

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      if (this.client && this.isConnected) {
        return true;
      }

      // Close existing connection if any
      if (this.client) {
        try {
          await this.client.quit();
        } catch (err) {
          // Ignore quit errors
        }
        this.client = null;
      }

      // Build Redis URL
      const redisHost = process.env.REDIS_HOST || 'localhost';
      const redisPort = process.env.REDIS_PORT || 6379;
      const redisDb = parseInt(process.env.REDIS_DB || '0');
      
      // Create config without password
      const redisConfig = {
        socket: {
          host: redisHost,
          port: parseInt(redisPort)
        },
        database: redisDb
      };
      
      logger.info(`Redis: Connecting to ${redisHost}:${redisPort} (DB: ${redisDb})`);

      this.client = createClient(redisConfig);

      // Set up event handlers for ongoing connection
      this.client.on('error', (err) => {
        if (err && err.message) {
          logger.warn(`Redis error: ${err.message}`);
        }
      });

      this.client.on('end', () => {
        this.isConnected = false;
      });

      // Connect
      await this.client.connect();
      
      // Test with ping
      await this.client.ping();
      
      this.isConnected = true;
      logger.info('✅ Redis Connected and Ready');
      logger.info('🏓 Redis Ping Successful');

      return true;
    } catch (error) {
      logger.error('❌ Redis Connection Failed:', error.message || error);
      logger.info('📝 Server will continue without caching');
      this.isConnected = false;
      if (this.client) {
        try {
          await this.client.quit();
        } catch (e) {
          // Ignore
        }
        this.client = null;
      }
      return false;
    }
  }

  async disconnect() {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis Disconnected');
    }
  }

  isReady() {
    return this.client && this.isConnected;
  }

  getClient() {
    return this.client;
  }

  // Basic cache operations with fallback
  async get(key) {
    try {
      if (!this.isReady()) {
        logger.warn(`Cache miss - Redis not ready for key: ${key}`);
        return null;
      }
      const value = await this.client.get(key);
      if (value) {
        logger.info(`🎯 Cache HIT: ${key}`);
        return JSON.parse(value);
      } else {
        logger.info(`📊 Cache MISS: ${key}`);
        return null;
      }
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error.message);
      return null;
    }
  }

  async set(key, value, expirationInSeconds = 3600) {
    try {
      if (!this.isReady()) {
        logger.warn(`Cache skip - Redis not ready for key: ${key}`);
        return false;
      }
      await this.client.setEx(key, expirationInSeconds, JSON.stringify(value));
      logger.info(`💾 Cache SET: ${key} (TTL: ${expirationInSeconds}s)`);
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error.message);
      return false;
    }
  }

  async del(key) {
    try {
      if (!this.isReady()) return false;
      await this.client.del(key);
      logger.info(`🗑️ Cache DELETE: ${key}`);
      return true;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error.message);
      return false;
    }
  }

  async exists(key) {
    try {
      if (!this.isReady()) return false;
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error.message);
      return false;
    }
  }

  // Hash operations for complex objects
  async hset(key, field, value, expirationInSeconds = 3600) {
    try {
      if (!this.isReady()) return false;
      await this.client.hSet(key, field, JSON.stringify(value));
      await this.client.expire(key, expirationInSeconds);
      logger.info(`💾 Cache HSET: ${key}.${field} (TTL: ${expirationInSeconds}s)`);
      return true;
    } catch (error) {
      logger.error(`Redis HSET error for key ${key}:`, error.message);
      return false;
    }
  }

  async hget(key, field) {
    try {
      if (!this.isReady()) return null;
      const value = await this.client.hGet(key, field);
      if (value) {
        logger.info(`🎯 Cache HGET HIT: ${key}.${field}`);
        return JSON.parse(value);
      } else {
        logger.info(`📊 Cache HGET MISS: ${key}.${field}`);
        return null;
      }
    } catch (error) {
      logger.error(`Redis HGET error for key ${key}:`, error.message);
      return null;
    }
  }

  async hgetall(key) {
    try {
      if (!this.isReady()) return {};
      const value = await this.client.hGetAll(key);
      if (Object.keys(value).length > 0) {
        logger.info(`🎯 Cache HGETALL HIT: ${key}`);
        const parsed = {};
        for (const [field, val] of Object.entries(value)) {
          parsed[field] = JSON.parse(val);
        }
        return parsed;
      } else {
        logger.info(`📊 Cache HGETALL MISS: ${key}`);
        return {};
      }
    } catch (error) {
      logger.error(`Redis HGETALL error for key ${key}:`, error.message);
      return {};
    }
  }

  // Increment for rate limiting
  async incr(key, expirationInSeconds = 3600) {
    try {
      if (!this.isReady()) return 0;
      const value = await this.client.incr(key);
      if (value === 1) {
        await this.client.expire(key, expirationInSeconds);
      }
      logger.info(`📈 Cache INCR: ${key} = ${value}`);
      return value;
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}:`, error.message);
      return 0;
    }
  }

  // List operations for logs
  async lpush(key, value, maxLength = 100) {
    try {
      if (!this.isReady()) return false;
      await this.client.lPush(key, JSON.stringify(value));
      await this.client.lTrim(key, 0, maxLength - 1);
      logger.info(`📝 Cache LPUSH: ${key}`);
      return true;
    } catch (error) {
      logger.error(`Redis LPUSH error for key ${key}:`, error.message);
      return false;
    }
  }

  async lrange(key, start = 0, end = -1) {
    try {
      if (!this.isReady()) return [];
      const values = await this.client.lRange(key, start, end);
      logger.info(`📖 Cache LRANGE: ${key} (${values.length} items)`);
      return values.map(value => JSON.parse(value));
    } catch (error) {
      logger.error(`Redis LRANGE error for key ${key}:`, error.message);
      return [];
    }
  }

  // Cache key generators
  generateUserKey(userId) {
    return `user:${userId}`;
  }

  generateSessionKey(userId) {
    return `session:${userId}`;
  }

  generateTempCodeKey(email, type) {
    return `temp_code:${type}:${email}`;
  }

  generateRateLimitKey(ip, action) {
    return `rate_limit:${action}:${ip}`;
  }

  generateAuthLogKey(userId) {
    return `auth_logs:${userId}`;
  }
}

const redisService = new RedisService();

export default redisService;