import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const mongoUri = 'mongodb://localhost:27017/accountsstore';

async function createUser() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Check if user already exists
    const existing = await db.collection('users').findOne({ email: 'baraaweal24@gmail.com' });
    if (existing) {
      console.log('User already exists!');
      await mongoose.disconnect();
      process.exit(0);
    }
    
    // Create password hash
    const passwordHash = await bcrypt.hash('Baraa123580', 12);
    
    // Create user
    const user = {
      email: 'baraaweal24@gmail.com',
      username: 'baraaweal24',
      passwordHash: passwordHash,
      role: 'user',
      verified: true, // Skip verification for testing
      isSeller: false,
      wallet: {
        balance: 0,
        hold: 0
      },
      stats: {
        totalVolume: 0,
        level: 1,
        successfulTrades: 0,
        failedTrades: 0
      },
      isOnline: false,
      lastSeenAt: new Date(),
      refreshTokens: [],
      badges: [],
      authLogs: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('users').insertOne(user);
    console.log('\n✅ User created successfully!');
    console.log('Email:', 'baraaweal24@gmail.com');
    console.log('Password:', 'Baraa123580');
    console.log('Username:', 'baraaweal24');
    console.log('User ID:', result.insertedId);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createUser();
