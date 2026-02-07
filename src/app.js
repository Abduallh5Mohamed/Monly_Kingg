import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import sellerRoutes from "./modules/sellers/seller.routes.js";
import listingRoutes from "./modules/listings/listing.routes.js";
import healthRoutes from "./routes/health.routes.js";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { globalLimiter } from "./middlewares/rateLimiter.js";
import csrfProtection from "./middlewares/csrf.js";
import compression from "compression";

dotenv.config();
connectDB();

const app = express();

// Compression middleware for better performance
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6 // Balanced compression level
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

app.use(helmet());
if (process.env.NODE_ENV === "production") {
  app.use(helmet.hsts({ maxAge: 31536000 }));
}
app.use(cookieParser());

// Health checks (before rate limiting)
app.use("/", healthRoutes);

app.use(globalLimiter);

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", csrfProtection, userRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/seller", sellerRoutes);
app.use("/api/v1/listings", listingRoutes);

app.get("/", (req, res) => {
  res.send("🚀 Accounts Store API is running...");
});

export default app;
