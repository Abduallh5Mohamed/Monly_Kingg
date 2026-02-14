import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { cacheResponse, invalidateCache } from "../../middlewares/apiCacheMiddleware.js";
import {
  createListing,
  getMyListings,
  getMyListingById,
  updateListing,
  deleteListing,
  getSellerStats,
  getAllListings,
  getListingById,
  browseListings,
  getGamesForFilter,
} from "./listing.controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// إعداد multer لرفع الصور
const uploadsDir = path.join(__dirname, "../../../uploads/listings");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow common image MIME types
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/heic",
    "image/heif"
  ];

  // Also check file extension as fallback
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    console.error(`❌ Invalid file: ${file.originalname} (type: ${file.mimetype})`);
    cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and WEBP images are allowed."));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max per file
});

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files. Maximum is 10 images.' });
    }
    return res.status(400).json({ message: 'File upload error: ' + err.message });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};

// ─── Public routes (no auth) ───
router.get("/browse", cacheResponse(120), browseListings);
router.get("/games", cacheResponse(300), getGamesForFilter);
router.get("/public", cacheResponse(120), getAllListings);

// ─── Protected routes (require authentication) ───
// Must come BEFORE /:id/public to avoid route conflicts
router.post(
  "/",
  authMiddleware,
  upload.fields([
    { name: 'accountImages', maxCount: 10 },
    { name: 'coverImage', maxCount: 1 }
  ]),
  handleMulterError,
  invalidateCache('api_cache:/api/v1/listings/*'),
  createListing
);
router.get("/my-listings", authMiddleware, cacheResponse(60), getMyListings);
router.get("/my-listings/:id", authMiddleware, getMyListingById);
router.get("/stats", authMiddleware, cacheResponse(120), getSellerStats);
router.put("/:id", authMiddleware, invalidateCache('api_cache:/api/v1/listings/*'), updateListing);
router.delete("/:id", authMiddleware, invalidateCache('api_cache:/api/v1/listings/*'), deleteListing);

// Generic routes at the end
router.get("/:id/public", cacheResponse(300), getListingById);

export default router;
