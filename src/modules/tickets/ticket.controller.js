import * as ticketService from "./ticket.service.js";
import logger from "../../utils/logger.js";
import { safePaginate } from "../../utils/pagination.js";

// ─── POST /api/v1/tickets ─────────────────────────────────────────────────────
// User/Seller creates a new ticket
export const createTicket = async (req, res) => {
  try {
    const { subject, message, category, priority } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: "Subject and message are required" });
    }
    if (subject.length > 200) {
      return res.status(400).json({ success: false, message: "Subject must be under 200 characters" });
    }
    if (message.length > 2000) {
      return res.status(400).json({ success: false, message: "Message must be under 2000 characters" });
    }

    const userRole = req.user.isSeller ? "seller" : "user";

    const ticket = await ticketService.createTicket({
      userId: req.user._id,
      userRole,
      subject,
      category,
      priority,
      message,
    });

    res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    logger.error(`[Tickets] createTicket error: ${err.message}`);
    res.status(500).json({ success: false, message: "Failed to create ticket" });
  }
};

// ─── GET /api/v1/tickets/mine ──────────────────────────────────────────────────
// Get current user's tickets
export const getMyTickets = async (req, res) => {
  try {
    const { status } = req.query;
    // SECURITY FIX [M-06]: Cap pagination parameters to avoid oversized queries.
    const { page, limit } = safePaginate(req.query, 20, 100);
    const result = await ticketService.getUserTickets(req.user._id, {
      status,
      page,
      limit,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(`[Tickets] getMyTickets error: ${err.message}`);
    res.status(500).json({ success: false, message: "Failed to get tickets" });
  }
};

// ─── GET /api/v1/tickets/admin/all ─────────────────────────────────────────────
// Admin: get all tickets
export const adminGetAll = async (req, res) => {
  try {
    const { status, userRole, priority, search } = req.query;
    // SECURITY FIX [M-06]: Cap pagination parameters to avoid oversized queries.
    const { page, limit } = safePaginate(req.query, 20, 100);
    const result = await ticketService.getAllTickets({
      status,
      userRole,
      priority,
      page,
      limit,
      search,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    logger.error(`[Tickets] adminGetAll error: ${err.message}`);
    res.status(500).json({ success: false, message: "Failed to get tickets" });
  }
};

// ─── GET /api/v1/tickets/:id ───────────────────────────────────────────────────
// Get single ticket (owner or admin)
export const getTicketById = async (req, res) => {
  try {
    const ticket = await ticketService.getTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    // Verify access: owner or admin/mod
    const isOwner = ticket.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin" || req.user.role === "moderator";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Mark messages as read
    const readerRole = isAdmin ? req.user.role : (req.user.isSeller ? "seller" : "user");
    await ticketService.markMessagesAsRead(ticket._id, readerRole);

    res.json({ success: true, data: ticket });
  } catch (err) {
    logger.error(`[Tickets] getTicketById error: ${err.message}`);
    res.status(500).json({ success: false, message: "Failed to get ticket" });
  }
};

// ─── POST /api/v1/tickets/:id/messages ─────────────────────────────────────────
// Add a message to a ticket (supports text + file attachments)
export const addMessage = async (req, res) => {
  try {
    const content = req.body?.content;
    const files = req.files || [];

    if (!content && files.length === 0) {
      return res.status(400).json({ success: false, message: "Message content or attachment is required" });
    }
    if (content && content.length > 2000) {
      return res.status(400).json({ success: false, message: "Message must be under 2000 characters" });
    }

    // Verify access
    const ticket = await ticketService.getTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    const isOwner = ticket.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin" || req.user.role === "moderator";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (ticket.status === "closed") {
      return res.status(400).json({ success: false, message: "Cannot reply to a closed ticket" });
    }

    let senderRole;
    if (isAdmin) {
      senderRole = req.user.role;
    } else {
      senderRole = req.user.isSeller ? "seller" : "user";
    }

    // Build attachments array from uploaded files
    const attachments = files.map(f => ({
      url: `/uploads/tickets/${f.filename}`,
      fileName: f.filename,
      originalName: f.originalname,
      mimeType: f.mimetype,
      fileSize: f.size,
    }));

    const updated = await ticketService.addMessage(req.params.id, {
      senderId: req.user._id,
      senderRole,
      content: content || "",
      attachments,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error(`[Tickets] addMessage error: ${err.message}`);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
};

// ─── POST /api/v1/tickets/:id/close ────────────────────────────────────────────
// Close a ticket (owner or admin)
export const closeTicket = async (req, res) => {
  try {
    const ticket = await ticketService.getTicketById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    const isOwner = ticket.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin" || req.user.role === "moderator";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (ticket.status === "closed") {
      return res.status(400).json({ success: false, message: "Ticket is already closed" });
    }

    const updated = await ticketService.closeTicket(req.params.id, req.user._id);
    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error(`[Tickets] closeTicket error: ${err.message}`);
    res.status(500).json({ success: false, message: "Failed to close ticket" });
  }
};

// ─── PATCH /api/v1/tickets/:id/priority ────────────────────────────────────────
// Admin: update ticket priority
export const updatePriority = async (req, res) => {
  try {
    const { priority } = req.body;
    if (!["low", "medium", "high"].includes(priority)) {
      return res.status(400).json({ success: false, message: "Invalid priority" });
    }

    const updated = await ticketService.updateTicketPriority(req.params.id, priority);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error(`[Tickets] updatePriority error: ${err.message}`);
    res.status(500).json({ success: false, message: "Failed to update priority" });
  }
};
