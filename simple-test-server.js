// خادم اختبار ضغط بسيط جداً
import express from 'express';

const app = express();
const port = 7000;

app.use(express.json());

// صفحة رئيسية بسيطة
app.get('/', (req, res) => {
    res.json({
        message: 'Load Test Server is Running!',
        timestamp: new Date().toISOString(),
        server: 'Simple Express Server'
    });
});

// API بسيط لتسجيل الدخول
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    // محاكاة فحص بسيط
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    // محاكاة رفض تسجيل الدخول
    if (email === 'test@example.com' && password === 'password123') {
        return res.json({
            success: true,
            message: 'Login successful',
            user: { email, id: 1 }
        });
    }

    return res.status(401).json({ error: 'Invalid credentials' });
});

// معلومات الخادم
app.get('/api/info', (req, res) => {
    res.json({
        server: 'Load Test Server',
        port: port,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
    });
});

// بدء الخادم
app.listen(port, '0.0.0.0', () => {
    console.log('🚀 Simple Load Test Server Started');
    console.log(`✅ Server running on port ${port}`);
    console.log(`🌐 URL: http://localhost:${port}`);
    console.log(`📊 Info: http://localhost:${port}/api/info`);
    console.log('');
    console.log('Ready for load testing! 🎯');
    console.log('Press Ctrl+C to stop');
});

// معالجة إيقاف الخادم
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down server...');
    process.exit(0);
});