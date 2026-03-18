import mongoose from "mongoose";
import crypto from "crypto";

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["text", "image", "video", "audio", "file"], default: "text" },
  content: { type: String, required: true },
  fileUrl: String,
  read: { type: Boolean, default: false },
  delivered: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now, index: true }
}, { _id: true });

const chatSchema = new mongoose.Schema({
  chatNumber: {
    type: String,
    unique: true,
    sparse: true,  // Allow null temporarily for pre-save hook
    index: true
    // Validation removed to allow pre-save hook to generate the number
  },
  type: { type: String, enum: ["direct", "support", "group"], default: "direct", index: true },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  }],
  // Store ALL messages forever (no limit — admin can view everything)
  messages: [messageSchema],
  // Quick access to last message
  lastMessage: {
    content: String,
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    timestamp: Date,
    messageType: String
  },
  // Metadata
  isActive: { type: Boolean, default: true, index: true },
  archived: { type: Boolean, default: false },
  unreadCount: { type: Map, of: Number, default: {} }, // userId -> count
  hiddenFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Users who hid this chat (soft delete)
  deletedMessagesFor: { type: Map, of: [String], default: {} } // userId -> [messageId1, messageId2] (soft delete messages)
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for faster queries
chatSchema.index({ participants: 1, updatedAt: -1 });
chatSchema.index({ participants: 1, isActive: 1 });
chatSchema.index({ 'lastMessage.timestamp': -1 });
chatSchema.index({ type: 1, isActive: 1, updatedAt: -1 });

// Generate unique 9-digit chat number
chatSchema.statics.generateChatNumber = async function () {
  let chatNumber;
  let exists = true;

  while (exists) {
    // SECURITY FIX [VULN-H03]: Use crypto.randomInt() instead of Math.random() for unpredictable chat numbers.
    chatNumber = crypto.randomInt(100000000, 1000000000).toString();
    // Check if it already exists
    const existing = await this.findOne({ chatNumber }).select('_id').lean();
    exists = !!existing;
  }

  return chatNumber;
};

// Auto-generate chat number before saving if not present
chatSchema.pre('save', async function (next) {
  if (this.isNew && !this.chatNumber) {
    this.chatNumber = await this.constructor.generateChatNumber();
  }
  next();
});

// Method to add message efficiently (no more auto-deletion)
chatSchema.methods.addMessage = async function (messageData) {
  // Add new message — no limits, keep everything for admin
  this.messages.push(messageData);

  // Update last message
  this.lastMessage = {
    content: messageData.content,
    sender: messageData.sender,
    timestamp: messageData.timestamp || new Date(),
    messageType: messageData.type || 'text'
  };

  // Update unread count for other participants
  this.participants.forEach(participantId => {
    if (participantId.toString() !== messageData.sender.toString()) {
      const current = this.unreadCount.get(participantId.toString()) || 0;
      this.unreadCount.set(participantId.toString(), current + 1);
    }
  });

  this.updatedAt = new Date();
  return await this.save();
};

// Method to mark messages as read — uses atomic update (no full doc load)
chatSchema.statics.markAsReadAtomic = async function (chatId, userId) {
  const userIdStr = userId.toString();
  await this.updateOne(
    { _id: chatId },
    {
      $set: { [`unreadCount.${userIdStr}`]: 0 },
    }
  );
  // Mark individual messages as read (bulk — only unread from others)
  await this.updateOne(
    { _id: chatId },
    { $set: { 'messages.$[elem].read': true } },
    { arrayFilters: [{ 'elem.sender': { $ne: userId }, 'elem.read': false }] }
  );
};

// Keep the instance method for backward compatibility but use the static version in hot paths
chatSchema.methods.markAsRead = async function (userId) {
  await this.constructor.markAsReadAtomic(this._id, userId);
};

export default mongoose.model("Chat", chatSchema);

