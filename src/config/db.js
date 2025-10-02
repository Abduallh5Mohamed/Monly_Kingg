import mongoose from "mongoose";

const connectDB = async () => {
    try {
        // Connection options with timeout
        const options = {
            connectTimeoutMS: 5000,
            serverSelectionTimeoutMS: 5000,
        };
        
        const conn = await mongoose.connect(process.env.MONGO_URI, options);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        return true;
    } catch (error) {
        console.warn(`⚠️ MongoDB Connection Failed: ${error.message}`);
        console.log(`🔄 Server will continue without database connection`);
        console.log(`📝 API endpoints will return appropriate error messages`);
        // Never exit - allow app to run without database in all environments
        // This is useful for frontend development
        return false;
    }
};

// Handle disconnection events
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('⚠️ MongoDB connection error:', err.message);
});

export default connectDB;
