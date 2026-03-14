import mongoose from "mongoose";

const gameFieldSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ["email", "password", "phone", "number", "text"], default: "text" },
    required: { type: Boolean, default: true },
    placeholder: { type: String, default: "" },
}, { _id: true });

const gameSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    category: { type: String, default: "" },
    icon: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    fields: {
        type: [gameFieldSchema],
        default: [
            { name: "Email", type: "email", required: true, placeholder: "Account email" },
            { name: "Password", type: "password", required: true, placeholder: "Account password" },
        ]
    },
}, { timestamps: true });

// Index for status only (slug already has index from unique:true)
gameSchema.index({ status: 1 });

export default mongoose.model("Game", gameSchema);
