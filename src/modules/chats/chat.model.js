import mongoose from "mongoose";

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
  // Store only recent messages (last 100) for performance
  messages: {
    type: [messageSchema],
    validate: {
      validator: function (v) { return v.length <= 100; },
      message: 'Messages array exceeds limit of 100'
    }
  },
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
  hiddenFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }] // Users who hid this chat
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
    // Generate random 9-digit number
    chatNumber = Math.floor(100000000 + Math.random() * 900000000).toString();
    // Check if it already exists
    const existing = await this.findOne({ chatNumber });
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

// Method to add message efficiently
chatSchema.methods.addMessage = async function (messageData) {
  // If messages array reaches limit, keep only last 50
  if (this.messages.length >= 100) {
    // Archive old messages to separate collection (optional)
    const oldMessages = this.messages.slice(0, 50);
    // await MessageArchive.insertMany(oldMessages.map(m => ({ ...m, chatId: this._id })));

    this.messages = this.messages.slice(50);
  }

  // Add new message
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

// Method to mark messages as read
chatSchema.methods.markAsRead = async function (userId) {
  this.unreadCount.set(userId.toString(), 0);

  // Mark messages as read
  this.messages.forEach(msg => {
    if (msg.sender.toString() !== userId.toString()) {
      msg.read = true;
    }
  });

  return await this.save();
};

export default mongoose.model("Chat", chatSchema);

