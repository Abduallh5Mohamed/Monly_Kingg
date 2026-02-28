import express from "express";
import dotenv from "dotenv";
import next from "next";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import connectDB from "./src/config/db.js";
import redis from "./src/config/redis.js";
import authRoutes from "./src/modules/auth/auth.routes.js";
import userRoutes from "./src/modules/users/user.routes.js";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import { globalLimiter } from "./src/middlewares/rateLimiter.js";
import csrfProtection from "./src/middlewares/csrf.js";
import { enhancedSanitizer } from "./src/middlewares/securityMiddleware.js";
import { authMiddleware } from "./src/middlewares/authMiddleware.js";
import cacheService from "./src/services/cacheService.js";
import { createIndexes } from "./src/config/db.js";
import {
  responseTimeTracker,
  optimizationHeaders,
  keepAlive,
  memoryMonitor
} from "./src/middlewares/performanceMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Initialize services
async function initializeServices() {
  let mongoConnected = false;
  let redisConnected = false;

  try {
    // Try to connect to MongoDB
    console.log('🔄 Attempting to connect to MongoDB...');
    await connectDB();
    mongoConnected = true;
  } catch (error) {
    console.warn('⚠️ MongoDB connection failed:', error.message);
    console.log('📝 Server will run without MongoDB (Frontend-only mode)');
  }

  try {
    // Try to connect to Redis
    console.log('🔄 Attempting to connect to Redis...');
    redisConnected = await redis.connect();
  } catch (error) {
    console.warn('⚠️ Redis connection failed:', error.message);
    console.log('📝 Server will run without Redis (No caching)');
  }

  if (mongoConnected && redisConnected) {
    console.log('✅ All services initialized successfully');
  } else if (mongoConnected || redisConnected) {
    console.log('⚠️ Server running with partial services');
    if (mongoConnected) console.log('  ✓ MongoDB: Connected');
    else console.log('  ✗ MongoDB: Disconnected (Frontend-only mode)');
    if (redisConnected) console.log('  ✓ Redis: Connected');
    else console.log('  ✗ Redis: Disconnected (No caching)');
  } else {
    console.log('⚠️ Server running in Frontend-only mode (No Backend services)');
    console.log('📱 Perfect for Frontend development!');
  }

  // Start memory monitoring
  memoryMonitor();
  console.log('📊 Performance monitoring enabled');

  return true; // Always return true to allow server to start
}

const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 5000;

// Initialize Next.js app
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(async () => {
  // Initialize services first (but don't fail if they're not available)
  await initializeServices();

  const app = express();
  const server = createServer(app);

  // Set server timeouts for better performance and reliability
  server.timeout = 60000; // 60 seconds timeout
  server.keepAliveTimeout = 65000; // 65 seconds (longer than timeout)
  server.headersTimeout = 66000; // Slightly longer than keepAliveTimeout

  // Silence Chrome DevTools .well-known probe
  app.use('/.well-known', (req, res) => res.status(204).end());

  // Increase payload limit for image uploads (base64) — but limit to 10MB to prevent abuse
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ✅ SECURITY: NoSQL injection protection (deep recursive, handles arrays + prototype pollution)
  function sanitizeObject(obj, depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 10) return;
    if (Array.isArray(obj)) {
      obj.forEach((item, i) => {
        if (typeof item === 'string' && item.startsWith('$')) { obj[i] = ''; return; }
        sanitizeObject(item, depth + 1);
      });
      return;
    }
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$') || key.includes('.') || key === '__proto__' || key === 'constructor' || key === 'prototype') {
        delete obj[key];
        continue;
      }
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key], depth + 1);
      }
    }
  }

  app.use((req, res, next) => {
    try {
      sanitizeObject(req.body);
      sanitizeObject(req.query);
      sanitizeObject(req.params);
    } catch (err) {
      // non-fatal: continue request
    }
    next();
  });

  const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com']
      : true,
    credentials: true,
    optionsSuccessStatus: 200
  };
  app.use(cors(corsOptions));

  // ✅ SECURITY: Configure helmet for comprehensive security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: dev
            ? ["'self'", "'unsafe-eval'", "'unsafe-inline'"]  // Required for Next.js dev mode
            : ["'self'", "'unsafe-inline'"],                    // Production: no eval
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
            "https://fonts.gstatic.com"
          ],
          imgSrc: [
            "'self'",
            "data:",
            "blob:",
            "https://placehold.co",
            "https://images.unsplash.com",
            "https://picsum.photos",
            "https://upload.wikimedia.org",
            "https://www.clipartmax.com",
            "https://api.dicebear.com"
          ],
          fontSrc: [
            "'self'",
            "https://fonts.googleapis.com",
            "https://fonts.gstatic.com"
          ],
          connectSrc: ["'self'", "ws:", "wss:"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],                   // Prevent base tag hijacking
          formAction: ["'self'"],                // Restrict form submissions
          upgradeInsecureRequests: [],
        },
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      hidePoweredBy: true,
    })
  );

  if (process.env.NODE_ENV === "production") {
    // HSTS already configured in helmet above
  }

  app.use(cookieParser());

  // Performance monitoring — skip for static assets & Next.js internals
  app.use((req, res, next) => {
    // /_next/static/ → content-hashed chunks: safe to cache immutably (production only)
    // In dev mode, use no-cache to avoid browser caching 404s from on-demand compilation
    if (req.path.startsWith('/_next/static/') || req.path.startsWith('/assets/')) {
      res.setHeader('Cache-Control', dev ? 'no-cache, must-revalidate' : 'public, max-age=31536000, immutable');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Keep-Alive', 'timeout=5');
      return next();
    }
    // Static file extensions (fonts, images) also get long-term cache
    if (req.path.match(/\.(ico|png|jpg|jpeg|gif|svg|woff2?|ttf|eot|webp|avif)$/)) {
      res.setHeader('Cache-Control', dev ? 'no-cache, must-revalidate' : 'public, max-age=31536000, immutable');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Keep-Alive', 'timeout=5');
      return next();
    }
    // /_next/webpack-hmr, /_next/data/, /_next/image/ → must NOT be cached
    // These are dynamic: HMR events, RSC payloads, on-demand images
    if (req.path.startsWith('/_next/')) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Keep-Alive', 'timeout=5');
      return next();
    }
    next();
  });
  // Only run perf tracking on API and page routes
  app.use('/api', responseTimeTracker);
  app.use(optimizationHeaders);
  app.use(keepAlive);

  // Enable gzip compression for responses (60-80% reduction)
  app.use(compression({
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
    level: 4,
    threshold: 1024,
  }));

  // Serve static files from uploads directory with security headers
  const uploadsPath = path.join(__dirname, 'uploads');
  app.use('/uploads', (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day for uploaded files
    next();
  }, express.static(uploadsPath), async (req, res, next) => {
    // Fallback: if file not found in root, search subdirectories
    const fileName = path.basename(req.path);
    const fs = await import('fs');
    const subdirs = ['ads', 'other', 'avatars', 'listings', 'receipts'];
    for (const dir of subdirs) {
      const filePath = path.join(uploadsPath, dir, fileName);
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
    }
    next();
  });
  console.log('✅ Serving static uploads from:', uploadsPath);

  // Rate limit only API routes (not static assets or Next.js pages)
  app.use('/api', globalLimiter);

  // ✅ SECURITY: DOMPurify-based XSS sanitization — only on API mutations (not GETs/static)
  app.use('/api', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    return enhancedSanitizer(req, res, next);
  });

  // ✅ SECURITY: CSRF protection on all API mutation routes
  app.use('/api', csrfProtection);

  // ── Load all routes in parallel for faster startup ──
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", userRoutes);

  const routeModules = await Promise.allSettled([
    import("./src/modules/uploads/upload.routes.js"),
    import("./src/modules/chats/chat.routes.js"),
    import("./src/modules/admin/admin.routes.js"),
    import("./src/modules/sellers/seller.routes.js"),
    import("./src/modules/listings/listing.routes.js"),
    import("./src/modules/games/game.routes.js"),
    import("./src/modules/withdrawals/withdrawal.routes.js"),
    import("./src/modules/deposits/deposit.routes.js"),
    import("./src/modules/notifications/notification.routes.js"),
    import("./src/modules/ads/ad.routes.js"),
    import("./src/modules/discounts/discount.routes.js"),
    import("./src/modules/promotions/promotion.routes.js"),
    import("./src/modules/transactions/transaction.routes.js"),
    import("./src/modules/campaigns/campaign.routes.js"),
  ]);

  const routePaths = [
    "/api/v1/uploads", "/api/v1/chats", "/api/v1/admin",
    "/api/v1/seller", "/api/v1/listings", "/api/v1/games",
    "/api/v1/withdrawals", "/api/v1/deposits", "/api/v1/notifications",
    "/api/v1/ads", "/api/v1/discounts", "/api/v1/promotions",
    "/api/v1/transactions", "/api/v1/campaigns",
  ];

  routeModules.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      app.use(routePaths[i], result.value.default);
    } else {
      console.warn(`⚠️ ${routePaths[i]} not loaded: ${result.reason?.message}`);
    }
  });

  // Health check endpoint (basic info only — no sensitive data)
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString()
    });
  });

  // Cache management endpoints (require auth + admin role)
  app.get("/api/cache/stats", authMiddleware, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
    try {
      const stats = await cacheService.getCacheStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/cache/user/:userId", authMiddleware, async (req, res) => {
    if (req.user?.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
    try {
      const { userId } = req.params;
      await cacheService.clearUserCache(userId);
      res.json({ success: true, message: `Cache cleared for user ${userId}` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Global error handler middleware (must be before Next.js handler)
  app.use((err, req, res, next) => {
    // Log the error
    console.error('[ERROR]', err.message);

    // Handle MongoDB duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0];
      return res.status(400).json({
        message: field === 'email' ? 'Email already registered' : `${field} already exists`
      });
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message });
    }

    // Handle specific error messages
    const message = err.message || 'An error occurred';
    const statusCode = err.statusCode || 500;

    // Return JSON error response
    res.status(statusCode).json({
      message,
    });
  });

  // Handle everything else with Next.js
  app.use((req, res) => {
    return handle(req, res);
  });

  // Handle port already in use error
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${port} is already in use!`);
      console.log('\n💡 Solutions:');
      console.log('   1. Run: npm run cleanup');
      console.log('   2. Or manually kill the process using port 5000');
      console.log('   3. Or change PORT in .env file\n');
      process.exit(1);
    } else {
      throw error;
    }
  });

  server.listen(port, async (err) => {
    if (err) throw err;

    // Initialize Socket.IO
    try {
      const socketService = (await import("./src/services/socketService.js")).default;
      socketService.initialize(server);
      console.log('🔌 Socket.IO initialized for real-time chat');
    } catch (error) {
      console.warn('⚠️ Socket.IO not initialized:', error.message);
    }

    // ✅ Create database indexes (critical for performance)
    try {
      await createIndexes();
    } catch (error) {
      console.warn('⚠️ Index creation skipped:', error.message);
    }

    // Start cache cleanup job
    try {
      const cacheCleanupJob = (await import("./src/jobs/cacheCleanupJob.js")).default;
      cacheCleanupJob.start();
      console.log('🧹 Cache cleanup job started (runs every 6 hours)');
    } catch (error) {
      console.warn('⚠️ Cache cleanup job not started:', error.message);
    }

    console.log(`✅ Server running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
    console.log(`🌐 Frontend: http://localhost:${port}`);
    console.log(`🔗 API: http://localhost:${port}/api/v1`);
    console.log(`💬 Socket.IO: ws://localhost:${port}`);
    console.log(`\n✨ Press CTRL+C to stop\n`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n\n[${signal}] Received shutdown signal...`);

    try {
      console.log('🔌 Closing Socket.IO connections...');
      const socketService = (await import("./src/services/socketService.js")).default;
      if (socketService && socketService.io) {
        socketService.io.close();
      }

      console.log('🛑 Stopping cache cleanup job...');
      const cacheCleanupJob = (await import("./src/jobs/cacheCleanupJob.js")).default;
      if (cacheCleanupJob) {
        cacheCleanupJob.stop();
      }

      console.log('📡 Closing server...');
      server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);

    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
});