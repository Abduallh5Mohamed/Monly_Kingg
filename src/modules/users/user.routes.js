import express from "express";
import * as userController from "./user.controller.js";
import * as profileController from "./profile.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import { validateObjectId } from "../../middlewares/validateObjectId.js";
import { cacheUser, invalidateUserCache, trackActivity } from "../../middlewares/cacheMiddleware.js";
import { cacheResponse, invalidateCache } from "../../middlewares/apiCacheMiddleware.js";
import { userWriteLimiter, uploadLimiter } from "../../middlewares/rateLimiter.js";
import { verifyImageFileType } from "../../middlewares/verifyFileType.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// إعداد multer لرفع الصور
const uploadsDir = path.join(__dirname, "../../../uploads/avatars");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, "avatar-" + crypto.randomUUID() + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only images are allowed."), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// Public seller profile (authenticated users can view any seller)
router.get("/seller/:sellerId", authMiddleware, validateObjectId("sellerId"), cacheResponse(120), profileController.getPublicSellerProfile);

// Profile routes
router.post("/complete-profile", authMiddleware, uploadLimiter, upload.single("avatar"), verifyImageFileType, profileController.completeProfile);
router.get("/profile", authMiddleware, cacheResponse(60), profileController.getProfile);
router.get("/profile/:userId", authMiddleware, validateObjectId("userId"), cacheResponse(60), profileController.getProfile);
router.put(
    "/profile",
    authMiddleware,
    // SECURITY FIX [VULN-04]: Enforce JSON payload size cap on profile updates.
    express.json({ limit: '3mb' }),
    userWriteLimiter,
    invalidateCache('api_cache:*:/api/v1/users/profile*'),
    profileController.updateProfile
);

// Favorites routes
router.post("/favorites", authMiddleware, userWriteLimiter, profileController.addToFavorites);
router.delete("/favorites/:listingId", authMiddleware, validateObjectId("listingId"), userWriteLimiter, profileController.removeFromFavorites);

// Search users (must be authenticated)
router.get("/search", authMiddleware, userWriteLimiter, trackActivity, userController.searchUsers);

// Get user - use cache first (Read-Through)
router.get("/:id", authMiddleware, validateObjectId(), trackActivity, cacheUser, userController.getUser);

// Update user - invalidate cache after (Write-Through)
router.put("/:id", authMiddleware, validateObjectId(), userWriteLimiter, trackActivity, invalidateUserCache, userController.updateUser);

// Delete user - invalidate cache after
router.delete("/:id", authMiddleware, validateObjectId(), roleMiddleware("admin"), userWriteLimiter, invalidateUserCache, userController.deleteUser);

export default router;
