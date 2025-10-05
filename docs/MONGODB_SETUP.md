# MongoDB Security Setup Instructions

## 🔐 Setting Up MongoDB Authentication

Since MongoDB CLI is not available in your system, you have two options:

### Option 1: Using MongoDB Compass (Recommended)
1. Download and install MongoDB Compass from: https://www.mongodb.com/products/compass
2. Connect to: `mongodb://localhost:27017`
3. Go to the `accountsstore` database
4. Click on "Users" tab
5. Click "Add User" and create:
   - Username: `MonlyKing580123`
   - Password: `Mo1nly5890`
   - Role: `readWrite`

### Option 2: Enable Authentication in MongoDB Config
1. Find your MongoDB configuration file (usually `mongod.conf`)
2. Add these lines:
```yaml
security:
  authorization: enabled
```
3. Restart MongoDB service
4. Connect as admin and create the user

### Option 3: Manual User Creation (if you have mongo shell access)
```javascript
use accountsstore
db.createUser({
  user: "MonlyKing580123",
  pwd: "Mo1nly5890",
  roles: ["readWrite"]
})
```

## 🧪 Testing the Setup

After creating the user, test the connection:

### Test MongoDB Connection:
```bash
# This should work with new credentials
node -e "
const mongoose = require('mongoose');
mongoose.connect('mongodb://MonlyKing580123:Mo1nly5890@localhost:27017/accountsstore')
  .then(() => console.log('✅ MongoDB Connected with Auth'))
  .catch(err => console.log('❌ MongoDB Connection Failed:', err.message));
"
```

### Test Redis Connection:
```bash
# This should work with password
docker exec accounts_store_redis redis-cli -a "Cache5896" ping
```

## 🚨 Important Notes

1. **Redis is already secured** ✅
2. **MongoDB needs manual setup** (choose one option above)
3. **Your .env file is updated** ✅
4. **Server will fail to start until MongoDB auth is properly configured**

## 🔄 Next Steps

1. Set up MongoDB authentication using one of the methods above
2. Restart your application server
3. Test that everything works correctly

The Redis part is complete and working. MongoDB just needs the user creation step.