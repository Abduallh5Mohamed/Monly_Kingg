import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requireAdmin } from "../../middlewares/roleMiddleware.js";
import { depositLimiter, uploadLimiter, adminLimiter } from "../../middlewares/rateLimiter.js";
import {
    submitDeposit,
    getMyDeposits,
    getAllDeposits,
    approveDeposit,
    rejectDeposit,
} from "./deposit.controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

const uploadsDir = path.join(__dirname, "../../../uploads/receipts");
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
        cb(null, "receipt-" + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only images (JPG, PNG, WEBP) are allowed."), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.post("/request", depositLimiter, uploadLimiter, authMiddleware, upload.single("receipt"), submitDeposit);
router.get("/my-requests", authMiddleware, getMyDeposits);

router.get("/all", adminLimiter, authMiddleware, requireAdmin, getAllDeposits);
router.put("/:id/approve", adminLimiter, authMiddleware, requireAdmin, approveDeposit);
router.put("/:id/reject", adminLimiter, authMiddleware, requireAdmin, rejectDeposit);

export default router;
