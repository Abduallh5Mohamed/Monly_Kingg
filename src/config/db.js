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
            minPoolSize: 5,
            maxIdleTimeMS: 30000,
            // Performance optimizations
            retryWrites: true,
            retryReads: true,
            w: 'majority',
            journal: false, // Faster writes (trade-off: slight durability risk)
            // Compression
            compressors: ['zlib'],
            zlibCompressionLevel: 3, // Faster compression
            // Auto-index creation disabled for performance
            autoIndex: false
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

        console.log('✅ Database indexes created');
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
