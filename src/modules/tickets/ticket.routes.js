import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { requireAdminOrMod } from "../../middlewares/roleMiddleware.js";
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
        const unique = Date.now() + "-" + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
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
router.get("/:id", ticketController.getTicketById);

// Add message to ticket (owner or admin) — supports up to 5 file attachments
router.post("/:id/messages", upload.array("attachments", 5), ticketController.addMessage);

// Close ticket (owner or admin)
router.post("/:id/close", ticketController.closeTicket);

// Admin: update priority
router.patch("/:id/priority", requireAdminOrMod, ticketController.updatePriority);

export default router;
