/**
 * 🔐 Encrypt Existing Transaction Credentials
 * 
 * This script encrypts all existing plaintext credentials stored in the
 * transactions collection. Run this ONCE after deploying the credential
 * encryption feature.
 *
 * Usage:
 *   node scripts/encrypt-existing-credentials.js
 *
 * Make sure ENCRYPTION_KEY is set in your .env before running.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { encrypt } from '../src/utils/encryption.js';

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ MONGODB_URI or MONGO_URI not set in .env');
    process.exit(1);
}

if (!process.env.ENCRYPTION_KEY) {
    console.error('❌ ENCRYPTION_KEY not set in .env — cannot encrypt credentials');
    process.exit(1);
}

async function main() {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('transactions');

    // Find all transactions that have credentials
    const cursor = collection.find({
        'credentials.0': { $exists: true }
    });

    let total = 0;
    let encrypted = 0;
    let skipped = 0;

    while (await cursor.hasNext()) {
        const tx = await cursor.next();
        total++;

        // Check if already encrypted (encrypted values have format iv:authTag:data with 3 colon-separated hex parts)
        const isAlreadyEncrypted = tx.credentials.every(c => {
            const parts = c.value?.split(':');
            return parts?.length === 3 && parts.every(p => /^[0-9a-f]+$/i.test(p));
        });

        if (isAlreadyEncrypted) {
            skipped++;
            continue;
        }

        // Encrypt each credential value
        const encryptedCredentials = tx.credentials.map(c => ({
            key: c.key,
            value: encrypt(c.value),
            _id: c._id,
        }));

        await collection.updateOne(
            { _id: tx._id },
            { $set: { credentials: encryptedCredentials } }
        );

        encrypted++;
        if (encrypted % 100 === 0) {
            console.log(`  ... encrypted ${encrypted} transactions so far`);
        }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  Total transactions with credentials: ${total}`);
    console.log(`  Encrypted: ${encrypted}`);
    console.log(`  Already encrypted (skipped): ${skipped}`);
    console.log('\n✅ Done!');

    await mongoose.disconnect();
}

main().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
