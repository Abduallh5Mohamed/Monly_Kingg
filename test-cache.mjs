import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/v1';

console.log('🧪 Testing Cache System');
console.log('=======================\n');

// Test user data
const testUser = {
  email: 'cache_test@example.com',
  username: 'cacheuser',
  password: 'password123'
};

async function testCacheFlow() {
  try {
    console.log('📊 1. Checking initial cache stats...');

    try {
      const statsResponse = await axios.get('http://localhost:5000/api/cache/stats');
      console.log('✅ Cache Stats:', statsResponse.data);
    } catch (error) {
      console.log('⚠️ Could not get cache stats:', error.message);
    }

    console.log('\n📝 2. Testing user registration (will cache verification code)...');

    try {
      const registerResponse = await axios.post(`${API_BASE}/auth/register`, testUser);
      console.log('✅ Registration successful');
      console.log('   Message:', registerResponse.data.message);
    } catch (error) {
      if (error.response?.status === 400 && error.response.data.message.includes('already exists')) {
        console.log('ℹ️ User already exists, continuing with login test...');
      } else {
        console.log('❌ Registration error:', error.response?.data?.message || error.message);
        return;
      }
    }

    console.log('\n🔑 3. Testing login (first time - database + cache)...');
    const loginStart1 = Date.now();

    try {
      const loginResponse1 = await axios.post(`${API_BASE}/auth/login`, {
        email: testUser.email,
        password: testUser.password
      });
      const loginTime1 = Date.now() - loginStart1;
      console.log(`✅ First login successful (${loginTime1}ms)`);
      console.log('   This should show "from DATABASE" in server logs');
    } catch (error) {
      console.log('❌ First login error:', error.response?.data?.message || error.message);
      if (error.response?.data?.message?.includes('verify')) {
        console.log('ℹ️ Email verification required - this is normal for new accounts');
        return;
      }
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n⚡ 4. Testing login (second time - from cache)...');
    const loginStart2 = Date.now();

    try {
      const loginResponse2 = await axios.post(`${API_BASE}/auth/login`, {
        email: testUser.email,
        password: testUser.password
      });
      const loginTime2 = Date.now() - loginStart2;
      console.log(`✅ Second login successful (${loginTime2}ms)`);
      console.log('   This should show "from CACHE" in server logs');

      if (loginTime2 < 50) {
        console.log('🎯 CACHE IS WORKING! Response time is very fast');
      }
    } catch (error) {
      console.log('❌ Second login error:', error.response?.data?.message || error.message);
    }

    console.log('\n📊 5. Final cache stats...');

    try {
      const finalStatsResponse = await axios.get('http://localhost:5000/api/cache/stats');
      console.log('✅ Final Cache Stats:', finalStatsResponse.data);
    } catch (error) {
      console.log('⚠️ Could not get final cache stats:', error.message);
    }

  } catch (error) {
    console.log('❌ Test error:', error.message);
  }
}

// Run the test
testCacheFlow().catch(console.error);