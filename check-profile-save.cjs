const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/accountstore')
  .then(async () => {
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    // Find baraa72 user
    const user = await User.findOne({ username: 'baraa72' })
      .select('username avatar')
      .lean();

    if (!user) {
      console.log('User not found');
    } else {
      console.log('Username:', user.username);
      console.log('Avatar:', user.avatar || 'EMPTY');
      console.log('Length:', user.avatar?.length || 0);
    }

    mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
