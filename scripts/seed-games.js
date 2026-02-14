import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const GAMES = [
    {
        name: "League of Legends",
        slug: "league-of-legends",
        category: "MOBA",
        icon: "swords",
        status: "active",
    },
    {
        name: "Valorant",
        slug: "valorant",
        category: "FPS",
        icon: "crosshair",
        status: "active",
    },
    {
        name: "PUBG Mobile",
        slug: "pubg-mobile",
        category: "Battle Royale",
        icon: "gamepad2",
        status: "active",
    },
    {
        name: "FIFA / FC",
        slug: "fifa-fc",
        category: "Sports",
        icon: "trophy",
        status: "active",
    },
];

async function seedGames() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // Import model after connection
        const { default: Game } = await import("../src/modules/games/game.model.js");

        for (const game of GAMES) {
            const result = await Game.findOneAndUpdate(
                { slug: game.slug },
                { $set: game },
                { upsert: true, new: true }
            );
            console.log(`✅ Game "${result.name}" seeded (ID: ${result._id})`);
        }

        console.log(`\n🎮 Successfully seeded ${GAMES.length} games!`);
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error("❌ Seed error:", error);
        process.exit(1);
    }
}

seedGames();
