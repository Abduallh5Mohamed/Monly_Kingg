import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const mongoUri = 'mongodb://localhost:27017/accountsstore';

async function checkLoginFlow() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');
    
    const db = mongoose.connection.db;
    const user = await db.collection('users').findOne({ email: 'baraaweal24@gmail.com' });
    
    if (!user) {
      console.log('❌ User NOT found');
      await mongoose.disconnect();
      return;
    }
    
    console.log('✅ User found:');
    console.log('Email:', user.email);
    console.log('Username:', user.username);
    console.log('Verified:', user.verified);
    console.log('Has passwordHash:', !!user.passwordHash);
    console.log('passwordHash length:', user.passwordHash?.length);
    
    // Test password
    console.log('\n🔐 Testing password...');
    const testPassword = 'Baraa123580';
    const isMatch = await bcrypt.compare(testPassword, user.passwordHash);
    console.log('Password matches:', isMatch);
    
    if (!isMatch) {
      console.log('\n❌ Password does NOT match!');
      console.log('Let me create a new password hash...');
      
      const newHash = await bcrypt.hash(testPassword, 12);
      await db.collection('users').updateOne(
        { email: 'baraaweal24@gmail.com' },
        { $set: { passwordHash: newHash, verified: true } }
      );
      
      console.log('✅ Password hash updated!');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
  }
}

checkLoginFlow();
