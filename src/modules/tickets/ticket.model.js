import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema({
  url: { type: String, required: true },
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  fileSize: { type: Number, required: true },
}, { _id: false });

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  senderRole: { type: String, enum: ["user", "seller", "admin", "moderator"], required: true },
  content: { type: String, maxlength: 2000, default: "" },
  attachments: [attachmentSchema],
  read: { type: Boolean, default: false },
}, { timestamps: true });

const ticketSchema = new mongoose.Schema({
  ticketNumber: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userRole: { type: String, enum: ["user", "seller"], required: true },
  subject: { type: String, required: true, maxlength: 200 },
  category: {
    type: String,
    enum: ["general", "payment", "account", "transaction", "technical", "other"],
    default: "general",
  },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  status: { type: String, enum: ["open", "in_progress", "answered", "closed"], default: "open" },
  messages: [messageSchema],
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  closedAt: { type: Date, default: null },
  closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

// Generate unique ticket number before saving
ticketSchema.pre("save", async function (next) {
  if (!this.ticketNumber) {
    const count = await mongoose.model("Ticket").countDocuments();
    this.ticketNumber = `TK-${String(count + 1).padStart(6, "0")}`;
  }
  next();
});

// Indexes
ticketSchema.index({ user: 1, status: 1 });
ticketSchema.index({ status: 1, createdAt: -1 });
ticketSchema.index({ ticketNumber: 1 });
ticketSchema.index({ userRole: 1, status: 1 });

export default mongoose.model("Ticket", ticketSchema);
