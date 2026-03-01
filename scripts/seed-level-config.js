/**
 * Seed Level Config & Recalculate Existing Seller Levels
 * 
 * Usage: node scripts/seed-level-config.js
 * 
 * This script:
 * 1. Creates the default LevelConfig document (if not exists)
 * 2. Recalculates all existing sellers' levels based on their stats.totalVolume
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

// Import models
import LevelConfig from "../src/modules/seller-levels/levelConfig.model.js";
import User from "../src/modules/users/user.model.js";
import {
  calculateLevelFromSales,
  getRankForLevel,
} from "../src/modules/seller-levels/sellerLevel.service.js";

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/monlyking";

async function seed() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // 1. Create or get LevelConfig
    console.log("\n📋 Setting up Level Config...");
    let config = await LevelConfig.findOne({ key: "seller_levels" });

    if (config) {
      console.log("ℹ️  LevelConfig already exists:");
      console.log(`   Multiplier: ${config.multiplier}`);
      console.log(`   Exponent: ${config.exponent}`);
      console.log(`   Max Level: ${config.maxLevel}`);
      console.log(`   Ranks: ${config.ranks.length}`);
    } else {
      config = await LevelConfig.create({
        key: "seller_levels",
        multiplier: 40,
        exponent: 1.3,
        maxLevel: 500,
        currency: "EGP",
        ranks: [
          { name: "Starter", minLevel: 1, maxLevel: 20, color: "#9CA3AF", icon: "🌱" },
          { name: "Bronze", minLevel: 21, maxLevel: 50, color: "#CD7F32", icon: "🥉" },
          { name: "Silver", minLevel: 51, maxLevel: 100, color: "#C0C0C0", icon: "🥈" },
          { name: "Gold", minLevel: 101, maxLevel: 200, color: "#FFD700", icon: "🥇" },
          { name: "Platinum", minLevel: 201, maxLevel: 300, color: "#E5E4E2", icon: "💎" },
          { name: "Diamond", minLevel: 301, maxLevel: 400, color: "#B9F2FF", icon: "💠" },
          { name: "Master Seller", minLevel: 401, maxLevel: 500, color: "#FF4500", icon: "👑" },
        ],
      });
      console.log("✅ LevelConfig created with default values");
    }

    // 2. Recalculate all sellers' levels
    console.log("\n📊 Recalculating seller levels...");
    const sellers = await User.find({ isSeller: true }).select("username stats");
    console.log(`   Found ${sellers.length} sellers`);

    let updated = 0;
    const bulkOps = [];

    for (const seller of sellers) {
      const totalVolume = seller.stats?.totalVolume || 0;
      const { level } = calculateLevelFromSales(totalVolume, config);
      const rank = getRankForLevel(level, config);
      const currentLevel = seller.stats?.level || 1;

      if (level !== currentLevel || !seller.stats?.rank) {
        bulkOps.push({
          updateOne: {
            filter: { _id: seller._id },
            update: {
              "stats.level": level,
              "stats.rank": rank.name,
            },
          },
        });
        updated++;
        console.log(`   ${seller.username}: Lv${currentLevel} → Lv${level} (${rank.name}) | ${totalVolume.toLocaleString()} EGP`);
      }
    }

    if (bulkOps.length > 0) {
      await User.bulkWrite(bulkOps);
    }

    console.log(`\n✅ Done! Updated ${updated}/${sellers.length} sellers`);

    // 3. Show some sample levels
    console.log("\n📈 Sample Level Requirements (EGP):");
    console.log("   Level → Cost to Next | Cumulative");
    const sampleLevels = [1, 5, 10, 25, 50, 70, 100, 150, 200, 300, 400, 500];
    let cumulative = 0;
    let prevSample = 0;

    for (let lv = 1; lv <= 500; lv++) {
      const cost = Math.floor(config.multiplier * Math.pow(lv, config.exponent));
      if (sampleLevels.includes(lv)) {
        const rank = getRankForLevel(lv, config);
        console.log(`   Lv ${lv.toString().padStart(3)} → ${cost.toLocaleString().padStart(8)} EGP | Total: ${cumulative.toLocaleString().padStart(12)} EGP | ${rank.icon} ${rank.name}`);
      }
      cumulative += cost;
    }

  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    process.exit(0);
  }
}

seed();
