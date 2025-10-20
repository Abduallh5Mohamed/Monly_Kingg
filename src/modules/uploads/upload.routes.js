import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import * as uploadController from "./upload.controller.js";
import { protect } from "../../middlewares/authMiddleware.js";
import { requireAdmin } from "../../middlewares/roleMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// إنشاء مجلد uploads إن لم يكن موجود
const uploadsDir = path.join(__dirname, "../../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// إعداد multer للتخزين
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // إنشاء مجلدات فرعية حسب النوع
    const type = req.body.type || "other";
    const typeDir = path.join(uploadsDir, type);

    if (!fs.existsSync(typeDir)) {
      fs.mkdirSync(typeDir, { recursive: true });
    }

    cb(null, typeDir);
  },
  filename: function (req, file, cb) {
    // إنشاء اسم ملف فريد
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  }
});

// فلترة أنواع الملفات المسموحة
const fileFilter = (req, file, cb) => {
  // أنواع الملفات المسموحة
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "video/mp4",
    "video/webm",
    "audio/mpeg",
    "audio/wav"
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images, videos, audio, and PDFs are allowed."), false);
  }
};

// إعداد multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

// Routes

/**
 * POST /api/v1/uploads
 * رفع ملف جديد
 * يتطلب: authentication
 */
router.post("/", protect, upload.single("file"), uploadController.uploadFile);

/**
 * GET /api/v1/uploads
 * GET /api/v1/uploads/user/:userId
 * جلب ملفات المستخدم
 * يتطلب: authentication
 */
router.get("/", protect, uploadController.getUserUploads);
router.get("/user/:userId", protect, uploadController.getUserUploads);

/**
 * GET /api/v1/uploads/:id
 * جلب ملف واحد
 * يتطلب: authentication
 */
router.get("/:id", protect, uploadController.getUploadById);

/**
 * DELETE /api/v1/uploads/:id
 * حذف ملف
 * يتطلب: authentication
 */
router.delete("/:id", protect, uploadController.deleteUpload);

/**
 * PATCH /api/v1/uploads/:id/status
 * تحديث حالة الملف (للأدمن فقط)
 * يتطلب: authentication + admin role
 */
router.patch("/:id/status", protect, requireAdmin, uploadController.updateUploadStatus);

/**
 * GET /api/v1/uploads/related/:model/:id
 * جلب الملفات المرتبطة بموديل معين
 * يتطلب: authentication
 */
router.get("/related/:model/:id", protect, uploadController.getRelatedUploads);

export default router;
