import express from "express";
import dotenv from "dotenv";
import next from "next";
import { createServer } from "http";
import connectDB from "./src/config/db.js";
import redis from "./src/config/redis.js";
import authRoutes from "./src/modules/auth/auth.routes.js";
import userRoutes from "./src/modules/users/user.routes.js";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { globalLimiter } from "./src/middlewares/rateLimiter.js";
import csrfProtection from "./src/middlewares/csrf.js";
import userCacheService from "./src/services/userCacheService.js";

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

  return true; // Always return true to allow server to start
}

const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;

// Initialize Next.js app
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(async () => {
  // Initialize services first (but don't fail if they're not available)
  await initializeServices();

  const app = express();
  const server = createServer(app);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // NoSQL injection protection
  function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return;
    Object.keys(obj).forEach((key) => {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
        return;
      }
      sanitizeObject(obj[key]);
    });
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

  // Configure helmet for Next.js compatibility
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-eval'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
            "https://fonts.gstatic.com"
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
            "https://fonts.gstatic.com"
          ],
          imgSrc: [
            "'self'",
            "data:",
            "https://placehold.co",
            "https://images.unsplash.com",
            "https://picsum.photos",
            "https://upload.wikimedia.org",
            "https://www.clipartmax.com"
          ],
          fontSrc: [
            "'self'",
            "https://fonts.googleapis.com",
            "https://fonts.gstatic.com"
          ],
          connectSrc: ["'self'"],
        },
      },
    })
  );

  if (process.env.NODE_ENV === "production") {
    app.use(helmet.hsts({ maxAge: 31536000 }));
  }

  app.use(cookieParser());

  // Add request logging
  app.use((req, res, next) => {
    console.log(`📝 ${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
  });

  app.use(globalLimiter);

  // API Routes - These come before Next.js handler
  app.use("/api/auth", authRoutes);
  app.use("/api/v1/auth", authRoutes); // Keep both for compatibility
  app.use("/api/v1/users", csrfProtection, userRoutes);

  // Admin routes (load dynamically to avoid import issues)
  try {
    const { default: adminRoutes } = await import("./src/modules/admin/admin.routes.js");
    app.use("/api/v1/admin", adminRoutes); // No CSRF for admin routes (protected by JWT)
    app.use("/api/admin", adminRoutes); // Keep both for compatibility
  } catch (error) {
    console.warn('⚠️ Admin routes not loaded:', error.message);
  }

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    const cacheStats = await userCacheService.getCacheStats();
    res.json({
      status: "ok",
      message: "🚀 Accounts Store API is running...",
      timestamp: new Date().toISOString(),
      redis: {
        connected: redis.isReady(),
        stats: cacheStats
      }
    });
  });

  // Cache management endpoints
  app.get("/api/cache/stats", async (req, res) => {
    try {
      const stats = await userCacheService.getCacheStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/cache/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      await userCacheService.clearUserCache(userId);
      res.json({ success: true, message: `Cache cleared for user ${userId}` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Handle everything else with Next.js
  app.use((req, res) => {
    return handle(req, res);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`✅ Server running in ${process.env.NODE_ENV || 'development'} mode on port ${port}`);
    console.log(`🌐 Frontend: http://localhost:${port}`);
    console.log(`🔗 API: http://localhost:${port}/api/v1`);
  });
});