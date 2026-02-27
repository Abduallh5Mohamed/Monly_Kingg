require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/accountstore');
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const user = await User.findOne({ username: 'baraa72' }).select('username avatar updatedAt');
    
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }
    
    console.log('Username:', user.username);
    console.log('Has Avatar:', !!user.avatar);
    console.log('Avatar:', user.avatar || 'NONE');
    console.log('Updated:', user.updatedAt);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
