import redis from '../config/redis.js';
import logger from '../utils/logger.js';
import User from '../modules/users/user.model.js';

class CacheSyncService {
    constructor() {
        this.TTL = {
            user: 3600,
            profile: 1800,
            balance: 300,
            stats: 600
        };
    }

    async getUserWithSync(userId) {
        try {
            const cacheKey = `user:${userId}`;
            let userData = await redis.get(cacheKey);

            if (userData) {
                logger.info(`✅ Cache HIT: ${cacheKey}`);
                return userData;
            }

            logger.info(`❌ Cache MISS: ${cacheKey}`);
            const user = await User.findById(userId).lean();

            if (user) {
                await this.syncUserToCache(user);
                return user;
            }

            return null;
        } catch (error) {
            logger.error(`getUserWithSync error: ${error.message}`);
            return await User.findById(userId).lean();
        }
    }

    async syncUserToCache(user) {
        try {
            const userId = (user._id || user.id).toString();
            const userData = typeof user.toObject === 'function' ? user.toObject() : { ...user };

            delete userData.passwordHash;
            delete userData.refreshTokens;
            delete userData.authLogs;
            delete userData.__v;
            delete userData.verificationCode;
            delete userData.verificationCodeValidation;
            delete userData.forgotPasswordCode;
            delete userData.forgotPasswordCodeValidation;
            delete userData.twoFA;

            await redis.set(`user:${userId}`, userData, this.TTL.user);

            if (userData.email) {
                await redis.set(`user:email:${userData.email}`, userData, this.TTL.user);
            }

            logger.info(`💾 Synced user ${userId} to cache`);
            return true;
        } catch (error) {
            logger.error(`syncUserToCache error: ${error.message}`);
            return false;
        }
    }

    async updateUserWithSync(userId, updates) {
        try {
            const updatedUser = await User.findByIdAndUpdate(userId, updates, {
                new: true,
                runValidators: true
            });

            if (updatedUser) {
                await this.syncUserToCache(updatedUser);

                window?.dispatchEvent?.(new Event('userDataUpdated'));

                return updatedUser;
            }

            return null;
        } catch (error) {
            logger.error(`updateUserWithSync error: ${error.message}`);
            throw error;
        }
    }

    async updateBalanceWithSync(userId, balanceChange, reason = 'balance update') {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new Error('User not found');
            }

            const oldBalance = user.wallet.balance || 0;
            user.wallet.balance = (user.wallet.balance || 0) + balanceChange;

            await user.save();

            await this.syncUserToCache(user);

            logger.info(`💰 Balance updated for user ${userId}: ${oldBalance} → ${user.wallet.balance} (${reason})`);

            return user;
        } catch (error) {
            logger.error(`updateBalanceWithSync error: ${error.message}`);
            throw error;
        }
    }

    async updateStatsWithSync(userId, statsUpdates) {
        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new Error('User not found');
            }

            Object.assign(user.stats, statsUpdates);
            await user.save();

            await this.syncUserToCache(user);

            logger.info(`📊 Stats updated for user ${userId}`);

            return user;
        } catch (error) {
            logger.error(`updateStatsWithSync error: ${error.message}`);
            throw error;
        }
    }

    async invalidateUserCache(userId, email = null) {
        try {
            const ops = [
                redis.del(`user:${userId}`),
                redis.del(`session:${userId}`)
            ];

            if (email) {
                ops.push(redis.del(`user:email:${email}`));
            }

            await Promise.allSettled(ops);

            logger.info(`🗑️ Cache invalidated for user ${userId}`);
            return true;
        } catch (error) {
            logger.error(`invalidateUserCache error: ${error.message}`);
            return false;
        }
    }

    async validateCacheConsistency(userId) {
        try {
            const cacheKey = `user:${userId}`;
            const cachedData = await redis.get(cacheKey);
            const dbData = await User.findById(userId).lean();

            if (!dbData) {
                if (cachedData) {
                    await this.invalidateUserCache(userId);
                    logger.warn(`⚠️ Stale cache deleted for user ${userId}`);
                }
                return { consistent: true, action: 'deleted_stale' };
            }

            if (!cachedData) {
                await this.syncUserToCache(dbData);
                logger.info(`🔄 Cache rebuilt for user ${userId}`);
                return { consistent: false, action: 'rebuilt' };
            }

            const cacheBalance = cachedData.wallet?.balance || 0;
            const dbBalance = dbData.wallet?.balance || 0;

            if (cacheBalance !== dbBalance) {
                await this.syncUserToCache(dbData);
                logger.warn(`⚠️ Cache inconsistency fixed for user ${userId}: cache=${cacheBalance}, db=${dbBalance}`);
                return { consistent: false, action: 'fixed', difference: dbBalance - cacheBalance };
            }

            return { consistent: true };
        } catch (error) {
            logger.error(`validateCacheConsistency error: ${error.message}`);
            return { consistent: false, error: error.message };
        }
    }

    async bulkSyncUsers(userIds) {
        try {
            const users = await User.find({ _id: { $in: userIds } }).lean();

            const syncPromises = users.map(user => this.syncUserToCache(user));
            const results = await Promise.allSettled(syncPromises);

            const succeeded = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            logger.info(`📦 Bulk sync: ${succeeded} succeeded, ${failed} failed`);

            return { succeeded, failed, total: userIds.length };
        } catch (error) {
            logger.error(`bulkSyncUsers error: ${error.message}`);
            throw error;
        }
    }

    async getCacheStats() {
        try {
            if (!redis.isReady()) {
                return { error: 'Redis not connected' };
            }

            const client = redis.getClient();
            const keys = await client.keys('user:*');
            const emailKeys = await client.keys('user:email:*');

            return {
                totalUserKeys: keys.length,
                emailKeys: emailKeys.length,
                redisConnected: true,
                timestamp: new Date()
            };
        } catch (error) {
            logger.error(`getCacheStats error: ${error.message}`);
            return { error: error.message };
        }
    }
}

const cacheSyncService = new CacheSyncService();
export default cacheSyncService;
