/**
 * 🧹 Clean Test Users Script
 * 
 * SAFE script to delete test users from database
 * Use this BEFORE production deployment
 * 
 * This script:
 * ✓ Only deletes users with test email patterns
 * ✓ Shows confirmation before deletion
 * ✓ Provides detailed report
 * ✓ Safe for production database
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import readline from 'readline';

dotenv.config({ path: '../.env' });

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/accountsstore';

// Define User schema (minimal)
const userSchema = new mongoose.Schema({
    email: String,
    username: String,
    verified: Boolean,
    createdAt: Date
}, { strict: false });

const User = mongoose.model('User', userSchema);

// Test user patterns to delete
const TEST_PATTERNS = [
    /^loadtest.*@test\.(com|local)$/i,      // loadtest1@test.com
    /^test\d+@test\.(com|local)$/i,         // test1@test.com
    /^testuser\d+@test\.(com|local)$/i,     // testuser1@test.com
    /.*@test\.local$/i                       // anything@test.local
];

/**
 * Find all test users matching patterns
 */
async function findTestUsers() {
    const orConditions = TEST_PATTERNS.map(pattern => ({ email: pattern }));

    const users = await User.find({
        $or: orConditions
    }).select('email username verified createdAt').sort({ createdAt: -1 });

    return users;
}

/**
 * Ask for user confirmation
 */
function askConfirmation(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}

/**
 * Main cleanup function
 */
async function cleanupTestUsers() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to database\n');

        // Find test users
        console.log('🔍 Searching for test users...\n');
        const testUsers = await findTestUsers();

        if (testUsers.length === 0) {
            console.log('✅ No test users found. Database is clean!');
            return;
        }

        // Display found users
        console.log(`📋 Found ${testUsers.length} test users:\n`);
        console.log('┌─────────────────────────────────────────────────────────────────┐');
        console.log('│ Email                          │ Username        │ Verified     │');
        console.log('├─────────────────────────────────────────────────────────────────┤');

        testUsers.slice(0, 10).forEach(user => {
            const email = (user.email || '').padEnd(30);
            const username = (user.username || '').padEnd(15);
            const verified = user.verified ? '✓' : '✗';
            console.log(`│ ${email} │ ${username} │ ${verified.padEnd(12)} │`);
        });

        if (testUsers.length > 10) {
            console.log(`│ ... and ${testUsers.length - 10} more users`);
        }

        console.log('└─────────────────────────────────────────────────────────────────┘\n');

        // Email patterns summary
        console.log('📊 Breakdown by pattern:');
        TEST_PATTERNS.forEach(pattern => {
            const count = testUsers.filter(u => pattern.test(u.email)).length;
            if (count > 0) {
                console.log(`   - ${pattern.source}: ${count} users`);
            }
        });
        console.log('');

        // Ask for confirmation
        const confirmed = await askConfirmation(
            `⚠️  Delete all ${testUsers.length} test users? (y/N): `
        );

        if (!confirmed) {
            console.log('❌ Deletion cancelled.');
            return;
        }

        // Double confirmation for production
        if (process.env.NODE_ENV === 'production') {
            console.log('\n🚨 WARNING: Running in PRODUCTION environment!');
            const prodConfirmed = await askConfirmation(
                'Are you ABSOLUTELY sure you want to delete these users in PRODUCTION? (y/N): '
            );

            if (!prodConfirmed) {
                console.log('❌ Deletion cancelled.');
                return;
            }
        }

        // Delete users
        console.log('\n🗑️  Deleting test users...');
        const result = await User.deleteMany({
            $or: TEST_PATTERNS.map(pattern => ({ email: pattern }))
        });

        // Report results
        console.log('\n✅ Cleanup completed!');
        console.log('┌─────────────────────────────────────┐');
        console.log(`│ Users deleted: ${result.deletedCount}`.padEnd(38) + '│');
        console.log(`│ Time: ${new Date().toLocaleString()}`.padEnd(38) + '│');
        console.log('└─────────────────────────────────────┘\n');

        // Verify cleanup
        const remaining = await findTestUsers();
        if (remaining.length === 0) {
            console.log('✅ Verification: Database is now clean!');
        } else {
            console.log(`⚠️  Warning: ${remaining.length} test users still remain.`);
            console.log('   You may need to review and delete them manually.');
        }

    } catch (error) {
        console.error('\n❌ Error during cleanup:', error.message);

        if (error.name === 'MongooseError') {
            console.error('\n💡 Tip: Check your MONGO_URI in .env file');
        }

        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from database');
    }
}

/**
 * Show stats without deleting
 */
async function showStats() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected\n');

        const testUsers = await findTestUsers();
        const totalUsers = await User.countDocuments();
        const realUsers = totalUsers - testUsers.length;

        console.log('📊 Database Statistics:\n');
        console.log(`   Total users:     ${totalUsers}`);
        console.log(`   Test users:      ${testUsers.length}`);
        console.log(`   Real users:      ${realUsers}`);
        console.log(`   Percentage test: ${((testUsers.length / totalUsers) * 100).toFixed(2)}%\n`);

        if (testUsers.length > 0) {
            console.log('💡 Run this script without --stats flag to delete test users');
        } else {
            console.log('✅ No test users found');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
    }
}

// CLI Interface
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧹 Clean Test Users Script

Usage:
  node clean-test-users.js [options]

Options:
  --stats, -s    Show statistics without deleting
  --help, -h     Show this help message

Examples:
  node clean-test-users.js          # Delete test users (with confirmation)
  node clean-test-users.js --stats  # Show statistics only

Test user patterns that will be deleted:
  - loadtest*@test.com
  - loadtest*@test.local
  - test1@test.com (any number)
  - testuser1@test.com (any number)
  - anything@test.local

⚠️  IMPORTANT: Always backup your database before running cleanup!
    `);
    process.exit(0);
}

// Run script
console.log(`
╔════════════════════════════════════════════════════════════════╗
║          🧹 Test Users Cleanup Script                         ║
║                                                                ║
║  This script will safely remove test users from database      ║
║  Created during load testing and development                  ║
╚════════════════════════════════════════════════════════════════╝
`);

if (args.includes('--stats') || args.includes('-s')) {
    showStats()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Error:', error);
            process.exit(1);
        });
} else {
    cleanupTestUsers()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Error:', error);
            process.exit(1);
        });
}
