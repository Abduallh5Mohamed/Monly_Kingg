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
      const redisPassword = process.env.REDIS_PASSWORD || '';

      // Create config with password if available
      const redisConfig = {
        socket: {
          host: redisHost,
          port: parseInt(redisPort),
          connectTimeout: 5000,
          keepAlive: 5000,
          noDelay: true,
          reconnectStrategy: (retries) => {
            if (retries > 10) return new Error('Redis max retries reached');
            return Math.min(retries * 500, 5000);
          }
        },
        database: redisDb
      };

      // Add password if provided
      if (redisPassword) {
        redisConfig.password = redisPassword;
      }

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

      // Connect with timeout
      const connectPromise = this.client.connect();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Redis connection timed out after 5 seconds')), 5000)
      );
      await Promise.race([connectPromise, timeoutPromise]);

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
          this.client.disconnect();
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
      if (!this.isReady()) return null;
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis GET error for key ${key}: ${error.message}`);
      return null;
    }
  }

  // Batch GET — fetch multiple keys in a single round-trip (MGET)
  async getMulti(keys) {
    try {
      if (!this.isReady() || !keys.length) return {};
      const values = await this.client.mGet(keys);
      const result = {};
      keys.forEach((key, i) => {
        result[key] = values[i] ? JSON.parse(values[i]) : null;
      });
      return result;
    } catch (error) {
      logger.error(`Redis MGET error: ${error.message}`);
      return {};
    }
  }

  async set(key, value, expirationInSeconds = 3600) {
    try {
      if (!this.isReady()) return false;
      await this.client.setEx(key, expirationInSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}: ${error.message}`);
      return false;
    }
  }

  async del(key) {
    try {
      if (!this.isReady()) return false;
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}: ${error.message}`);
      return false;
    }
  }

  async exists(key) {
    try {
      if (!this.isReady()) return false;
      return (await this.client.exists(key)) === 1;
    } catch (error) {
      return false;
    }
  }

  // Hash operations for complex objects
  async hset(key, field, value, expirationInSeconds = 3600) {
    try {
      if (!this.isReady()) return false;
      await this.client.hSet(key, field, JSON.stringify(value));
      await this.client.expire(key, expirationInSeconds);
      return true;
    } catch (error) {
      logger.error(`Redis HSET error for key ${key}: ${error.message}`);
      return false;
    }
  }

  async hget(key, field) {
    try {
      if (!this.isReady()) return null;
      const value = await this.client.hGet(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Redis HGET error for key ${key}: ${error.message}`);
      return null;
    }
  }

  async hgetall(key) {
    try {
      if (!this.isReady()) return {};
      const value = await this.client.hGetAll(key);
      if (Object.keys(value).length > 0) {
        const parsed = {};
        for (const [field, val] of Object.entries(value)) {
          parsed[field] = JSON.parse(val);
        }
        return parsed;
      }
      return {};
    } catch (error) {
      logger.error(`Redis HGETALL error for key ${key}: ${error.message}`);
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
      return value;
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}: ${error.message}`);
      return 0;
    }
  }

  // List operations for logs
  async lpush(key, value, maxLength = 100) {
    try {
      if (!this.isReady()) return false;
      await this.client.lPush(key, JSON.stringify(value));
      await this.client.lTrim(key, 0, maxLength - 1);
      return true;
    } catch (error) {
      logger.error(`Redis LPUSH error for key ${key}: ${error.message}`);
      return false;
    }
  }

  async lrange(key, start = 0, end = -1) {
    try {
      if (!this.isReady()) return [];
      const values = await this.client.lRange(key, start, end);
      return values.map(value => JSON.parse(value));
    } catch (error) {
      logger.error(`Redis LRANGE error for key ${key}: ${error.message}`);
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