require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/accountstore')
  .then(async () => {
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    const user = await User.findOne({ username: 'baraa72' });

    if (user) {
      console.log('=== User Info ===');
      console.log('Username:', user.username);
      console.log('Has Avatar:', !!user.avatar);

      if (user.avatar) {
        console.log('Avatar Path:', user.avatar);
        console.log('Avatar Type:', typeof user.avatar);

        // Check if file exists
        const fs = require('fs');
        const path = require('path');

        if (user.avatar.startsWith('/uploads/')) {
          const filepath = path.join(__dirname, user.avatar);
          console.log('File Path:', filepath);
          console.log('File Exists:', fs.existsSync(filepath));

          if (fs.existsSync(filepath)) {
            const stats = fs.statSync(filepath);
            console.log('File Size:', (stats.size / 1024).toFixed(2), 'KB');
          }
        } else if (user.avatar.startsWith('data:')) {
          console.log('Avatar is base64, length:', user.avatar.length);
        }
      } else {
        console.log('❌ No avatar found for user');
      }

      // Check last update
      console.log('\n=== Timestamps ===');
      console.log('Updated At:', user.updatedAt);
      console.log('Created At:', user.createdAt);
    } else {
      console.log('❌ User not found');
    }

    await mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
