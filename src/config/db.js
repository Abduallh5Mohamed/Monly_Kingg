import mongoose from "mongoose";

const connectDB = async () => {
    try {
        console.log('🔄 Attempting to connect to MongoDB...');

        // Production-ready connection options with pooling
        const options = {
            connectTimeoutMS: 10000,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            // Connection pooling - optimized for concurrent access
            maxPoolSize: 50,
            minPoolSize: 10,
            maxIdleTimeMS: 30000,
            // Wait queue — prevent request pile-up when pool is exhausted
            waitQueueTimeoutMS: 5000,
            // Performance optimizations
            retryWrites: true,
            retryReads: true,
            w: 'majority',
            journal: true, // Ensure write durability (critical for financial data)
            // Compression
            compressors: ['zlib'],
            zlibCompressionLevel: 3, // Faster compression
            // Auto-index creation disabled for performance
            autoIndex: false,
            // Read preference — read from secondaries when available (reduces primary load)
            readPreference: process.env.NODE_ENV === 'production' ? 'secondaryPreferred' : 'primary',
        };

        const conn = await mongoose.connect(process.env.MONGO_URI, options);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📊 Connection Pool Size: ${options.maxPoolSize}`);

        // Note: Indexes will be created automatically by Mongoose schemas
        // or can be created later after models are registered

        return true;
    } catch (error) {
        console.warn(`⚠️ MongoDB Connection Failed: ${error.message}`);
        console.log(`🔄 Server will continue without database connection`);
        console.log(`📝 API endpoints will return appropriate error messages`);
        return false;
    }
};

// Export function to create indexes after models are registered
export async function createIndexes() {
    try {
        const User = mongoose.model('User');
        const Chat = mongoose.model('Chat');

        // User indexes
        await User.collection.createIndex({ email: 1 }, { unique: true });
        await User.collection.createIndex({ username: 1 });
        await User.collection.createIndex({ createdAt: -1 });
        await User.collection.createIndex({ role: 1 });

        // Chat indexes
        await Chat.collection.createIndex({ participants: 1 });
        await Chat.collection.createIndex({ 'lastMessage.timestamp': -1 });
        await Chat.collection.createIndex({ participants: 1, 'lastMessage.timestamp': -1 });
        await Chat.collection.createIndex({ type: 1, isActive: 1, updatedAt: -1 });

        // Sync all schema-defined indexes for every registered model
        // (autoIndex is disabled, so we do this explicitly at startup)
        const modelNames = mongoose.modelNames();
        await Promise.allSettled(
            modelNames.map(name => mongoose.model(name).syncIndexes())
        );

        console.log(`✅ Database indexes synced for ${modelNames.length} models`);
    } catch (error) {
        console.log('⚠️  Index creation skipped:', error.message);
    }
}

// Handle disconnection events
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('⚠️ MongoDB connection error:', err.message);
});

export default connectDB;
