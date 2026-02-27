const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const Game = mongoose.model('Game', new mongoose.Schema({ name: String }));
    const games = await Game.find().sort({ name: 1 });
    console.log('\n=== Games in database ===');
    games.forEach((g, i) => {
        console.log(`${i + 1}. ${g.name} (ID: ${g._id})`);
    });
    console.log(`\nTotal: ${games.length} games\n`);
    mongoose.connection.close();
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
