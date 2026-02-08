import mongoose from 'mongoose';

const mongoUri = 'mongodb://localhost:27017/accountsstore';

async function checkUser() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const user = await db.collection('users').findOne(
      { email: 'baraaweal24@gmail.com' },
      { projection: { email: 1, username: 1, verified: 1, role: 1, passwordHash: 1 } }
    );
    
    if (user) {
      console.log('\nUser found:');
      console.log('Email:', user.email);
      console.log('Username:', user.username);
      console.log('Verified:', user.verified);
      console.log('Role:', user.role);
      console.log('Has Password Hash:', !!user.passwordHash);
      console.log('Password Hash length:', user.passwordHash?.length);
    } else {
      console.log('\nUser NOT found in database');
    }
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUser();
