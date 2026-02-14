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
  updateListing,
  deleteListing,
  getSellerStats,
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
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and WEBP are allowed."));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max per file
});

// ─── Public routes (no auth) ─── 
router.get("/browse", cacheResponse(120), browseListings);
router.get("/games", cacheResponse(300), getGamesForFilter);

// All routes below require authentication
router.post(
  "/",
  authMiddleware,
  upload.fields([
    { name: 'accountImages', maxCount: 10 },
    { name: 'coverImage', maxCount: 1 }
  ]),
  invalidateCache('api_cache:/api/v1/listings/*'),
  createListing
);
router.get("/my-listings", authMiddleware, cacheResponse(60), getMyListings); // Cache for 1 minute
router.get("/stats", authMiddleware, cacheResponse(120), getSellerStats); // Cache for 2 minutes
router.put("/:id", authMiddleware, invalidateCache('api_cache:/api/v1/listings/*'), updateListing);
router.delete("/:id", authMiddleware, invalidateCache('api_cache:/api/v1/listings/*'), deleteListing);

export default router;
