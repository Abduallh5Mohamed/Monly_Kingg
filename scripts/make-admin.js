import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const email = process.argv[2] || 'baraawael7901@gmail.com';

async function makeAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/accountstore');
        console.log('✅ Connected to MongoDB');
        
        const user = await mongoose.connection.db.collection('users').findOne({ email });
        
        if (!user) {
            console.log('❌ User not found:', email);
            process.exit(1);
        }
        
        console.log('📋 Current user info:');
        console.log('   Email:', user.email);
        console.log('   Username:', user.username);
        console.log('   Role:', user.role);
        
        if (user.role === 'admin') {
            console.log('✅ User is already an admin!');
        } else {
            const result = await mongoose.connection.db.collection('users').updateOne(
                { email },
                { $set: { role: 'admin' } }
            );
            console.log('✅ User role updated to admin!');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

makeAdmin();
