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

  // Performance monitoring
  app.use(responseTimeTracker);
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
  }, express.static(uploadsPath));
  console.log('✅ Serving static uploads from:', uploadsPath);

  app.use(globalLimiter);

  // ✅ SECURITY: DOMPurify-based XSS sanitization on all requests
  app.use(enhancedSanitizer);

  // ✅ SECURITY: CSRF protection on all API mutation routes
  app.use('/api', csrfProtection);

  // API Routes - These come before Next.js handler
  app.use("/api/auth", authRoutes);
  app.use("/api/v1/auth", authRoutes); // Keep both for compatibility
  app.use("/api/v1/users", userRoutes);

  // Upload routes
  try {
    const { default: uploadRoutes } = await import("./src/modules/uploads/upload.routes.js");
    app.use("/api/v1/uploads", uploadRoutes);
    console.log('✅ Upload routes loaded');
  } catch (error) {
    console.warn('⚠️ Upload routes not loaded:', error.message);
  }

  // Chat routes (no CSRF for Socket.IO compatibility)
  try {
    const { default: chatRoutes } = await import("./src/modules/chats/chat.routes.js");
    app.use("/api/v1/chats", chatRoutes);
    console.log('✅ Chat routes loaded');
  } catch (error) {
    console.warn('⚠️ Chat routes not loaded:', error.message);
  }

  // Admin routes (load dynamically to avoid import issues)
  try {
    const { default: adminRoutes } = await import("./src/modules/admin/admin.routes.js");
    app.use("/api/v1/admin", adminRoutes);
    app.use("/api/admin", adminRoutes);
  } catch (error) {
    console.warn('⚠️ Admin routes not loaded:', error.message);
  }

  // Seller routes
  try {
    const { default: sellerRoutes } = await import("./src/modules/sellers/seller.routes.js");
    app.use("/api/v1/seller", sellerRoutes);
    console.log('✅ Seller routes loaded');
  } catch (error) {
    console.warn('⚠️ Seller routes not loaded:', error.message);
  }

  // Listing routes
  try {
    const { default: listingRoutes } = await import("./src/modules/listings/listing.routes.js");
    app.use("/api/v1/listings", listingRoutes);
    console.log('✅ Listing routes loaded');
  } catch (error) {
    console.warn('⚠️ Listing routes not loaded:', error.message);
  }

  // Games routes
  try {
    const { default: gamesRoutes } = await import("./src/modules/games/game.routes.js");
    app.use("/api/v1/games", gamesRoutes);
    console.log('✅ Games routes loaded');
  } catch (error) {
    console.warn('⚠️ Games routes not loaded:', error.message);
  }

  // Withdrawal routes
  try {
    const { default: withdrawalRoutes } = await import("./src/modules/withdrawals/withdrawal.routes.js");
    app.use("/api/v1/withdrawals", withdrawalRoutes);
    console.log('✅ Withdrawal routes loaded');
  } catch (error) {
    console.warn('⚠️ Withdrawal routes not loaded:', error.message);
  }

  // Deposit routes
  try {
    const { default: depositRoutes } = await import("./src/modules/deposits/deposit.routes.js");
    app.use("/api/v1/deposits", depositRoutes);
    console.log('✅ Deposit routes loaded');
  } catch (error) {
    console.warn('⚠️ Deposit routes not loaded:', error.message);
  }

  // Notification routes
  try {
    const { default: notificationRoutes } = await import("./src/modules/notifications/notification.routes.js");
    app.use("/api/v1/notifications", notificationRoutes);
    console.log('✅ Notification routes loaded');
  } catch (error) {
    console.warn('⚠️ Notification routes not loaded:', error.message);
  }

  // Ads routes
  try {
    const { default: adRoutes } = await import("./src/modules/ads/ad.routes.js");
    app.use("/api/v1/ads", adRoutes);
    console.log('✅ Ads routes loaded');
  } catch (error) {
    console.warn('⚠️ Ads routes not loaded:', error.message);
  }

  // Discount routes
  try {
    const { default: discountRoutes } = await import("./src/modules/discounts/discount.routes.js");
    app.use("/api/v1/discounts", discountRoutes);
    console.log('✅ Discount routes loaded');
  } catch (error) {
    console.warn('⚠️ Discount routes not loaded:', error.message);
  }

  // Promotion routes
  try {
    const { default: promotionRoutes } = await import("./src/modules/promotions/promotion.routes.js");
    app.use("/api/v1/promotions", promotionRoutes);
    console.log('✅ Promotion routes loaded');
  } catch (error) {
    console.warn('⚠️ Promotion routes not loaded:', error.message);
  }

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