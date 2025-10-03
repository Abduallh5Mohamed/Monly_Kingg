import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const unlockUser = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/accountsstore');
        console.log('✅ Connected to MongoDB');

        // First check if user exists and has lock
        const user = await mongoose.connection.db.collection('users').findOne(
            { email: 'baraawael7901@gmail.com' }
        );

        console.log('📊 User found:', {
            email: user?.email,
            lockUntil: user?.lockUntil,
            failedLoginAttempts: user?.failedLoginAttempts
        });

        const result = await mongoose.connection.db.collection('users').updateOne(
            { email: 'baraawael7901@gmail.com' },
            {
                $unset: { lockUntil: '', failedLoginAttempts: '' }
            }
        );

        console.log('✅ User unlocked:', result.modifiedCount, 'user(s) updated');
        console.log('📊 Match count:', result.matchedCount);

        // Verify the update
        const updatedUser = await mongoose.connection.db.collection('users').findOne(
            { email: 'baraawael7901@gmail.com' }
        );

        console.log('📊 After update:', {
            email: updatedUser?.email,
            lockUntil: updatedUser?.lockUntil,
            failedLoginAttempts: updatedUser?.failedLoginAttempts
        });

        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

unlockUser();
