import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Deposit from '../src/modules/deposits/deposit.model.js';
import { encrypt } from '../src/utils/encryption.js';

// Load environment variables
dotenv.config();

/**
 * 🔐 Script to encrypt existing deposit data
 * 
 * This script will:
 * 1. Connect to your MongoDB database
 * 2. Find all deposits with unencrypted data
 * 3. Encrypt sensitive fields (senderFullName, senderPhoneOrEmail, gameTitle)
 * 4. Save the encrypted data back to database
 * 
 * ⚠️ IMPORTANT:
 * - Make a database backup before running this script!
 * - Make sure ENCRYPTION_KEY is set in your .env file
 * - This script is safe to run multiple times (skips already encrypted data)
 */

async function encryptExistingDeposits() {
    console.log('╔════════════════════════════════════════╗');
    console.log('║   🔐 Encrypt Existing Deposits        ║');
    console.log('╚════════════════════════════════════════╝\n');

    try {
        // Check if ENCRYPTION_KEY is set
        if (!process.env.ENCRYPTION_KEY) {
            console.error('❌ ERROR: ENCRYPTION_KEY not found in .env file!');
            console.error('\nPlease run: node scripts/setup-encryption.js first\n');
            process.exit(1);
        }

        // Connect to MongoDB
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/accountsstore';
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB\n');

        // Fetch all deposits
        const deposits = await Deposit.find();
        console.log(`📊 Found ${deposits.length} total deposits\n`);

        if (deposits.length === 0) {
            console.log('ℹ️  No deposits found. Nothing to encrypt.\n');
            await mongoose.disconnect();
            return;
        }

        let encrypted = 0;
        let skipped = 0;
        let errors = 0;

        console.log('🔄 Processing deposits...\n');

        for (const deposit of deposits) {
            try {
                // Check if data is already encrypted
                // Encrypted data contains ":" (format: iv:authTag:data)
                const isNameEncrypted = deposit.senderFullName?.includes(':');
                const isContactEncrypted = deposit.senderPhoneOrEmail?.includes(':');
                const isTitleEncrypted = deposit.gameTitle ? deposit.gameTitle.includes(':') : true;

                if (isNameEncrypted && isContactEncrypted && isTitleEncrypted) {
                    skipped++;
                    process.stdout.write(`⏭️  Deposit ${deposit._id}: Already encrypted (skipped)\r`);
                    continue;
                }

                // Encrypt unencrypted fields
                let modified = false;

                if (!isNameEncrypted && deposit.senderFullName) {
                    deposit.senderFullName = encrypt(deposit.senderFullName);
                    modified = true;
                }

                if (!isContactEncrypted && deposit.senderPhoneOrEmail) {
                    deposit.senderPhoneOrEmail = encrypt(deposit.senderPhoneOrEmail);
                    modified = true;
                }

                if (!isTitleEncrypted && deposit.gameTitle) {
                    deposit.gameTitle = encrypt(deposit.gameTitle);
                    modified = true;
                }

                if (modified) {
                    await deposit.save();
                    encrypted++;
                    console.log(`✅ Encrypted deposit ${deposit._id}`);
                }

            } catch (error) {
                errors++;
                console.error(`❌ Error encrypting deposit ${deposit._id}:`, error.message);
            }
        }

        console.log('\n╔════════════════════════════════════════╗');
        console.log('║   ✅ Encryption Complete!             ║');
        console.log('╚════════════════════════════════════════╝\n');

        console.log('📊 Summary:');
        console.log(`   Total deposits: ${deposits.length}`);
        console.log(`   ✅ Newly encrypted: ${encrypted}`);
        console.log(`   ⏭️  Already encrypted (skipped): ${skipped}`);
        console.log(`   ❌ Errors: ${errors}\n`);

        if (encrypted > 0) {
            console.log('🔒 Sensitive data is now encrypted in your database!');
            console.log('   Next time you fetch deposits, they will be automatically decrypted.\n');
        }

        if (errors > 0) {
            console.log('⚠️  Some deposits had errors. Please check the logs above.\n');
        }

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB\n');

    } catch (error) {
        console.error('\n❌ Fatal Error:', error.message);
        console.error('\nStack trace:', error.stack);
        console.error('\nEncryption failed. Please check your configuration.\n');
        process.exit(1);
    }
}

// Confirmation prompt in development
if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  WARNING: You are running this in PRODUCTION!');
    console.log('⚠️  Make sure you have a database backup before proceeding.\n');

    // In production, require explicit confirmation
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    readline.question('Type "yes" to continue: ', (answer) => {
        readline.close();

        if (answer.toLowerCase() === 'yes') {
            encryptExistingDeposits();
        } else {
            console.log('\n❌ Cancelled by user\n');
            process.exit(0);
        }
    });
} else {
    // In development, run directly
    encryptExistingDeposits();
}
