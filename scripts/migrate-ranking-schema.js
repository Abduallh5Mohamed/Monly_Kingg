/**
 * Migration Script: Add Ranking Schema Fields
 * 
 * This script updates all existing listings to include:
 *   - stats object with default values
 *   - ranking object with default scores
 * 
 * Run once after deploying the new ranking system.
 * 
 * Usage: node scripts/migrate-ranking-schema.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/accounts-store';

// Define minimal Listing schema for migration (we just need access to the collection)
const listingSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const Listing = mongoose.model('Listing', listingSchema);

// Connect to MongoDB
async function connect() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB:', MONGODB_URI.split('@')[1] || 'localhost');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

// Migration function
async function migrateRankingSchema() {
  console.log('\n📊 Starting ranking schema migration...\n');

  try {
    // Count listings that need migration
    const needsMigration = await Listing.countDocuments({
      $or: [
        { stats: { $exists: false } },
        { ranking: { $exists: false } },
      ],
    });

    console.log(`📋 Found ${needsMigration} listings to migrate`);

    if (needsMigration === 0) {
      console.log('✅ All listings already have the new schema. Nothing to do.');
      return;
    }

    // Update listings with missing fields
    const result = await Listing.updateMany(
      {
        $or: [
          { stats: { $exists: false } },
          { ranking: { $exists: false } },
        ],
      },
      {
        $set: {
          stats: {
            viewCount: 0,
            viewsToday: 0,
            viewsLast7d: 0,
            viewsLast30d: 0,
            salesCount: 0,
            salesLast24h: 0,
            salesLast7d: 0,
            salesLast30d: 0,
            wishlistCount: 0,
            ratingAvg: 0,
            ratingCount: 0,
            ratingSum: 0,
          },
          ranking: {
            bestSeller: 0,
            trending: 0,
            popular: 0,
            updatedAt: null,
          },
        },
      }
    );

    console.log(`✅ Updated ${result.modifiedCount} listings with default stats/ranking`);

    // Create indexes (if not exists)
    console.log('\n📊 Creating ranking indexes...');

    try {
      await Listing.collection.createIndex({ status: 1, 'ranking.bestSeller': -1 });
      console.log('  ✓ Created index: { status: 1, ranking.bestSeller: -1 }');
    } catch (e) {
      if (e.code === 85) {
        console.log('  ℹ Index already exists: ranking.bestSeller');
      } else {
        throw e;
      }
    }

    try {
      await Listing.collection.createIndex({ status: 1, 'ranking.trending': -1 });
      console.log('  ✓ Created index: { status: 1, ranking.trending: -1 }');
    } catch (e) {
      if (e.code === 85) {
        console.log('  ℹ Index already exists: ranking.trending');
      } else {
        throw e;
      }
    }

    try {
      await Listing.collection.createIndex({ status: 1, 'ranking.popular': -1 });
      console.log('  ✓ Created index: { status: 1, ranking.popular: -1 }');
    } catch (e) {
      if (e.code === 85) {
        console.log('  ℹ Index already exists: ranking.popular');
      } else {
        throw e;
      }
    }

    try {
      await Listing.collection.createIndex({ 'stats.viewCount': -1, status: 1 });
      console.log('  ✓ Created index: { stats.viewCount: -1, status: 1 }');
    } catch (e) {
      if (e.code === 85) {
        console.log('  ℹ Index already exists: stats.viewCount');
      } else {
        throw e;
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Next steps:');
    console.log('   1. Restart your server (it will auto-calculate scores every 15 min)');
    console.log('   2. Or manually trigger: POST /api/v1/rankings/recalculate (requires admin)');
    console.log('   3. Check rankings: GET /api/v1/rankings/homepage\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
async function main() {
  await connect();
  await migrateRankingSchema();
  await mongoose.connection.close();
  console.log('👋 Disconnected from MongoDB\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
