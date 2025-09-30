# 🚨 URGENT SECURITY FIXES - Apply Immediately

## 🔥 **CRITICAL FIXES (Do This Now)**

### 1. **Secure Your Email Credentials**

#### Current Risk:
```env
# ❌ DANGEROUS: Real password exposed in code
SMTP_PASS=thebdtjxrxifnmat
```

#### Fix Now:
1. Go to Gmail → Account Settings → Security → App Passwords
2. Generate app-specific password for "Accounts Store"
3. Replace in .env:
```env
SMTP_PASS=your_16_character_app_password_here
```

### 2. **Secure MongoDB**

#### Current Risk:
```env
# ❌ DANGEROUS: No authentication
MONGO_URI=mongodb://localhost:27017/accountsstore
```

#### Fix Now:
```bash
# 1. Connect to MongoDB
mongo

# 2. Switch to your database
use accountsstore

# 3. Create user
db.createUser({
  user: "accountsuser",
  pwd: "StrongPassword123!@#",
  roles: ["readWrite"]
})

# 4. Update .env
MONGO_URI=mongodb://accountsuser:StrongPassword123!@#@localhost:27017/accountsstore
```

### 3. **Secure Redis**

#### Current Risk:
```env
# ❌ DANGEROUS: No password
REDIS_PASSWORD=
```

#### Fix Now:
```bash
# 1. Set Redis password
docker exec accounts_store_redis redis-cli CONFIG SET requirepass "RedisStrongPass123!"

# 2. Update .env
REDIS_PASSWORD=RedisStrongPass123!

# 3. Restart Redis container to persist
docker restart accounts_store_redis
```

### 4. **Secure Git Repository**

#### Add to .gitignore immediately:
```gitignore
# Environment files
.env
.env.local
.env.production
.env.staging

# Database
*.db
*.sqlite

# Logs
logs/
*.log

# Keys and certificates
*.key
*.pem
*.crt
*.p12

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/settings.json
.idea/
```

#### Remove committed secrets:
```bash
# If you've already committed .env file
git rm --cached .env
git commit -m "Remove environment file from tracking"
```

---

## 🛡️ **ENHANCED SECURITY CONFIGURATION**

### Update Redis Configuration:
```javascript
// src/config/redis.js - Update connection
this.client = createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
  password: process.env.REDIS_PASSWORD,
  database: process.env.REDIS_DB || 0,
  socket: {
    connectTimeout: 5000,
    lazyConnect: true,
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis max reconnection attempts reached');
        return false;
      }
      return Math.min(retries * 100, 3000);
    }
  }
});
```

### Enhanced Environment Variables:
```env
# Updated .env with security
PORT=5000
NODE_ENV=development

# Database (SECURED)
MONGO_URI=mongodb://accountsuser:StrongPassword123!@#@localhost:27017/accountsstore

# JWT Security
JWT_SECRET=your_super_long_random_jwt_secret_here_at_least_32_characters
JWT_ACCESS_EXPIRES=15m
REFRESH_TOKEN_EXPIRES_DAYS=30

# Redis (SECURED)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=RedisStrongPass123!
REDIS_DB=0

# Email (SECURED)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=baraawael7901@gmail.com
SMTP_PASS=your_16_character_app_password_here
EMAIL_FROM="Accounts Store <baraawael7901@gmail.com>"

# Security
BCRYPT_SALT_ROUNDS=12
ACCESS_TOKEN_COOKIE_NAME=access_token
REFRESH_TOKEN_COOKIE_NAME=refresh_token
CSRF_COOKIE_NAME=xsrf_token

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
```

---

## 🔒 **PRODUCTION SECURITY CHECKLIST**

### Before Deployment:
- [ ] **Remove all real passwords from code**
- [ ] **Set strong MongoDB credentials**
- [ ] **Set Redis password**
- [ ] **Use environment-specific .env files**
- [ ] **Enable SSL/TLS in production**
- [ ] **Set secure cookie flags**
- [ ] **Configure firewall rules**
- [ ] **Set up monitoring and alerts**

### Security Headers for Production:
```javascript
// Add to server configuration
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  })
);
```

---

## ⚡ **QUICK SECURITY TEST**

### Test MongoDB Security:
```bash
# Should require authentication
mongo mongodb://localhost:27017/accountsstore
# Should fail without credentials

# Should work with credentials
mongo mongodb://accountsuser:StrongPassword123!@#@localhost:27017/accountsstore
```

### Test Redis Security:
```bash
# Should require password
docker exec accounts_store_redis redis-cli ping
# Should return (error) NOAUTH Authentication required.

# Should work with password
docker exec accounts_store_redis redis-cli -a "RedisStrongPass123!" ping
# Should return PONG
```

---

## 🚨 **EMERGENCY RESPONSE**

### If You Suspect Security Breach:

1. **Immediately revoke all active sessions:**
```bash
# Clear all Redis sessions
docker exec accounts_store_redis redis-cli FLUSHDB
```

2. **Force all users to re-login:**
```bash
# Change JWT secret in .env
JWT_SECRET=new_completely_different_secret_here
```

3. **Check logs for suspicious activity:**
```bash
# Monitor auth logs
docker exec accounts_store_redis redis-cli keys "auth_logs:*"
```

4. **Block suspicious IPs if needed:**
```bash
# Add to rate limiting or firewall
```

---

**🎯 Apply these fixes immediately before continuing development!**