import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import connectDB, { createIndexes } from "./config/db.js";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import sellerRoutes from "./modules/sellers/seller.routes.js";
import listingRoutes from "./modules/listings/listing.routes.js";
import notificationRoutes from "./modules/notifications/notification.routes.js";
import promotionRoutes from "./modules/promotions/promotion.routes.js";
import gamesRoutes from "./modules/games/game.routes.js";
import adsRoutes from "./modules/ads/ad.routes.js";
import discountRoutes from "./modules/discounts/discount.routes.js";
import healthRoutes from "./routes/health.routes.js";
import cacheRoutes from "./routes/cache.routes.js";
import rankingRoutes from "./routes/ranking.routes.js";
import transactionRoutes from "./modules/transactions/transaction.routes.js";
import sellerLevelRoutes from "./modules/seller-levels/sellerLevel.routes.js";
import ticketRoutes from "./modules/tickets/ticket.routes.js";
import sellerRatingRoutes from "./modules/ratings/sellerRating.routes.js";
import { startAutoConfirmJob } from "./jobs/autoConfirmTransactions.js";
import { startPayoutReleaseJob } from "./jobs/sellerPayoutRelease.js";
import { startTransactionWorkers } from "./workers/transactionWorker.js";
import { runStartupRecovery } from "./jobs/startupRecovery.js";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { globalLimiter } from "./middlewares/rateLimiter.js";
import csrfProtection from "./middlewares/csrf.js";
import compression from "compression";
import passport from "./config/passport.js";
import crypto from "crypto";
import { authMiddleware } from "./middlewares/authMiddleware.js";
import logger from "./utils/logger.js";

// Import models to ensure they are registered with Mongoose
import "./modules/chats/chat.model.js";
import "./modules/users/user.model.js";
import "./modules/ratings/sellerRating.model.js";
import "./modules/ratings/commentPenalty.model.js";
import "./modules/admin/securityEvent.model.js";
import "./modules/admin/blockedIP.model.js";
import "./modules/admin/auditLog.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsDir = path.join(__dirname, "../uploads");

dotenv.config();

// Connect to database and create indexes after models are registered
connectDB().then(() => {
  createIndexes();
  startAutoConfirmJob();
  startPayoutReleaseJob();
  startTransactionWorkers();
  // Delay recovery scan slightly to allow models/connections to fully initialize
  setTimeout(runStartupRecovery, 5000);
});

const app = express();

const SAFE_UPLOAD_FILENAME_REGEX = /^[a-zA-Z0-9._-]+$/;

function getSafeUploadFilename(rawFilename) {
  const filename = path.basename(rawFilename || "");
  // SECURITY FIX: [HIGH-05] Reject suspicious filenames even after basename normalization.
  if (!SAFE_UPLOAD_FILENAME_REGEX.test(filename) || filename.includes('..')) {
    return null;
  }
  return filename;
}

const parsedProxyHops = Number.parseInt(process.env.PROXY_HOPS || "0", 10);
if (Number.isInteger(parsedProxyHops) && parsedProxyHops > 0) {
  app.set("trust proxy", parsedProxyHops);
  logger.info(`Express trust proxy enabled with ${parsedProxyHops} hop(s)`);
} else {
  app.set("trust proxy", false);
}

// Compression middleware for better performance
app.use(compression({
  filter: (req, res) => {
    // SECURITY FIX: [LOW-04] Remove client-controlled compression bypass header.
    return compression.filter(req, res);
  },
  level: 4, // Fast compression
  threshold: 1024, // Only compress responses > 1KB
}));

// Payload limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// SECURITY FIX: [HIGH-05] Enforce accepted content types for state-changing requests.
app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH"].includes(req.method) && req.headers["content-type"]) {
    const contentType = req.headers["content-type"];
    const isAllowed =
      contentType.includes("application/json") ||
      contentType.includes("multipart/form-data") ||
      contentType.includes("application/x-www-form-urlencoded");

    if (!isAllowed) {
      return res.status(415).json({ message: "Unsupported Media Type" });
    }
  }
  return next();
});

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

const getAllowedOrigins = () => {
  if (process.env.NODE_ENV === "production") {
    if (!process.env.ALLOWED_ORIGINS) {
      throw new Error("FATAL: ALLOWED_ORIGINS must be set in production");
    }
    return process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim()).filter(Boolean);
  }
  return ["http://localhost:3000", "http://localhost:5000"];
};

const allowedOrigins = getAllowedOrigins();
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN', 'X-Idempotency-Key']
};
app.use(cors(corsOptions));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || "http://localhost:3000"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  permittedCrossDomainPolicies: false,
}));

app.use((req, res, next) => {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
});

app.use(cookieParser());
app.use(passport.initialize());

// SECURITY FIX: [HIGH-04] Replace open static serving with validated file handlers.
app.get('/uploads/listings/:filename', (req, res) => {
  const filename = getSafeUploadFilename(req.params.filename);
  if (!filename) {
    return res.status(400).json({ message: 'Invalid filename' });
  }

  const filePath = path.join(uploadsDir, 'listings', filename);
  return res.sendFile(filePath, (err) => {
    if (err) {
      return res.status(404).json({ message: 'File not found' });
    }
    return undefined;
  });
});

// SECURITY FIX: [HIGH-04] Replace open static serving for /other with validated file handler.
app.get('/uploads/other/:filename', (req, res) => {
  const filename = getSafeUploadFilename(req.params.filename);
  if (!filename) {
    return res.status(400).json({ message: 'Invalid filename' });
  }

  const filePath = path.join(uploadsDir, 'other', filename);
  return res.sendFile(filePath, (err) => {
    if (err) {
      return res.status(404).json({ message: 'File not found' });
    }
    return undefined;
  });
});

app.get('/uploads/receipts/:filename', authMiddleware, async (req, res) => {
  try {
    const filename = getSafeUploadFilename(req.params.filename);
    if (!filename) {
      return res.status(400).json({ message: 'Invalid filename' });
    }
    const isAdmin = req.user.role === 'admin' || req.user.role === 'moderator';

    if (!isAdmin) {
      const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const Deposit = (await import('./modules/deposits/deposit.model.js')).default;
      const deposit = await Deposit.findOne({
        user: req.user._id,
        receiptImage: { $regex: escaped }
      }).lean();

      if (!deposit) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const filePath = path.join(uploadsDir, 'receipts', filename);
    return res.sendFile(filePath);
  } catch (_err) {
    return res.status(404).json({ message: 'File not found' });
  }
});

app.get('/uploads/tickets/:filename', authMiddleware, async (req, res) => {
  try {
    const filename = getSafeUploadFilename(req.params.filename);
    if (!filename) {
      return res.status(400).json({ message: 'Invalid filename' });
    }
    const isAdmin = req.user.role === 'admin' || req.user.role === 'moderator';

    if (!isAdmin) {
      const Ticket = (await import('./modules/tickets/ticket.model.js')).default;
      const ticket = await Ticket.findOne({
        user: req.user._id,
        'messages.attachments.fileName': filename
      }).lean();

      if (!ticket) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const filePath = path.join(uploadsDir, 'tickets', filename);
    return res.sendFile(filePath);
  } catch (_err) {
    return res.status(404).json({ message: 'File not found' });
  }
});

// Health checks (before rate limiting)
app.use("/", healthRoutes);

app.use(globalLimiter);

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/v1/users", csrfProtection, userRoutes);
// SECURITY FIX: [CRIT-01] Add CSRF protection to sensitive admin routes.
app.use("/api/v1/admin", csrfProtection, adminRoutes);
// SECURITY FIX: [CRIT-01] Keep direct admin seller-level mount protected.
app.use("/api/v1/admin/seller-levels", csrfProtection, sellerLevelRoutes);
// SECURITY FIX: [CRIT-01] Add CSRF protection to seller routes.
app.use("/api/v1/seller", csrfProtection, sellerRoutes);
app.use("/api/v1/listings", csrfProtection, listingRoutes);
app.use("/api/v1/promotions", csrfProtection, promotionRoutes);
// SECURITY FIX: [CRIT-01] Add CSRF protection to notification routes.
app.use("/api/v1/notifications", csrfProtection, notificationRoutes);
app.use("/api/v1/games", gamesRoutes);
app.use("/api/v1/ads", adsRoutes);
app.use("/api/v1/discounts", csrfProtection, discountRoutes);
app.use("/api/v1/rankings", rankingRoutes);
app.use("/api/v1/cache", cacheRoutes);
// SECURITY FIX: [CRIT-01] Add CSRF protection to transaction routes.
app.use("/api/v1/transactions", csrfProtection, transactionRoutes);
// SECURITY FIX: [CRIT-01] Add CSRF protection to ticket routes.
app.use("/api/v1/tickets", csrfProtection, ticketRoutes);
// SECURITY FIX: [CRIT-01] Add CSRF protection to rating routes.
app.use("/api/v1/ratings", csrfProtection, sellerRatingRoutes);

// Convert invalid ObjectId cast failures into clean 400 responses.
app.use((err, req, res, next) => {
  if (err.name === "CastError" && err.kind === "ObjectId") {
    return res.status(400).json({ success: false, message: "Invalid ID format" });
  }
  next(err);
});

app.get("/", (req, res) => {
  res.send("🚀 Accounts Store API is running...");
});

export default app;
