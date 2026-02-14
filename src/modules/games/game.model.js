import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    category: { type: String, default: "" },
    icon: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    forms: [{ type: Object }]
}, { timestamps: true });

// Index for status only (slug already has index from unique:true)
gameSchema.index({ status: 1 });

export default mongoose.model("Game", gameSchema);
