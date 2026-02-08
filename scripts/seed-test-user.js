import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from '../src/config/db.js';
import User from '../src/modules/users/user.model.js';

async function run() {
  const email = process.env.SEED_USER_EMAIL || 'monlykingstore@gmail.com';
  const username = process.env.SEED_USER_USERNAME || 'monlyking';
  const password = process.env.SEED_USER_PASSWORD || 'Test@1234';
  const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

  try {
    const ok = await connectDB();
    if (!ok) {
      console.error('Failed to connect to MongoDB. Check MONGO_URI in .env');
      process.exit(1);
    }

    const existing = await User.findOne({ email });
    if (existing) {
      console.log(`User already exists: ${email}`);
      // ensure verified
      if (!existing.verified) {
        existing.verified = true;
        await existing.save();
        console.log('Marked existing user as verified.');
      }
      await mongoose.disconnect();
      return;
    }

    const passwordHash = await bcrypt.hash(password, rounds);

    const user = await User.create({
      email,
      username,
      passwordHash,
      role: 'user',
      verified: true
    });

    console.log('✅ Seed user created:');
    console.log({ email: user.email, username: user.username, verified: user.verified });
    console.log(`Temporary password: ${password}`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Seed failed:', err.message);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
}

run();
