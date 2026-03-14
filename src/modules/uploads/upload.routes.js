import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import * as uploadController from "./upload.controller.js";
import { protect } from "../../middlewares/authMiddleware.js";
import { requireAdmin } from "../../middlewares/roleMiddleware.js";
import { uploadLimiter, userWriteLimiter, adminLimiter } from "../../middlewares/rateLimiter.js";
import { verifyImageOrPdfFileType } from "../../middlewares/verifyFileType.js";
import { validateObjectId } from "../../middlewares/validateObjectId.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

const ALLOWED_UPLOAD_TYPES = [
  "profile_picture",
  "payment_proof",
  "account_image",
  "chat_media",
  "ticket_attachment",
  "ads",
  "other"
];

const getSafeUploadType = (value) => {
  // SECURITY FIX [H-05]: Strict upload type allowlist to prevent path traversal.
  return ALLOWED_UPLOAD_TYPES.includes(value) ? value : "other";
};

// إنشاء مجلد uploads إن لم يكن موجود
const uploadsDir = path.join(__dirname, "../../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// إعداد multer للتخزين
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // إنشاء مجلدات فرعية حسب النوع
    const type = getSafeUploadType(req.body.type);
    req.body.type = type;
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

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf"
];

// فلترة أولية مبنية على MIME ثم تأكيد المحتوى عبر magic bytes بعد الرفع
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images and PDFs are allowed."), false);
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
router.post("/", protect, uploadLimiter, upload.single("file"), verifyImageOrPdfFileType, uploadController.uploadFile);

/**
 * GET /api/v1/uploads
 * GET /api/v1/uploads/user/:userId
 * جلب ملفات المستخدم
 * يتطلب: authentication
 */
router.get("/", protect, uploadController.getUserUploads);
router.get("/user/:userId", protect, validateObjectId("userId"), uploadController.getUserUploads);

/**
 * GET /api/v1/uploads/:id
 * جلب ملف واحد
 * يتطلب: authentication
 */
router.get("/:id", protect, validateObjectId(), uploadController.getUploadById);

/**
 * DELETE /api/v1/uploads/:id
 * حذف ملف
 * يتطلب: authentication
 */
router.delete("/:id", protect, validateObjectId(), userWriteLimiter, uploadController.deleteUpload);

/**
 * PATCH /api/v1/uploads/:id/status
 * تحديث حالة الملف (للأدمن فقط)
 * يتطلب: authentication + admin role
 */
router.patch("/:id/status", protect, validateObjectId(), requireAdmin, adminLimiter, uploadController.updateUploadStatus);

/**
 * GET /api/v1/uploads/related/:model/:id
 * جلب الملفات المرتبطة بموديل معين
 * يتطلب: authentication
 */
router.get("/related/:model/:id", protect, validateObjectId("id"), uploadController.getRelatedUploads);

export default router;
