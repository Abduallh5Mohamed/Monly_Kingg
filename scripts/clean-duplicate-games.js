const mongoose = require("mongoose");
require("dotenv").config();

const gameSchema = new mongoose.Schema({
    name: String,
    slug: String,
    category: String,
    icon: String,
    status: String,
});

const Game = mongoose.model("Game", gameSchema);

async function cleanDuplicateGames() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // Delete duplicate games - keep the main ones
        const toDelete = ["PUBG Mobile", "FIFA / FC"];

        const result = await Game.deleteMany({ name: { $in: toDelete } });
        console.log(`✅ Deleted ${result.deletedCount} duplicate games`);

        // List remaining games
        const games = await Game.find({ status: "active" });
        console.log("\n📋 Remaining games:");
        games.forEach((game, i) => {
            console.log(`${i + 1}. ${game.name} (${game.slug})`);
        });

        console.log("\n✅ Cleanup complete!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

cleanDuplicateGames();
