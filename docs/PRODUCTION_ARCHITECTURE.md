# Production Architecture for 200k Concurrent Users

## 📊 System Design Overview

This document outlines the complete production architecture required to handle 200,000+ concurrent users with low latency (<300ms p95) and high availability (99.9% uptime).

---

## 🏗️ Architecture Components

### 1. Application Layer (Node.js Cluster)

#### Recommended Setup
- **Instances**: 10-15 Node.js servers (or containers)
- **CPU/Memory per instance**: 8-16 vCPU, 32-64GB RAM
- **Concurrent connections per instance**: 15,000-20,000 WebSocket connections
- **Total capacity**: 10 × 20k = 200k concurrent users

#### Configuration
```bash
# PM2 Cluster Mode (on each server)
pm2 start ecosystem.config.js --env production

# Or with specific instance count
pm2 start ecosystem.config.js -i 8
```

#### Vertical Scaling (per instance)
- Node.js heap: 4GB (`--max-old-space-size=4096`)
- ulimit increase: `ulimit -n 65536` (file descriptors)
- TCP tuning (Linux):
  ```bash
  sudo sysctl -w net.core.somaxconn=4096
  sudo sysctl -w net.ipv4.tcp_max_syn_backlog=8192
  sudo sysctl -w net.ipv4.ip_local_port_range="10000 65535"
  ```

---

### 2. Load Balancer (NGINX / HAProxy)

#### Why Needed
- Distribute traffic across Node instances
- SSL/TLS termination
- Sticky sessions for Socket.IO
- Rate limiting and DDoS protection

#### NGINX Configuration
Location: `/etc/nginx/nginx.conf`

```nginx
upstream backend {
    # IP hash for sticky sessions (Socket.IO requirement)
    ip_hash;
    
    server 10.0.1.10:5000 weight=1 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:5000 weight=1 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:5000 weight=1 max_fails=3 fail_timeout=30s;
    server 10.0.1.13:5000 weight=1 max_fails=3 fail_timeout=30s;
    server 10.0.1.14:5000 weight=1 max_fails=3 fail_timeout=30s;
    # Add more servers as needed
    
    keepalive 300; # Keep connections alive
}

server {
    listen 80;
    listen 443 ssl http2;
    server_name accounts-store.example.com;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=10r/m;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Client limits
    client_max_body_size 10M;
    client_body_buffer_size 128k;
    
    # Timeouts
    proxy_connect_timeout 90s;
    proxy_send_timeout 90s;
    proxy_read_timeout 90s;
    
    # WebSocket upgrade headers
    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Socket.IO specific
        proxy_buffering off;
        proxy_cache off;
    }
    
    # API routes
    location /api/ {
        limit_req zone=api_limit burst=50 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }
    
    # Login endpoint (stricter rate limit)
    location /api/v1/auth/login {
        limit_req zone=login_limit burst=5 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files (Next.js, uploads)
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Caching for static assets
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Health check (bypass rate limit)
    location /api/health {
        proxy_pass http://backend;
        access_log off;
    }
}
```

---

### 3. Redis Cluster

#### Why Cluster Mode
- Single Redis can't handle 200k Socket.IO connections
- Need horizontal scaling for memory and throughput
- High availability with automatic failover

#### Recommended Setup
- **Mode**: Redis Cluster or Redis Sentinel
- **Nodes**: 6 nodes (3 masters + 3 replicas)
- **Memory per master**: 16-32GB
- **Total memory**: ~50-100GB for session data + Socket.IO adapter

#### Configuration (Redis Cluster)
```bash
# redis.conf (on each node)
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
maxmemory 16gb
maxmemory-policy allkeys-lru
save ""
appendonly yes
appendfsync everysec
```

#### Application Connection (Node.js)
```javascript
// src/config/redis.js
import Redis from 'ioredis';

const redis = new Redis.Cluster([
  { host: '10.0.2.10', port: 6379 },
  { host: '10.0.2.11', port: 6379 },
  { host: '10.0.2.12', port: 6379 },
], {
  redisOptions: {
    password: process.env.REDIS_PASSWORD,
  },
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
});
```

#### Managed Alternatives
- **AWS ElastiCache** (Redis Cluster mode)
- **Google Cloud Memorystore** (Redis cluster tier)
- **Azure Cache for Redis** (Premium tier with clustering)

---

### 4. MongoDB Cluster

#### Recommended Setup
- **Architecture**: Replica Set (3 nodes minimum)
- **Sharding**: Plan for future if data > 500GB
- **Connection Pool**: 100-200 per Node instance

#### Replica Set Configuration
```javascript
// MongoDB connection in src/config/db.js
const mongoURI = process.env.MONGO_URI || 
  'mongodb://mongo1:27017,mongo2:27017,mongo3:27017/accountsstore?replicaSet=rs0&readPreference=secondaryPreferred';

mongoose.connect(mongoURI, {
  maxPoolSize: 150, // Connection pool per instance
  minPoolSize: 50,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4
  retryWrites: true,
  w: 'majority',
  readPreference: 'secondaryPreferred', // Read from secondaries for GET requests
});
```

#### Indexes (Critical for Performance)
Already added in `user.model.js`:
- ✅ `{ email: 1 }` (unique, sparse)
- ✅ `{ verificationCode: 1 }`
- ✅ `{ passwordResetToken: 1 }`
- ✅ `{ 'refreshTokens.token': 1 }`
- ✅ `{ role: 1 }`
- ✅ `{ isOnline: 1, lastSeenAt: -1 }`

#### Managed Alternatives
- **MongoDB Atlas** (M40+ tier with replica set)
- **AWS DocumentDB** (MongoDB-compatible)

---

### 5. File Storage (S3 + CDN)

#### Why S3 Instead of Local Disk
- Node instances are stateless (can scale horizontally)
- CDN reduces latency globally
- No disk I/O bottleneck
- Automatic backup and versioning

#### AWS S3 Setup
```bash
# Install AWS SDK
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer-s3
```

#### Updated Upload Controller
```javascript
// src/modules/uploads/upload.controller.js
import { S3Client } from '@aws-sdk/client-s3';
import multerS3 from 'multer-s3';
import multer from 'multer';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    acl: 'private',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const type = req.body.type || 'other';
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `${type}/${uniqueSuffix}-${file.originalname}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
```

#### CloudFront CDN
- Create CloudFront distribution pointing to S3 bucket
- Use signed URLs for private files (payment proofs)
- Public assets (profile pics) can use public CDN

---

### 6. Background Jobs (BullMQ)

#### Why Needed
- Email sending blocks event loop (SMTP takes 100-500ms)
- Image processing (resize, watermark) is CPU-intensive
- Payment verification requires external API calls

#### Setup
```bash
npm install bullmq
```

#### Configuration
```javascript
// src/queues/emailQueue.js
import { Queue, Worker } from 'bullmq';
import redis from '../config/redis.js';

export const emailQueue = new Queue('emails', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// Worker (can run on separate servers)
const worker = new Worker('emails', async (job) => {
  const { to, subject, html } = job.data;
  await sendEmail(to, subject, html);
}, { connection: redis });
```

#### Usage in Controllers
```javascript
// Instead of await sendEmail(...) - which blocks
await emailQueue.add('verification', {
  to: user.email,
  subject: 'Verify Email',
  html: emailTemplate,
});
```

---

### 7. Monitoring & Observability

#### Metrics to Track
- **Application**: RPS, p50/p95/p99 latency, error rate, active connections
- **System**: CPU, memory, disk I/O, network throughput
- **Database**: Query time, connection pool usage, slow queries
- **Redis**: Memory usage, commands/sec, keyspace hits/misses
- **Socket.IO**: Connected clients, messages/sec, disconnect rate

#### Prometheus + Grafana Setup
```bash
npm install prom-client
```

```javascript
// src/middlewares/metrics.js
import promClient from 'prom-client';

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 200, 300, 500, 1000, 2000, 5000],
  registers: [register],
});

export const socketConnections = new promClient.Gauge({
  name: 'socket_io_connected_clients',
  help: 'Number of connected Socket.IO clients',
  registers: [register],
});

export const dbQueryDuration = new promClient.Histogram({
  name: 'mongodb_query_duration_ms',
  help: 'Duration of MongoDB queries in ms',
  labelNames: ['collection', 'operation'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000],
  registers: [register],
});

export { register };
```

#### Expose /metrics endpoint
```javascript
// In server-integrated.js
import { register } from './src/middlewares/metrics.js';

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## 💰 Cost Estimation (Monthly)

### AWS Example (200k concurrent users)

| Component | Spec | Quantity | Unit Cost | Total |
|-----------|------|----------|-----------|-------|
| EC2 (c5.2xlarge) | 8 vCPU, 16GB | 10 instances | $250/mo | $2,500 |
| ElastiCache Redis | cache.r6g.xlarge | 6 nodes | $200/mo | $1,200 |
| MongoDB Atlas | M40 (Replica Set) | 3 nodes | $600/mo | $1,800 |
| S3 Storage | 1TB + requests | - | $50/mo | $50 |
| CloudFront CDN | 5TB transfer | - | $400/mo | $400 |
| Load Balancer (ALB) | Application LB | 1 | $30/mo | $30 |
| Data Transfer | Outbound | ~10TB | $900/mo | $900 |
| Monitoring (Datadog) | Infrastructure | - | $500/mo | $500 |
| **TOTAL** | | | | **~$7,380/mo** |

### Self-Hosted Alternative (~40% cheaper)
- Rent dedicated servers (Hetzner, OVH): ~$3,000/mo
- Self-managed MongoDB + Redis: ~$1,000/mo
- S3 alternative (Backblaze B2): ~$100/mo
- **Total**: ~$4,500/mo

---

## 🚀 Deployment Checklist

### Pre-Production
- [ ] Load test with 10k → 50k → 100k → 200k users
- [ ] Measure p95 latency, error rate, memory leaks
- [ ] Set up monitoring dashboards (Grafana)
- [ ] Configure alerts (CPU > 80%, p95 > 500ms, errors > 1%)
- [ ] Document runbooks for common issues

### Infrastructure
- [ ] Provision servers/containers
- [ ] Set up Redis cluster (6 nodes)
- [ ] Set up MongoDB replica set (3 nodes)
- [ ] Configure NGINX load balancer
- [ ] Set up S3 + CloudFront
- [ ] Configure SSL certificates (Let's Encrypt)

### Application
- [ ] Enable compression middleware ✅
- [ ] Add .lean() to Mongoose queries ✅
- [ ] Move uploads to S3
- [ ] Set up BullMQ for background jobs
- [ ] Add Prometheus metrics
- [ ] Configure PM2 cluster mode ✅

### Security
- [ ] Enable rate limiting (NGINX + Express)
- [ ] Set up WAF (CloudFlare or AWS WAF)
- [ ] Configure CORS properly
- [ ] Rotate secrets (JWT, Redis password)
- [ ] Set up automated backups (MongoDB, Redis)

### Monitoring
- [ ] Prometheus + Grafana dashboards
- [ ] Uptime monitoring (UptimeRobot, Pingdom)
- [ ] Error tracking (Sentry)
- [ ] Log aggregation (ELK stack or Datadog)

---

## 📈 Scaling Beyond 200k

### Horizontal Scaling
- Add more Node.js instances (auto-scaling group)
- Scale Redis cluster (add more shards)
- MongoDB sharding for collections > 500GB

### Geographic Distribution
- Deploy in multiple regions (US, EU, Asia)
- Use GeoDNS to route users to nearest region
- Cross-region Redis and MongoDB replication

### Microservices (Long-term)
- Split auth, chat, payments into separate services
- Use message queue (Kafka, RabbitMQ) for inter-service communication
- Independent scaling per service

---

## 🔗 Related Documents
- [LOAD_TEST_GUIDE.md](./LOAD_TEST_GUIDE.md) - Load testing scripts
- [PERFORMANCE_GUIDE.md](./PERFORMANCE_GUIDE.md) - Performance optimizations
- [SECURITY.md](./SECURITY.md) - Security best practices
- [MONGODB_SETUP.md](./MONGODB_SETUP.md) - MongoDB configuration

---

**Last Updated**: 2025-10-20  
**Target Capacity**: 200,000 concurrent users  
**Architecture**: Distributed, horizontally scalable, cloud-native
