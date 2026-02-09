import mongoose from "mongoose";

const listingSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  game: { type: mongoose.Schema.Types.ObjectId, ref: "Game", required: true },
  title: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  images: [{ type: String }], // مصفوفة URLs للصور
  coverImage: { type: String }, // صورة الغلاف
  details: { type: Object }, // الفورم الخاصة باللعبة
  status: { type: String, enum: ["available", "sold"], default: "available" }
}, { timestamps: true });

export default mongoose.model("Listing", listingSchema);
