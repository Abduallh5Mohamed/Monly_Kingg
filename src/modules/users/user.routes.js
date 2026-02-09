import express from "express";
import * as userController from "./user.controller.js";
import * as profileController from "./profile.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import { cacheUser, invalidateUserCache, trackActivity } from "../../middlewares/cacheMiddleware.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";

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
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, "avatar-" + uniqueSuffix + ext);
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

// Profile routes
router.post("/complete-profile", authMiddleware, upload.single("avatar"), profileController.completeProfile);
router.get("/profile", authMiddleware, profileController.getProfile);
router.get("/profile/:userId", authMiddleware, profileController.getProfile);
router.put("/profile", authMiddleware, profileController.updateProfile);

// Favorites routes
router.post("/favorites", authMiddleware, profileController.addToFavorites);
router.delete("/favorites/:listingId", authMiddleware, profileController.removeFromFavorites);

// Search users (must be authenticated)
router.get("/search", authMiddleware, trackActivity, userController.searchUsers);

// Get user - use cache first (Read-Through)
router.get("/:id", authMiddleware, trackActivity, cacheUser, userController.getUser);

// Update user - invalidate cache after (Write-Through)
router.put("/:id", authMiddleware, trackActivity, invalidateUserCache, userController.updateUser);

// Delete user - invalidate cache after
router.delete("/:id", authMiddleware, roleMiddleware("admin"), invalidateUserCache, userController.deleteUser);

export default router;
