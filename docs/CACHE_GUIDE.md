# 🚀 Redis Cache System - Complete Guide

## 🔗 Quick Commands to Check Cache

### 1. Check Redis Connection
```bash
docker exec accounts_store_redis redis-cli ping
```
**Expected Output:** `PONG`

### 2. Monitor Cache in Real-time  
```bash
node cache-monitor.js --live
```

### 3. Check Current Cache Stats (One-time)
```bash
node cache-monitor.js
```

### 4. See All Keys in Cache
```bash
docker exec accounts_store_redis redis-cli keys "*"
```

### 5. Count Each Type of Cached Data
```bash
# Count users
docker exec accounts_store_redis redis-cli eval "return #redis.call('keys', 'user:*')" 0

# Count sessions  
docker exec accounts_store_redis redis-cli eval "return #redis.call('keys', 'session:*')" 0

# Count temp codes
docker exec accounts_store_redis redis-cli eval "return #redis.call('keys', 'temp_code:*')" 0
```

## 📊 API Endpoints for Cache Management

### Get Cache Statistics
```bash
GET http://localhost:5000/api/cache/stats
```

### Clear User Cache
```bash
DELETE http://localhost:5000/api/cache/user/USER_ID
```

### Health Check with Redis Status
```bash
GET http://localhost:5000/api/health
```

## 🔍 How to Verify Cache is Working

### Method 1: Watch Server Logs
When you make requests, look for these log messages:

**Cache Hit (Good!):**
```
⚡ USER CACHE HIT (by email): user@example.com
🎯 Cache HIT: user:email:user@example.com
✅ [LOGIN SUCCESS] user@example.com from CACHE (25ms)
```

**Cache Miss (Normal for first request):**
```
📊 USER CACHE MISS: user@example.com - Querying database
💾 USER CACHED from DB: user@example.com
✅ [LOGIN SUCCESS] user@example.com from DATABASE (150ms)
```

### Method 2: Compare Response Times
- **First login:** 100-300ms (Database)
- **Second login:** 10-50ms (Cache)

### Method 3: Use Redis Monitor
```bash
docker exec accounts_store_redis redis-cli monitor
```
This shows all Redis commands in real-time.

## 🎯 Cache Strategy Explanation

### What Gets Cached:
1. **User Data** - Cached for 1 hour after login/registration
2. **User Sessions** - Cached for 24 hours  
3. **Verification Codes** - Cached for 15 minutes
4. **Rate Limiting** - Cached for 1 hour
5. **Auth Logs** - Last 50 login attempts per user

### Cache-First Pattern:
1. **Request comes in** → Check Redis first
2. **Cache Hit** → Return data immediately (1-5ms)
3. **Cache Miss** → Query database → Cache result → Return data (50-200ms)
4. **Cache Error** → Fallback to database gracefully

## 🔧 Manual Cache Operations

### View Specific User Cache
```bash
# By user ID
docker exec accounts_store_redis redis-cli hgetall "user:USER_ID_HERE"

# By email
docker exec accounts_store_redis redis-cli get "user:email:EMAIL_HERE"
```

### View Session Data
```bash
docker exec accounts_store_redis redis-cli get "session:USER_ID_HERE"
```

### View Temp Codes
```bash
docker exec accounts_store_redis redis-cli get "temp_code:verification:EMAIL_HERE"
docker exec accounts_store_redis redis-cli get "temp_code:reset:EMAIL_HERE"
```

### Clear Specific Cache
```bash
# Clear user cache
docker exec accounts_store_redis redis-cli del "user:USER_ID"
docker exec accounts_store_redis redis-cli del "user:email:EMAIL"

# Clear session
docker exec accounts_store_redis redis-cli del "session:USER_ID"

# Clear temp code
docker exec accounts_store_redis redis-cli del "temp_code:verification:EMAIL"
```

### Emergency: Clear All Cache
```bash
docker exec accounts_store_redis redis-cli flushdb
```
⚠️ **Warning:** This deletes ALL cached data!

## 📈 Performance Monitoring

### Redis Memory Usage
```bash
docker exec accounts_store_redis redis-cli info memory
```

### Key Expiration Times
```bash
# Check TTL (Time To Live) for any key
docker exec accounts_store_redis redis-cli ttl "KEY_NAME"
```

### Cache Hit Rate (Manual Calculation)
Look at your server logs and count:
- Cache HITs vs Cache MISSes
- Target: >80% cache hit rate for optimal performance

## 🛠️ Troubleshooting

### Redis Not Working?
```bash
# Check container status
docker ps | findstr redis

# Restart Redis container
docker restart accounts_store_redis

# Check Redis logs
docker logs accounts_store_redis
```

### Cache Not Updating?
```bash
# Clear specific user cache
docker exec accounts_store_redis redis-cli del "user:USER_ID"

# Or restart server to refresh connections
```

### Performance Issues?
```bash
# Check Redis memory
docker exec accounts_store_redis redis-cli info memory

# Check number of keys
docker exec accounts_store_redis redis-cli dbsize
```

## 🎯 Expected Performance Improvements

With Redis cache active, you should see:

- **Login Speed:** 80-90% faster
- **User Lookups:** 90% faster  
- **Database Load:** 70-80% reduction
- **Response Times:** 10-50ms instead of 100-300ms

## 🔄 Cache Lifecycle

1. **User logs in first time** → Database query → Cache user data
2. **User logs in again** → Cache hit → Instant response
3. **After 1 hour** → Cache expires → Next login goes to database
4. **User data changes** → Cache updated automatically
5. **Server restart** → Cache persists (Redis is separate)

---

**🎉 Your cache system is now fully operational!**

Use the commands above to monitor and verify that your cache is working correctly.