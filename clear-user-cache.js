import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const clearUserCache = async () => {
    const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        retryStrategy: (times) => Math.min(times * 50, 2000)
    });

    try {
        console.log('🔄 Clearing user cache...');

        await redis.del('user:68d8ff2507dbca5b8253d47c.data');
        await redis.del('user:email:baraawael7901@gmail.com');

        console.log('✅ User cache cleared!');

        redis.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        redis.disconnect();
        process.exit(1);
    }
};

clearUserCache();
