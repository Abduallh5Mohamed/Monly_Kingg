import mongoose from "mongoose";

const badgeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  icon: { type: String }, // صورة البادج
  description: String,
  condition: { type: String } // زي "أكتر من سنة مسجل"
}, { timestamps: true });

export default mongoose.model("Badge", badgeSchema);
