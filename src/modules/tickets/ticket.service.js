import Ticket from "./ticket.model.js";
import logger from "../../utils/logger.js";

/**
 * Create a new support ticket
 */
export async function createTicket({ userId, userRole, subject, category, priority, message }) {
  const ticket = await Ticket.create({
    user: userId,
    userRole,
    subject,
    category: category || "general",
    priority: priority || "medium",
    messages: [{
      sender: userId,
      senderRole: userRole,
      content: message,
    }],
  });

  return ticket.populate("user", "username avatar email");
}

/**
 * Get tickets for a specific user
 */
export async function getUserTickets(userId, { status, page = 1, limit = 20 }) {
  const filter = { user: userId };
  if (status && status !== "all") filter.status = status;

  const [tickets, total] = await Promise.all([
    Ticket.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "username avatar")
      .populate("assignedTo", "username avatar")
      .lean(),
    Ticket.countDocuments(filter),
  ]);

  return { tickets, total, page, limit };
}

/**
 * Get all tickets (admin view)
 */
export async function getAllTickets({ status, userRole, priority, page = 1, limit = 20, search }) {
  const filter = {};
  if (status && status !== "all") filter.status = status;
  if (userRole && userRole !== "all") filter.userRole = userRole;
  if (priority && priority !== "all") filter.priority = priority;

  if (search) {
    filter.$or = [
      { ticketNumber: { $regex: search, $options: "i" } },
      { subject: { $regex: search, $options: "i" } },
    ];
  }

  const [tickets, total, statusCounts] = await Promise.all([
    Ticket.find(filter)
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "username avatar email isSeller")
      .populate("assignedTo", "username avatar")
      .lean(),
    Ticket.countDocuments(filter),
    Ticket.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const counts = { open: 0, in_progress: 0, answered: 0, closed: 0 };
  statusCounts.forEach(s => { counts[s._id] = s.count; });

  return { tickets, total, page, limit, statusCounts: counts };
}

/**
 * Get a single ticket by ID
 */
export async function getTicketById(ticketId) {
  return Ticket.findById(ticketId)
    .populate("user", "username avatar email isSeller")
    .populate("assignedTo", "username avatar")
    .populate("messages.sender", "username avatar")
    .populate("closedBy", "username");
}

/**
 * Add a message to a ticket
 */
export async function addMessage(ticketId, { senderId, senderRole, content, attachments }) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return null;

  ticket.messages.push({
    sender: senderId,
    senderRole,
    content: content || "",
    attachments: attachments || [],
  });

  // Update status based on who sent the message
  if (senderRole === "admin" || senderRole === "moderator") {
    ticket.status = "answered";
    if (!ticket.assignedTo) ticket.assignedTo = senderId;
  } else if (ticket.status === "answered") {
    ticket.status = "in_progress";
  }

  await ticket.save();

  return ticket.populate([
    { path: "user", select: "username avatar email" },
    { path: "messages.sender", select: "username avatar" },
    { path: "assignedTo", select: "username avatar" },
  ]);
}

/**
 * Close a ticket
 */
export async function closeTicket(ticketId, closedById) {
  return Ticket.findByIdAndUpdate(ticketId, {
    status: "closed",
    closedAt: new Date(),
    closedBy: closedById,
  }, { new: true })
    .populate("user", "username avatar email")
    .populate("assignedTo", "username avatar");
}

/**
 * Update ticket priority (admin)
 */
export async function updateTicketPriority(ticketId, priority) {
  return Ticket.findByIdAndUpdate(ticketId, { priority }, { new: true });
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(ticketId, readerRole) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return null;

  let updated = false;
  ticket.messages.forEach(msg => {
    const isAdminReader = readerRole === "admin" || readerRole === "moderator";
    const isMsgFromAdmin = msg.senderRole === "admin" || msg.senderRole === "moderator";

    // Admin reads user messages, user reads admin messages
    if ((isAdminReader && !isMsgFromAdmin && !msg.read) ||
      (!isAdminReader && isMsgFromAdmin && !msg.read)) {
      msg.read = true;
      updated = true;
    }
  });

  if (updated) await ticket.save();
  return ticket;
}
