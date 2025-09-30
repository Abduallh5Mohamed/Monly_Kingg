// خادم اختبار بسيط لاختبار الضغط
import express from 'express';
import dotenv from 'dotenv';
import connectDB from './src/config/db.js';
import redis from './src/config/redis.js';
import authRoutes from './src/modules/auth/auth.routes.js';
import userRoutes from './src/modules/users/user.routes.js';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();
const port = process.env.TEST_PORT || 6000;

// الوسائل المتوسطة الأساسية
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// الطرق (Routes)
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// صفحة اختبار بسيطة
app.get('/', (req, res) => {
    res.json({
        message: 'Test Server is Running!',
        timestamp: new Date().toISOString(),
        server: 'Express Test Server',
        redis: redis.isConnected ? 'Connected' : 'Disconnected',
        mongodb: 'Connected' // سنتحقق من هذا لاحقاً
    });
});

// مراقب الكاش
app.get('/api/cache-monitor', async (req, res) => {
    try {
        if (!redis.isConnected) {
            return res.status(503).json({ error: 'Redis not connected' });
        }

        const info = await redis.client.info();
        const lines = info.split('\r\n');
        const stats = {};

        lines.forEach(line => {
            if (line.includes(':')) {
                const [key, value] = line.split(':');
                stats[key] = value;
            }
        });

        res.json({
            connected: true,
            stats: {
                connectedClients: stats.connected_clients || 0,
                usedMemory: Math.round((stats.used_memory || 0) / 1024 / 1024) + ' MB',
                keyspaceHits: stats.keyspace_hits || 0,
                keyspaceMisses: stats.keyspace_misses || 0,
                totalCommands: stats.total_commands_processed || 0
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// معالج الأخطاء
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
});

// معالج الطرق غير الموجودة
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// بدء الخادم
async function startServer() {
    try {
        console.log('🚀 Starting Test Server...');

        // الاتصال بـ MongoDB
        await connectDB();

        // الاتصال بـ Redis
        await redis.connect();

        app.listen(port, () => {
            console.log(`✅ Test Server running on port ${port}`);
            console.log(`🌐 URL: http://localhost:${port}`);
            console.log(`🔗 API: http://localhost:${port}/api`);
            console.log(`📊 Cache Monitor: http://localhost:${port}/api/cache-monitor`);
            console.log('');
            console.log('Ready for load testing! 🎯');
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

startServer();