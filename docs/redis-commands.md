# Redis Cache Commands - Copy and paste these in your terminal

# 🔍 CHECK REDIS CONNECTION
docker exec accounts_store_redis redis-cli ping

# 📊 SHOW ALL CACHE KEYS
docker exec accounts_store_redis redis-cli keys "*"

# 👥 SHOW USER CACHE KEYS ONLY
docker exec accounts_store_redis redis-cli keys "user:*"

# 🔑 SHOW SESSION KEYS ONLY  
docker exec accounts_store_redis redis-cli keys "session:*"

# 📨 SHOW TEMP CODE KEYS
docker exec accounts_store_redis redis-cli keys "temp_code:*"

# ⚡ SHOW RATE LIMIT KEYS
docker exec accounts_store_redis redis-cli keys "rate_limit:*"

# 📝 SHOW AUTH LOG KEYS
docker exec accounts_store_redis redis-cli keys "auth_logs:*"

# 🔍 GET SPECIFIC USER DATA (replace USER_ID with actual ID)
docker exec accounts_store_redis redis-cli hgetall "user:USER_ID"

# 🔍 GET USER BY EMAIL (replace EMAIL with actual email)
docker exec accounts_store_redis redis-cli get "user:email:EMAIL"

# 🔍 GET SESSION DATA (replace USER_ID with actual ID)
docker exec accounts_store_redis redis-cli get "session:USER_ID"

# 📨 GET TEMP CODE (replace EMAIL and TYPE)
docker exec accounts_store_redis redis-cli get "temp_code:TYPE:EMAIL"

# 📈 CHECK KEY TTL (Time To Live)
docker exec accounts_store_redis redis-cli ttl "user:USER_ID"

# 🧹 CLEAR SPECIFIC USER CACHE (replace USER_ID)
docker exec accounts_store_redis redis-cli del "user:USER_ID"
docker exec accounts_store_redis redis-cli del "session:USER_ID"

# 🧹 CLEAR ALL CACHE (DANGEROUS!)
# docker exec accounts_store_redis redis-cli flushdb

# 📊 REDIS MEMORY INFO
docker exec accounts_store_redis redis-cli info memory

# 📊 REDIS GENERAL INFO
docker exec accounts_store_redis redis-cli info

# 🔄 MONITOR REAL-TIME REDIS COMMANDS
docker exec accounts_store_redis redis-cli monitor

# 📝 COUNT KEYS BY TYPE
echo "User keys:" && docker exec accounts_store_redis redis-cli eval "return #redis.call('keys', 'user:*')" 0
echo "Session keys:" && docker exec accounts_store_redis redis-cli eval "return #redis.call('keys', 'session:*')" 0
echo "Temp code keys:" && docker exec accounts_store_redis redis-cli eval "return #redis.call('keys', 'temp_code:*')" 0

# 🔍 SEARCH FOR SPECIFIC EMAIL IN CACHE
# docker exec accounts_store_redis redis-cli keys "*EMAIL_HERE*"

# ⏰ SET CUSTOM TTL FOR KEY (replace KEY_NAME and SECONDS)
# docker exec accounts_store_redis redis-cli expire "KEY_NAME" SECONDS

# 💾 GET ALL HASH FIELDS FOR USER
# docker exec accounts_store_redis redis-cli hkeys "user:USER_ID"