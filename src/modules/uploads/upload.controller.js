import Upload from "./upload.model.js";
import path from "path";
import fs from "fs/promises";
import logger from "../../utils/logger.js";
import { safePaginate } from "../../utils/pagination.js";

const ALLOWED_UPLOAD_TYPES = new Set([
  "profile_picture",
  "payment_proof",
  "account_image",
  "chat_media",
  "ticket_attachment",
  "ads",
  "other"
]);

/**
 * رفع ملف جديد
 */
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    const { type, relatedModel, relatedId } = req.body;
    const file = req.file;
    // SECURITY FIX [H-05]: Whitelist upload types to avoid path traversal via req.body.type.
    const subDir = ALLOWED_UPLOAD_TYPES.has(type) ? type : "other";

    // إنشاء سجل في قاعدة البيانات
    const upload = await Upload.create({
      type: subDir,
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      filePath: file.path,
      url: `/uploads/${subDir}/${file.filename}`,
      uploadedBy: req.user._id,
      relatedTo: relatedModel && relatedId ? {
        model: relatedModel,
        id: relatedId
      } : undefined,
      uploadInfo: {
        ip: req.ip,
        userAgent: req.get("User-Agent")
      }
    });

    res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      data: {
        id: upload._id,
        url: upload.url,
        fileName: upload.fileName,
        type: upload.type
      }
    });
  } catch (error) {
    logger.error("Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload file"
    });
  }
};

/**
 * جلب ملفات المستخدم
 */
export const getUserUploads = async (req, res) => {
  try {
    const { page, limit, skip } = safePaginate(req.query, 50, 100);
    const { type } = req.query;
    const userId = req.params.userId || req.user._id;

    // التحقق من الصلاحيات
    if (userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const query = { uploadedBy: userId, isDeleted: false };
    if (type) query.type = type;

    const [uploads, total] = await Promise.all([
      Upload.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Upload.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: uploads,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error("Get uploads error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch uploads"
    });
  }
};

/**
 * جلب ملف واحد
 */
export const getUploadById = async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id);

    if (!upload || upload.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Upload not found"
      });
    }

    // التحقق من الصلاحيات
    if (upload.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    res.json({
      success: true,
      data: upload
    });
  } catch (error) {
    logger.error("Get upload error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch upload"
    });
  }
};

/**
 * حذف ملف (soft delete)
 */
export const deleteUpload = async (req, res) => {
  try {
    const upload = await Upload.findById(req.params.id);

    if (!upload || upload.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Upload not found"
      });
    }

    // التحقق من الصلاحيات
    if (upload.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    await upload.softDelete();

    // حذف الملف من الديسك (اختياري)
    try {
      await fs.unlink(upload.filePath);
    } catch (err) {
      logger.error("File deletion error:", err);
    }

    res.json({
      success: true,
      message: "Upload deleted successfully"
    });
  } catch (error) {
    logger.error("Delete upload error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete upload"
    });
  }
};

/**
 * تحديث حالة الملف (للأدمن - للموافقة على صور الدفع مثلاً)
 */
export const updateUploadStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const upload = await Upload.findById(req.params.id);

    if (!upload || upload.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Upload not found"
      });
    }

    upload.status = status;
    upload.moderation = {
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      notes
    };

    await upload.save();

    res.json({
      success: true,
      message: "Upload status updated",
      data: upload
    });
  } catch (error) {
    logger.error("Update status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update upload status"
    });
  }
};

/**
 * جلب الملفات المرتبطة بموديل معين
 */
export const getRelatedUploads = async (req, res) => {
  try {
    const { model, id } = req.params;

    const uploads = await Upload.find({
      'relatedTo.model': model,
      'relatedTo.id': id,
      isDeleted: false
    })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: uploads
    });
  } catch (error) {
    logger.error("Get related uploads error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch related uploads"
    });
  }
};
