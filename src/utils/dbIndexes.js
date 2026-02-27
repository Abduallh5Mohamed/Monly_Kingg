/**
 * Database Index Management Utility
 * استخدم هذا السكريبت للتحقق من وإنشاء indexes في MongoDB
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Listing from '../modules/listings/listing.model.js';

dotenv.config();

async function checkAndCreateIndexes() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('\n📊 Checking Listing indexes...');

        // Get existing indexes
        const existingIndexes = await Listing.collection.getIndexes();
        console.log('\n✅ Existing indexes:', Object.keys(existingIndexes));

        // Create/sync all indexes from the model
        console.log('\n🔄 Ensuring all indexes are created...');
        await Listing.syncIndexes();
        console.log('✅ All indexes synced successfully');

        // Verify indexes again
        const updatedIndexes = await Listing.collection.getIndexes();
        console.log('\n✅ Current indexes:', Object.keys(updatedIndexes));

        // Check collection statistics
        const stats = await Listing.collection.stats();
        console.log('\n📊 Collection Statistics:');
        console.log(`   - Documents: ${stats.count}`);
        console.log(`   - Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   - Average document size: ${(stats.avgObjSize / 1024).toFixed(2)} KB`);
        console.log(`   - Indexes: ${stats.nindexes}`);
        console.log(`   - Index size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);

        // Test query performance
        console.log('\n⚡ Testing query performance...');
        const startTime = Date.now();
        const testResults = await Listing.find({ status: 'available' })
            .sort({ 'ranking.bestSeller': -1 })
            .limit(10)
            .lean();
        const duration = Date.now() - startTime;
        console.log(`✅ Query completed in ${duration}ms`);
        console.log(`   Found ${testResults.length} listings`);

        if (duration > 1000) {
            console.warn('\n⚠️  WARNING: Query is slow! Consider:');
            console.warn('   1. Rebuilding indexes');
            console.warn('   2. Checking database resources');
            console.warn('   3. Optimizing query patterns');
        }

        console.log('\n✅ Done!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the check
checkAndCreateIndexes();
