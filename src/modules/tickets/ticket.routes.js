import express from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requireAdminOrMod } from "../../middlewares/roleMiddleware.js";
import { validateObjectId } from "../../middlewares/validateObjectId.js";
import { verifyAnyFileType } from "../../middlewares/verifyFileType.js";
import * as ticketController from "./ticket.controller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Uploads directory for ticket attachments
const uploadsDir = path.join(__dirname, "../../../uploads/tickets");
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        // SECURITY FIX [VULN-M02]: Use crypto.randomBytes() instead of Math.random() for unpredictable filenames.
        // Use MIME-based extension instead of trusting user-supplied extension.
        const unique = Date.now() + "-" + crypto.randomBytes(8).toString('hex');
        const SAFE_EXTENSIONS = {
            'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png',
            'image/gif': '.gif', 'image/webp': '.webp', 'application/pdf': '.pdf'
        };
        const ext = SAFE_EXTENSIONS[file.mimetype] || '.bin';
        cb(null, "ticket-" + unique + ext);
    },
});

const fileFilter = (req, file, cb) => {
    const allowed = [
        "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
        "application/pdf",
    ];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only images (JPG, PNG, GIF, WEBP) and PDF files are allowed."), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// All routes require auth
router.use(authMiddleware);

// User/Seller: create a new ticket
router.post("/", ticketController.createTicket);

// User/Seller: get my tickets
router.get("/mine", ticketController.getMyTickets);

// Admin: get all tickets
router.get("/admin/all", requireAdminOrMod, ticketController.adminGetAll);

// Get single ticket (owner or admin)
router.get("/:id", validateObjectId(), ticketController.getTicketById);

// Add message to ticket (owner or admin) — supports up to 5 file attachments
router.post("/:id/messages", validateObjectId(), upload.array("attachments", 5), verifyAnyFileType, ticketController.addMessage);

// Close ticket (owner or admin)
router.post("/:id/close", validateObjectId(), ticketController.closeTicket);

// Admin: update priority
router.patch("/:id/priority", validateObjectId(), requireAdminOrMod, ticketController.updatePriority);

export default router;
