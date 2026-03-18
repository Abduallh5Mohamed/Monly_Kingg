import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { validateObjectId } from "../../middlewares/validateObjectId.js";
import { cacheResponse, invalidateCache } from "../../middlewares/apiCacheMiddleware.js";
import { listingWriteLimiter, uploadLimiter } from "../../middlewares/rateLimiter.js";
import { verifyImageFileType } from "../../middlewares/verifyFileType.js";
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
    // SECURITY FIX [VULN-C02]: Use crypto.randomBytes() instead of Math.random() for unpredictable filenames.
    // SECURITY FIX [VULN-C03]: Use MIME-based extension instead of trusting user-supplied extension.
    const uniqueSuffix = Date.now() + "-" + crypto.randomBytes(8).toString('hex');
    const SAFE_EXTENSIONS = {
      'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png',
      'image/gif': '.gif', 'image/webp': '.webp'
    };
    const ext = SAFE_EXTENSIONS[file.mimetype] || '.bin';
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  // SECURITY FIX [VULN-C03]: Only allow by MIME type — never trust the user-supplied extension.
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp"
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and WEBP images are allowed."));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  // SECURITY FIX [L-02]: Enforce per-file and total-file count caps for listing uploads.
  limits: { fileSize: 5 * 1024 * 1024, files: 11 }
});

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files. Maximum is 11 files total.' });
    }
    return res.status(400).json({ message: 'File upload error: ' + err.message });
  }
  if (err) {
    return res.status(400).json({ message: 'File upload failed. Please check your file and try again.' });
  }
  next();
};

// ─── Public routes (no auth) ───
router.get("/browse", cacheResponse(120), browseListings);
router.get("/games", cacheResponse(300), getGamesForFilter);
router.get("/public", cacheResponse(120), getAllListings);

// ─── Protected routes (require authentication) ───
// Must come BEFORE /:id/public to avoid route conflicts
// Cache key format: api_cache:{userId}:{url}  → wildcard pattern: api_cache:*:/api/v1/listings*
const LISTING_CACHE_PATTERN = 'api_cache:*:/api/v1/listings*';

router.post(
  "/",
  authMiddleware,
  listingWriteLimiter,
  uploadLimiter,
  upload.fields([
    { name: 'accountImages', maxCount: 10 },
    { name: 'coverImage', maxCount: 1 }
  ]),
  handleMulterError,
  // SECURITY FIX [C-04]: Verify actual file contents via magic bytes.
  verifyImageFileType,
  invalidateCache(LISTING_CACHE_PATTERN),
  createListing
);
router.get("/my-listings", authMiddleware, cacheResponse(60), getMyListings);
router.get("/my-listings/:id", authMiddleware, validateObjectId(), getMyListingById);
router.get("/stats", authMiddleware, cacheResponse(60), getSellerStats);
router.put("/:id", authMiddleware, validateObjectId(), listingWriteLimiter, invalidateCache(LISTING_CACHE_PATTERN), updateListing);
router.delete("/:id", authMiddleware, validateObjectId(), listingWriteLimiter, invalidateCache(LISTING_CACHE_PATTERN), deleteListing);

// Generic routes at the end
router.get("/:id/public", validateObjectId(), cacheResponse(120), getListingById);

export default router;
