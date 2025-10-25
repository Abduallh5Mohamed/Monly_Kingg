import mongoose from 'mongoose';
import Chat from '../src/modules/chats/chat.model.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/accountsstore';

async function addChatNumbers() {
    try {
        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find all chats without chatNumber
        const chatsWithoutNumbers = await Chat.find({
            $or: [
                { chatNumber: { $exists: false } },
                { chatNumber: null },
                { chatNumber: '' }
            ]
        });

        console.log(`📊 Found ${chatsWithoutNumbers.length} chats without chat numbers`);

        if (chatsWithoutNumbers.length === 0) {
            console.log('✅ All chats already have chat numbers!');
            await mongoose.disconnect();
            return;
        }

        let updated = 0;
        let failed = 0;

        for (const chat of chatsWithoutNumbers) {
            try {
                // Generate a unique chat number
                const chatNumber = await Chat.generateChatNumber();

                // Update the chat
                chat.chatNumber = chatNumber;
                await chat.save();

                updated++;
                console.log(`✅ Updated chat ${chat._id} with number: ${chatNumber}`);
            } catch (error) {
                failed++;
                console.error(`❌ Failed to update chat ${chat._id}:`, error.message);
            }
        }

        console.log('\n📈 Migration Summary:');
        console.log(`   Total chats: ${chatsWithoutNumbers.length}`);
        console.log(`   ✅ Successfully updated: ${updated}`);
        console.log(`   ❌ Failed: ${failed}`);

        // Disconnect from MongoDB
        await mongoose.disconnect();
        console.log('\n✅ Migration completed and disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Run the migration
addChatNumbers();
