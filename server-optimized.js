// High Performance Server Configuration
import express from "express";
import dotenv from "dotenv";
import next from "next";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import cluster from "cluster";
import os from "os";
import connectDB from "./src/config/db.js";
import redis from "./src/config/redis.js";
import authRoutes from "./src/modules/auth/auth.routes.js";
import userRoutes from "./src/modules/users/user.routes.js";
import chatRoutes from "./src/modules/chats/chat.routes.js";
import adminRoutes from "./src/modules/admin/admin.routes.js";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { globalLimiter } from "./src/middlewares/rateLimiter.js";
import csrfProtection from "./src/middlewares/csrf.js";
import userCacheService from "./src/services/userCacheService.js";
import SocketService from "./src/services/socketService.js";

dotenv.config();

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "5000", 10);

// Performance optimizations
process.env.UV_THREADPOOL_SIZE = os.cpus().length;

// Clustering for high load (if not using PM2)
if (cluster.isPrimary && process.env.NODE_ENV === 'production' && !process.env.PM2_USAGE) {
    console.log(`🚀 Master ${process.pid} is running`);

    // Fork workers
    const numCPUs = os.cpus().length;
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`💀 Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
    });
} else {
    startServer();
}

async function startServer() {
    // Initialize services first
    await initializeServices();

    // Create Next.js app
    const nextApp = next({ dev, hostname, port });
    const nextHandler = nextApp.getRequestHandler();

    await nextApp.prepare();

    // Create Express app
    const app = express();

    // Security and performance middleware
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "ws:", "wss:"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
        crossOriginEmbedderPolicy: false,
    }));

    app.use(cors({
        origin: process.env.NODE_ENV === 'production'
            ? ['https://your-domain.com']
            : ['http://localhost:3000', 'http://localhost:5000'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
    }));

    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use(cookieParser());

    // Rate limiting
    app.use(globalLimiter);

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            worker: process.pid
        });
    });

    // API Routes
    app.use("/api/v1/auth", authRoutes);
    app.use("/api/v1/users", userRoutes);
    app.use("/api/v1/chats", chatRoutes);
    app.use("/api/v1/admin", adminRoutes);

    // Legacy auth routes
    app.use("/api/auth", authRoutes);

    // Next.js routes
    app.all("*", (req, res) => {
        return nextHandler(req, res);
    });

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize Socket.IO with Redis adapter
    await initializeSocketIO(httpServer);

    // Start server
    httpServer.listen(port, hostname, () => {
        console.log(`🚀 Worker ${process.pid} running on http://${hostname}:${port}`);
        console.log(`🌐 Frontend: http://${hostname}:${port}`);
        console.log(`🔗 API: http://${hostname}:${port}/api/v1`);
        console.log(`💬 Socket.IO: ws://${hostname}:${port}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('💤 Gracefully shutting down...');
        httpServer.close(() => {
            console.log('✅ Process terminated');
            process.exit(0);
        });
    });
}

async function initializeServices() {
    let mongoConnected = false;
    let redisConnected = false;

    try {
        console.log('🔄 Attempting to connect to MongoDB...');
        await connectDB();
        mongoConnected = true;
    } catch (error) {
        console.warn('⚠️ MongoDB connection failed:', error.message);
    }

    try {
        console.log('🔄 Attempting to connect to Redis...');
        redisConnected = await redis.connect();
    } catch (error) {
        console.warn('⚠️ Redis connection failed:', error.message);
    }

    if (mongoConnected && redisConnected) {
        console.log('✅ All services initialized successfully');
    }

    return { mongoConnected, redisConnected };
}

async function initializeSocketIO(httpServer) {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: process.env.NODE_ENV === 'production'
                ? ['https://your-domain.com']
                : ['http://localhost:3000', 'http://localhost:5000'],
            methods: ["GET", "POST"],
            credentials: true
        },
        // Performance optimizations
        transports: ['websocket', 'polling'],
        allowEIO3: true,
        pingTimeout: 60000,
        pingInterval: 25000,
        maxHttpBufferSize: 1e6, // 1MB
        // Connection limits
        connectionStateRecovery: {
            maxDisconnectionDuration: 2 * 60 * 1000,
            skipMiddlewares: true,
        }
    });

    // Redis adapter for clustering
    if (process.env.REDIS_ADAPTER === 'true') {
        try {
            const pubClient = createClient({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT) || 6379,
                password: process.env.REDIS_PASSWORD,
            });

            const subClient = pubClient.duplicate();

            await pubClient.connect();
            await subClient.connect();

            io.adapter(createAdapter(pubClient, subClient));
            console.log('🔌 Socket.IO Redis adapter initialized');
        } catch (error) {
            console.warn('⚠️ Redis adapter failed, using memory adapter:', error.message);
        }
    }

    // Initialize Socket service
    const socketService = new SocketService(io);
    socketService.initialize();

    console.log('🔌 Socket.IO initialized for real-time chat');
}