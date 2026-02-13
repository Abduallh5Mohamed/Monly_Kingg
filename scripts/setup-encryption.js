import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ENV_PATH = path.join(__dirname, '..', '.env');

// Generate a secure 32-byte (256-bit) encryption key
function generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
}

// Check if .env file exists, if not create from .env.example
function ensureEnvFile() {
    if (!fs.existsSync(ENV_PATH)) {
        const examplePath = path.join(__dirname, '..', '.env.example');

        if (fs.existsSync(examplePath)) {
            console.log('📋 .env file not found, creating from .env.example...');
            fs.copyFileSync(examplePath, ENV_PATH);
            console.log('✅ Created .env file from template');
        } else {
            console.log('📝 Creating new .env file...');
            fs.writeFileSync(ENV_PATH, '# Environment Configuration\n\n');
            console.log('✅ Created new .env file');
        }
    }
}

// Add or update ENCRYPTION_KEY in .env
function setupEncryptionKey() {
    console.log('\n🔐 Setting up encryption key...\n');

    // Ensure .env exists
    ensureEnvFile();

    // Read current .env content
    let envContent = fs.readFileSync(ENV_PATH, 'utf8');

    // Check if ENCRYPTION_KEY already exists
    const keyRegex = /^ENCRYPTION_KEY=(.+)$/m;
    const match = envContent.match(keyRegex);

    if (match) {
        const existingKey = match[1].trim();

        // Check if it's a placeholder or real key
        if (existingKey.includes('REPLACE') ||
            existingKey.includes('your_') ||
            existingKey.length !== 64) {

            console.log('⚠️  Found placeholder ENCRYPTION_KEY, generating new one...');
            const newKey = generateEncryptionKey();
            envContent = envContent.replace(keyRegex, `ENCRYPTION_KEY=${newKey}`);
            fs.writeFileSync(ENV_PATH, envContent);

            console.log('✅ Generated and saved new encryption key');
            console.log('🔑 Your encryption key:', newKey);
            console.log('\n⚠️  IMPORTANT: Save this key securely! If you lose it, you cannot decrypt your data.\n');
        } else {
            console.log('✅ Valid ENCRYPTION_KEY already exists');
            console.log('🔑 Current key:', existingKey);
            console.log('\n✓  No changes needed. Your encryption is ready!\n');
        }
    } else {
        // ENCRYPTION_KEY doesn't exist, add it
        console.log('⚠️  ENCRYPTION_KEY not found, generating new one...');
        const newKey = generateEncryptionKey();

        // Add it at the beginning of the file for visibility
        const keySection = `# 🔐 Security Configuration\n# CRITICAL: Keep this key secret and backed up!\nENCRYPTION_KEY=${newKey}\n\n`;
        envContent = keySection + envContent;

        fs.writeFileSync(ENV_PATH, envContent);

        console.log('✅ Generated and saved encryption key to .env');
        console.log('🔑 Your encryption key:', newKey);
        console.log('\n⚠️  IMPORTANT: Save this key securely! If you lose it, you cannot decrypt your data.\n');
    }

    // Security reminders
    console.log('📋 Security Checklist:');
    console.log('  ✓ Encryption key generated/verified');
    console.log('  ⚠️  Make sure .env is in .gitignore');
    console.log('  ⚠️  Keep a secure backup of this key');
    console.log('  ⚠️  Never share this key publicly');
    console.log('  ⚠️  Use different keys for dev/staging/production\n');
}

// Verify .gitignore contains .env
function verifyGitignore() {
    const gitignorePath = path.join(__dirname, '..', '.gitignore');

    if (fs.existsSync(gitignorePath)) {
        const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');

        if (!gitignoreContent.includes('.env')) {
            console.log('⚠️  WARNING: .env is not in .gitignore!');
            console.log('   Adding .env to .gitignore...');

            fs.appendFileSync(gitignorePath, '\n# Environment variables\n.env\n');
            console.log('✅ Added .env to .gitignore\n');
        } else {
            console.log('✓ .env is properly ignored by git\n');
        }
    } else {
        console.log('⚠️  .gitignore not found, creating...');
        fs.writeFileSync(gitignorePath, '# Environment variables\n.env\n');
        console.log('✅ Created .gitignore with .env\n');
    }
}

// Main execution
console.log('╔════════════════════════════════════════╗');
console.log('║   🔐 Encryption Setup Utility         ║');
console.log('╚════════════════════════════════════════╝\n');

try {
    setupEncryptionKey();
    verifyGitignore();

    console.log('╔════════════════════════════════════════╗');
    console.log('║   ✅ Setup Complete!                  ║');
    console.log('╚════════════════════════════════════════╝\n');

    console.log('Next steps:');
    console.log('1. Review your .env file');
    console.log('2. Backup your ENCRYPTION_KEY securely');
    console.log('3. Read docs/HOW_TO_ENABLE_ENCRYPTION.md for usage');
    console.log('4. Run: npm run dev\n');

} catch (error) {
    console.error('\n❌ Error during setup:', error.message);
    console.error('\nPlease check file permissions and try again.\n');
    process.exit(1);
}
