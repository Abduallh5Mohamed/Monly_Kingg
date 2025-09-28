import mongoose from "mongoose";

const gameSchema = new mongoose.Schema({
    name: { type: String, required: true }, // FIFA, Valorant, LOL, PUBG, COD
    forms: [{ type: Object }] // كل لعبة ليها فورم مختلف
}, { timestamps: true });

export default mongoose.model("Game", gameSchema);
