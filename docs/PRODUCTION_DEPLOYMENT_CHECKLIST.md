# 🚀 Production Deployment Checklist

## ⚠️ **قبل ما تعمل Deploy - مهم جداً!**

---

## 📋 **Pre-Deployment Security**

### 🔴 **CRITICAL - احذف هذه الملفات:**

```bash
# في PowerShell - احذف test files
Remove-Item create-load-test-users.js
Remove-Item create-test-users.js
Remove-Item unlock-user.js
Remove-Item clear-user-cache.js
Remove-Item test-*.js
Remove-Item *-load-test.js
Remove-Item quick-*.js
Remove-Item verify-*.js
Remove-Item system-capacity-test.js
Remove-Item simple-test-server.js
Remove-Item load-test-monitor.js
Remove-Item cache-monitor.js
```

**Status:** [ ] Done

---

### 🗄️ **Database Cleanup:**

```bash
# امسح test users
node -e "
const mongoose = require('mongoose');
mongoose.connect('YOUR_MONGO_URI').then(async () => {
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const result = await User.deleteMany({ 
        email: { \$regex: '(loadtest|test).*@test\\.(com|local)' } 
    });
    console.log('Deleted test users:', result.deletedCount);
    process.exit(0);
});
"
```

**Status:** [ ] Done  
**Users Deleted:** _______

---

## 🔐 **Environment Variables**

### .env File Setup:

```bash
# 1. Create production .env
cp .env.example .env

# 2. Update values:
NODE_ENV=production
PORT=5000

# 3. Strong secrets (use random generator)
JWT_SECRET=<64-character-random-string>
JWT_REFRESH_SECRET=<64-character-random-string>

# 4. Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/accountsstore?retryWrites=true&w=majority

# 5. Redis
REDIS_URL=redis://:password@your-redis-host:6379
REDIS_PASSWORD=<strong-password>

# 6. Email (SendGrid/SES)
EMAIL_FROM=noreply@yourdomain.com
SENDGRID_API_KEY=<your-key>

# 7. CORS
CLIENT_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# 8. Rate Limiting
RATE_LIMIT_MAX=10000
RATE_LIMIT_WINDOW_MS=900000
```

**Status:** [ ] Done

---

### Generate Strong Secrets:

```bash
# Generate JWT secrets (64 chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**JWT_SECRET:** [ ] Generated  
**JWT_REFRESH_SECRET:** [ ] Generated  
**REDIS_PASSWORD:** [ ] Generated

---

## 📦 **Dependencies**

### Clean Install:

```bash
# 1. Remove node_modules
Remove-Item -Recurse -Force node_modules

# 2. Install production only
npm ci --only=production

# 3. Security audit
npm audit

# 4. Fix vulnerabilities
npm audit fix
```

**Status:** [ ] Done  
**Vulnerabilities:** [ ] None / [ ] Fixed

---

### Required Dependencies Check:

```json
{
  "@socket.io/redis-adapter": "✓",
  "bcrypt": "✓",
  "compression": "✓",
  "cors": "✓",
  "dotenv": "✓",
  "express": "✓",
  "express-mongo-sanitize": "✓",
  "express-rate-limit": "✓",
  "helmet": "✓",
  "ioredis": "✓",
  "jsonwebtoken": "✓",
  "mongoose": "✓",
  "socket.io": "✓"
}
```

**Status:** [ ] All installed

---

## 🛡️ **Security Configuration**

### 1. MongoDB Security:

```javascript
// src/config/db.js
- [✓] Connection pooling enabled (100 max)
- [✓] SSL/TLS enabled in production
- [ ] IP Whitelist configured
- [ ] Database authentication enabled
- [ ] Network encryption enabled
```

**MongoDB Atlas Settings:**
- [ ] IP Whitelist: Add server IP
- [ ] Database User: Strong password
- [ ] Network Access: Restrict to server only
- [ ] Backup: Enabled

---

### 2. Redis Security:

```bash
# Redis configuration
- [ ] requirepass enabled
- [ ] bind to localhost or private IP
- [ ] Protected mode on
- [ ] Rename dangerous commands
```

**Redis Cloud Settings:**
- [ ] Password set
- [ ] SSL enabled
- [ ] ACL configured

---

### 3. Rate Limiting:

```javascript
// src/middlewares/rateLimiter.js
✓ Global: 10,000 req/15min
✓ Auth: 100 req/15min
✓ Login: 20 req/15min
✓ Sensitive: 5 req/15min
```

**Status:** [ ] Verified

---

### 4. CORS Configuration:

```javascript
// src/app.js
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true,
  optionsSuccessStatus: 200
};
```

**Status:** [ ] Updated with production domain

---

### 5. Helmet Security Headers:

```javascript
// src/app.js
✓ XSS Protection
✓ No Sniff
✓ Frame Guard
✓ HSTS
✓ Content Security Policy
```

**Status:** [ ] Enabled

---

## 🔧 **Application Configuration**

### PM2 Setup:

```bash
# 1. Install PM2 globally
npm install -g pm2

# 2. Start with ecosystem
pm2 start ecosystem.config.cjs --env production

# 3. Setup startup script
pm2 startup

# 4. Save process list
pm2 save

# 5. Monitor
pm2 monit
```

**Status:** [ ] Done

---

### PM2 Configuration Check:

```javascript
// ecosystem.config.cjs
- [✓] instances: 'max'
- [✓] exec_mode: 'cluster'
- [✓] max_memory_restart: '1G'
- [✓] env_production configured
- [ ] log files configured
```

---

## 🌐 **Server Configuration**

### Nginx (Optional - Reverse Proxy):

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**Status:** [ ] Configured / [ ] Not using Nginx

---

### SSL Certificate:

```bash
# Using Let's Encrypt (Certbot)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Status:** [ ] SSL Certificate installed

---

## 🔍 **Monitoring Setup**

### Health Checks:

```bash
# Test endpoints
curl https://yourdomain.com/health
curl https://yourdomain.com/ready
curl https://yourdomain.com/alive
curl https://yourdomain.com/metrics
```

**Status:** [ ] All responding 200 OK

---

### Logging:

```javascript
// PM2 Logs
pm2 logs --lines 100

// Error logs location
logs/error.log
logs/combined.log
```

**Status:** [ ] Logs reviewed

---

### Monitoring Tools:

- [ ] PM2 monitoring: `pm2 monit`
- [ ] Server metrics: CPU, RAM, Disk
- [ ] Database monitoring: MongoDB Atlas
- [ ] Redis monitoring: Redis Cloud
- [ ] Application logs: Centralized logging

---

## 🧪 **Pre-Launch Testing**

### Smoke Tests:

```bash
# 1. Health check
curl https://yourdomain.com/health

# 2. Register user
curl -X POST https://yourdomain.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#","username":"testuser"}'

# 3. Login
curl -X POST https://yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername":"test@example.com","password":"Test123!@#"}'

# 4. Test WebSocket
# Use socket.io client or browser
```

**Status:** 
- [ ] Health check passed
- [ ] Registration works
- [ ] Login works
- [ ] Email sent
- [ ] WebSocket connected

---

### Load Testing (Production):

```bash
# Small load test (100 users)
# Run from external server, not production
npx artillery quick --count 100 --num 10 https://yourdomain.com/health
```

**Status:** [ ] Load test passed

---

## 📊 **Performance Verification**

### Expected Metrics:

```
✓ Response time: < 500ms
✓ Success rate: > 99%
✓ CPU usage: < 70%
✓ Memory usage: < 80%
✓ Database connections: < 80/100
```

**Actual Metrics:**
- Response time: ______ ms
- Success rate: ______ %
- CPU: ______ %
- Memory: ______ %

---

## 🔄 **Backup & Recovery**

### Database Backup:

```bash
# MongoDB Atlas: Automatic backups enabled
- [ ] Daily backups: ON
- [ ] Point-in-time recovery: ON
- [ ] Backup retention: 7 days minimum

# Manual backup
mongodump --uri="YOUR_MONGO_URI" --out=backup-$(date +%Y%m%d)
```

**Status:** [ ] Backups configured

---

### Disaster Recovery Plan:

1. **Database Failure:**
   - [ ] Restore from latest backup
   - [ ] Test recovery process

2. **Server Failure:**
   - [ ] PM2 auto-restart configured
   - [ ] Multiple server instances (optional)

3. **Redis Failure:**
   - [ ] App continues (fallback mode)
   - [ ] Redis persistence enabled

---

## 📝 **Documentation**

### Required Docs:

- [✓] SECURITY_WARNING.md - Security guidelines
- [✓] PERFORMANCE_OPTIMIZATIONS.md - Performance details
- [✓] PRODUCTION_DEPLOYMENT_CHECKLIST.md - This file
- [ ] API_DOCUMENTATION.md - API endpoints
- [ ] RUNBOOK.md - Operations guide

**Status:** [ ] All docs updated

---

## 🚀 **Deployment Steps**

### Final Deployment:

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm ci --only=production

# 3. Run migrations (if any)
# npm run migrate

# 4. Start with PM2
pm2 start ecosystem.config.cjs --env production

# 5. Verify
pm2 status
pm2 logs --lines 50

# 6. Test
curl https://yourdomain.com/health
```

**Status:** [ ] Deployed successfully

---

## ✅ **Post-Deployment Verification**

### Immediate Checks (within 1 hour):

- [ ] Application started successfully
- [ ] All PM2 processes running
- [ ] No errors in logs
- [ ] Health endpoints responding
- [ ] Database connected
- [ ] Redis connected
- [ ] WebSocket working
- [ ] Email sending works
- [ ] Frontend can connect

### 24-Hour Checks:

- [ ] No memory leaks
- [ ] No error spikes
- [ ] Performance stable
- [ ] All features working
- [ ] User registrations working
- [ ] Login flow working
- [ ] Password reset working

### Weekly Checks:

- [ ] Review error logs
- [ ] Check security alerts
- [ ] Update dependencies
- [ ] Review performance metrics
- [ ] Database optimization

---

## 🚨 **Emergency Contacts**

### Rollback Procedure:

```bash
# If something goes wrong
pm2 stop all

# Revert to previous version
git checkout <previous-commit>
npm ci --only=production
pm2 start ecosystem.config.cjs --env production
```

---

## 📞 **Support Checklist**

### Before Going Live:

- [ ] Team trained on deployment
- [ ] Monitoring alerts configured
- [ ] Backup procedure tested
- [ ] Rollback procedure tested
- [ ] Emergency contacts ready
- [ ] Documentation complete

---

## 🎯 **Final Sign-Off**

**Deployment Date:** ______________

**Deployed By:** ______________

**Verified By:** ______________

**Production URL:** https://______________

**Status:** [ ] 🟢 Ready for Production

---

## 📌 **Quick Reference**

### Key Commands:

```bash
# Start
pm2 start ecosystem.config.cjs --env production

# Stop
pm2 stop all

# Restart
pm2 restart all

# Logs
pm2 logs

# Monitor
pm2 monit

# Status
pm2 status

# Health check
curl https://yourdomain.com/health
```

---

**Last Updated:** December 2024  
**Version:** 1.0  
**Status:** 🔴 **Review before deployment**

**⚠️ CRITICAL: Delete all test files before deploying!**
