import mongoose from 'mongoose';

console.log('🧪 Testing MongoDB Connection with Authentication');

async function testConnection() {
  try {
    const uri = 'mongodb://MonlyKing580123:Mo1nly5890@localhost:27017/accountsstore';

    await mongoose.connect(uri);
    console.log('✅ MongoDB Connected Successfully with Authentication!');

    // Test basic operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections in database`);

    await mongoose.disconnect();
    console.log('✅ Test completed successfully');

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();