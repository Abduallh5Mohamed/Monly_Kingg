/**
 * Migration: Add default account fields (Email + Password) to existing games
 * that don't have any fields set.
 * 
 * Run: node scripts/migrate-game-fields.js
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/monly_kingg";

const DEFAULT_FIELDS = [
    { name: "Email", type: "email", required: true, placeholder: "Account email" },
    { name: "Password", type: "password", required: true, placeholder: "Account password" },
];

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        const db = mongoose.connection.db;
        const gamesCollection = db.collection("games");

        // Find games that don't have fields or have empty fields array
        const gamesToUpdate = await gamesCollection.find({
            $or: [
                { fields: { $exists: false } },
                { fields: { $size: 0 } },
                { fields: null },
            ]
        }).toArray();

        console.log(`Found ${gamesToUpdate.length} games without fields`);

        if (gamesToUpdate.length > 0) {
            const result = await gamesCollection.updateMany(
                {
                    $or: [
                        { fields: { $exists: false } },
                        { fields: { $size: 0 } },
                        { fields: null },
                    ]
                },
                { $set: { fields: DEFAULT_FIELDS } }
            );
            console.log(`Updated ${result.modifiedCount} games with default fields (Email + Password)`);
        }

        // Also remove the old 'forms' field if it exists
        const formsResult = await gamesCollection.updateMany(
            { forms: { $exists: true } },
            { $unset: { forms: "" } }
        );
        if (formsResult.modifiedCount > 0) {
            console.log(`Removed old 'forms' field from ${formsResult.modifiedCount} games`);
        }

        // Show all games and their fields
        const allGames = await gamesCollection.find({}).toArray();
        console.log("\nCurrent games:");
        allGames.forEach(g => {
            console.log(`  - ${g.name}: ${(g.fields || []).map(f => `${f.name}(${f.type})`).join(", ")}`);
        });

        console.log("\nDone!");
    } catch (error) {
        console.error("Migration error:", error);
    } finally {
        await mongoose.disconnect();
    }
}

run();
