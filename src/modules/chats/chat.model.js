import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // buyer + seller
  messages: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: { type: String, enum: ["text", "image", "video", "audio"], default: "text" },
    content: String,
    fileUrl: String, // للصور / الفيديوهات / التسجيلات
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.model("Chat", chatSchema);
