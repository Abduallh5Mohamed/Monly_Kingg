/**
 * Migration Script: Add profileCompleted field to existing users
 * Run this once to update all existing users in the database
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../modules/users/user.model.js";

dotenv.config();

const migrateUsers = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // Update all users who don't have profileCompleted field
        const result = await User.updateMany(
            { profileCompleted: { $exists: false } },
            { $set: { profileCompleted: false } }
        );

        console.log(`✅ Migration completed: ${result.modifiedCount} users updated`);

        // Display users with incomplete profiles
        const incompleteProfiles = await User.find({ profileCompleted: false })
            .select('username email profileCompleted')
            .lean();

        console.log(`\n📋 Users with incomplete profiles: ${incompleteProfiles.length}`);
        incompleteProfiles.forEach(user => {
            console.log(`  - ${user.username} (${user.email})`);
        });

        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
};

migrateUsers();
