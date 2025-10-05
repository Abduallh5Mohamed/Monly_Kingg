import mongoose from "mongoose";

const connectDB = async () => {
    try {
        // Production-ready connection options with pooling
        const options = {
            connectTimeoutMS: 10000,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            // Connection pooling for high concurrency
            maxPoolSize: 100, // Max connections in pool
            minPoolSize: 10,  // Min connections maintained
            maxIdleTimeMS: 30000,
            // Performance optimizations
            retryWrites: true,
            retryReads: true,
            w: 'majority',
            journal: true,
            // Compression
            compressors: ['zlib'],
            zlibCompressionLevel: 6
        };

        const conn = await mongoose.connect(process.env.MONGO_URI, options);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📊 Connection Pool Size: ${options.maxPoolSize}`);

        // Create indexes for common queries
        await createIndexes();

        return true;
    } catch (error) {
        console.warn(`⚠️ MongoDB Connection Failed: ${error.message}`);
        console.log(`🔄 Server will continue without database connection`);
        console.log(`📝 API endpoints will return appropriate error messages`);
        return false;
    }
};

// Create database indexes for performance
async function createIndexes() {
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
