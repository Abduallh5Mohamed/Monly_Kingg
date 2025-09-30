import redis from './src/config/redis.js';
import userCacheService from './src/services/userCacheService.js';

console.log('🔍 Redis Cache Monitor - Real-time monitoring');
console.log('===============================================\n');

// Connect to Redis
async function initMonitor() {
  try {
    if (!redis.isReady()) {
      console.log('📡 Connecting to Redis...');
      await redis.connect();
    }
    console.log('✅ Redis connection ready\n');
    return true;
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    return false;
  }
}

// Show cache statistics
async function showCacheStats() {
  try {
    const stats = await userCacheService.getCacheStats();

    console.log('📊 CACHE STATISTICS');
    console.log('─'.repeat(40));
    console.log(`Total Keys: ${stats.totalKeys}`);
    console.log(`👥 Users Cached: ${stats.userKeys}`);
    console.log(`🔑 Active Sessions: ${stats.sessionKeys}`);
    console.log(`📨 Temp Codes: ${stats.tempCodeKeys}`);
    console.log(`⚡ Rate Limits: ${stats.rateLimitKeys}`);
    console.log(`📝 Auth Logs: ${stats.authLogKeys}`);
    console.log(`🟢 Redis Status: ${stats.redisConnected ? 'Connected' : 'Disconnected'}`);
    console.log(`🕐 Timestamp: ${new Date(stats.timestamp).toLocaleString()}`);
    console.log('');

    return stats;
  } catch (error) {
    console.error('❌ Error getting stats:', error.message);
    return null;
  }
}

// Show detailed cache content
async function showCacheDetails() {
  try {
    if (!redis.isReady()) {
      console.log('⚠️ Redis not connected');
      return;
    }

    const client = redis.getClient();
    const allKeys = await client.keys('*');

    if (allKeys.length === 0) {
      console.log('📭 Cache is empty');
      return;
    }

    console.log('🔍 CACHE CONTENTS DETAILS');
    console.log('─'.repeat(50));

    // Group keys by type
    const keyGroups = {
      users: allKeys.filter(k => k.startsWith('user:')),
      sessions: allKeys.filter(k => k.startsWith('session:')),
      tempCodes: allKeys.filter(k => k.startsWith('temp_code:')),
      rateLimits: allKeys.filter(k => k.startsWith('rate_limit:')),
      authLogs: allKeys.filter(k => k.startsWith('auth_logs:'))
    };

    // Show users
    if (keyGroups.users.length > 0) {
      console.log(`\n👥 CACHED USERS (${keyGroups.users.length}):`);
      for (const key of keyGroups.users.slice(0, 5)) {
        try {
          const ttl = await client.ttl(key);
          const type = await client.type(key);

          if (type === 'hash') {
            const userData = await client.hGet(key, 'data');
            if (userData) {
              const user = JSON.parse(userData);
              console.log(`  🔹 ${key}`);
              console.log(`     Email: ${user.email || 'N/A'}`);
              console.log(`     TTL: ${ttl > 0 ? `${Math.floor(ttl / 60)}m` : 'No expiry'}`);
            }
          } else {
            const userData = await client.get(key);
            if (userData) {
              const user = JSON.parse(userData);
              console.log(`  🔹 ${key}`);
              console.log(`     Email: ${user.email || 'N/A'}`);
              console.log(`     TTL: ${ttl > 0 ? `${Math.floor(ttl / 60)}m` : 'No expiry'}`);
            }
          }
        } catch (err) {
          console.log(`  ❌ Error reading ${key}: ${err.message}`);
        }
      }

      if (keyGroups.users.length > 5) {
        console.log(`  ... and ${keyGroups.users.length - 5} more users`);
      }
    }

    // Show sessions
    if (keyGroups.sessions.length > 0) {
      console.log(`\n🔑 ACTIVE SESSIONS (${keyGroups.sessions.length}):`);
      for (const key of keyGroups.sessions.slice(0, 3)) {
        try {
          const ttl = await client.ttl(key);
          console.log(`  🔹 ${key}`);
          console.log(`     TTL: ${ttl > 0 ? `${Math.floor(ttl / 3600)}h` : 'No expiry'}`);
        } catch (err) {
          console.log(`  ❌ Error reading ${key}: ${err.message}`);
        }
      }

      if (keyGroups.sessions.length > 3) {
        console.log(`  ... and ${keyGroups.sessions.length - 3} more sessions`);
      }
    }

    // Show temp codes
    if (keyGroups.tempCodes.length > 0) {
      console.log(`\n📨 TEMP CODES (${keyGroups.tempCodes.length}):`);
      for (const key of keyGroups.tempCodes.slice(0, 3)) {
        try {
          const ttl = await client.ttl(key);
          console.log(`  🔹 ${key}`);
          console.log(`     TTL: ${ttl > 0 ? `${ttl}s` : 'Expired'}`);
        } catch (err) {
          console.log(`  ❌ Error reading ${key}: ${err.message}`);
        }
      }
    }

    console.log('');

  } catch (error) {
    console.error('❌ Error showing cache details:', error.message);
  }
}

// Monitor cache in real-time
async function startRealTimeMonitoring() {
  console.log('🔄 Starting real-time monitoring...');
  console.log('Press Ctrl+C to stop\n');

  let lastStats = null;

  const monitor = async () => {
    console.clear();
    console.log('🔍 Redis Cache Monitor - Live View');
    console.log('===============================================');
    console.log(`🕐 ${new Date().toLocaleString()}\n`);

    const currentStats = await showCacheStats();

    // Show changes since last check
    if (lastStats && currentStats) {
      console.log('📈 CHANGES SINCE LAST CHECK:');
      console.log('─'.repeat(30));

      const changes = {
        totalKeys: currentStats.totalKeys - lastStats.totalKeys,
        userKeys: currentStats.userKeys - lastStats.userKeys,
        sessionKeys: currentStats.sessionKeys - lastStats.sessionKeys,
        tempCodeKeys: currentStats.tempCodeKeys - lastStats.tempCodeKeys
      };

      Object.entries(changes).forEach(([key, change]) => {
        if (change !== 0) {
          const symbol = change > 0 ? '📈' : '📉';
          console.log(`${symbol} ${key}: ${change > 0 ? '+' : ''}${change}`);
        }
      });

      console.log('');
    }

    await showCacheDetails();
    lastStats = currentStats;
  };

  // Initial check
  await monitor();

  // Check every 5 seconds
  setInterval(monitor, 5000);
}

// Main function
async function main() {
  const connected = await initMonitor();

  if (!connected) {
    console.log('❌ Cannot start monitoring - Redis not available');
    process.exit(1);
  }

  // Check if we want real-time monitoring
  const args = process.argv.slice(2);

  if (args.includes('--live') || args.includes('-l')) {
    await startRealTimeMonitoring();
  } else {
    // One-time check
    await showCacheStats();
    await showCacheDetails();

    console.log('💡 TIP: Use "node cache-monitor.js --live" for real-time monitoring');
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Stopping cache monitor...');
  process.exit(0);
});

// Start monitoring
main().catch(console.error);