// MongoDB User Creation Script
import { MongoClient } from 'mongodb';

async function createUser() {
  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const accountsDb = client.db('accountsstore');

    // Create user in accountsstore database
    await accountsDb.command({
      createUser: "MonlyKing580123",
      pwd: "Mo1nly5890",
      roles: [
        { role: "readWrite", db: "accountsstore" }
      ]
    });

    console.log('✅ User created successfully!');
    console.log('Username: MonlyKing580123');
    console.log('Database: accountsstore');

  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    if (error.message.includes('User already exists')) {
      console.log('💡 User already exists, that\'s okay!');
    }
  } finally {
    await client.close();
  }
}

createUser();