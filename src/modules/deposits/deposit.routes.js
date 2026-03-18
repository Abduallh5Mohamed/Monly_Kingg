import express from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requireAdmin, requireAdminOrMod, requirePermission } from "../../middlewares/roleMiddleware.js";
import { validateObjectId } from "../../middlewares/validateObjectId.js";
import { depositLimiter, uploadLimiter, adminLimiter } from "../../middlewares/rateLimiter.js";
import { verifyImageFileType } from "../../middlewares/verifyFileType.js";
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
        // SECURITY FIX [VULN-014/021]: Use crypto-random ID and MIME-based extension.
        const uniqueSuffix = Date.now() + "-" + crypto.randomBytes(8).toString('hex');
        const SAFE_EXTENSIONS = {
            'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp'
        };
        const ext = SAFE_EXTENSIONS[file.mimetype] || '.bin';
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

// SECURITY FIX [C-05]: Verify real image signature for uploaded deposit receipts.
router.post("/request", depositLimiter, uploadLimiter, authMiddleware, upload.single("receipt"), verifyImageFileType, submitDeposit);
router.get("/my-requests", authMiddleware, getMyDeposits);

router.get("/all", adminLimiter, authMiddleware, requireAdminOrMod, requirePermission("orders"), getAllDeposits);
router.put("/:id/approve", validateObjectId(), adminLimiter, authMiddleware, requireAdminOrMod, requirePermission("orders"), approveDeposit);
router.put("/:id/reject", validateObjectId(), adminLimiter, authMiddleware, requireAdminOrMod, requirePermission("orders"), rejectDeposit);

export default router;
