const mongoose = require('mongoose');
const Redis = require('ioredis');
require('dotenv').config();

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: process.env.REDIS_DB || 0,
});

async function cleanup() {
    try {
        console.log('\n🔄 Cleaning up games...\n');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const Game = mongoose.model('Game', new mongoose.Schema({ name: String }));

        // Delete duplicate games
        const duplicatesToDelete = ['FIFA / FC', 'PUBG Mobile'];

        for (const name of duplicatesToDelete) {
            const result = await Game.deleteMany({ name });
            if (result.deletedCount > 0) {
                console.log(`✅ Deleted "${name}" (${result.deletedCount} records)`);
            }
        }

        // Clear Redis cache for games
        const gamesKeys = await redis.keys('games:*');
        if (gamesKeys.length > 0) {
            await redis.del(...gamesKeys);
            console.log(`✅ Cleared ${gamesKeys.length} games cache keys from Redis`);
        } else {
            console.log('ℹ️  No games cache found in Redis');
        }

        // Show remaining games
        const games = await Game.find().sort({ name: 1 });
        console.log('\n📋 Remaining games in database:');
        games.forEach((g, i) => console.log(`  ${i + 1}. ${g.name}`));
        console.log(`\n✅ Total: ${games.length} games\n`);

        await mongoose.connection.close();
        redis.disconnect();
        console.log('✅ Cleanup completed successfully!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

cleanup();
