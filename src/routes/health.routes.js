import express from 'express';
import mongoose from 'mongoose';
import redis from '../config/redis.js';
import os from 'os';

const router = express.Router();

// Health check endpoint
router.get('/health', async (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        service: 'accounts-store-api',
        version: process.env.npm_package_version || '1.0.0'
    };

    try {
        // Check MongoDB
        const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        health.mongodb = {
            status: mongoStatus,
            host: mongoose.connection.host || 'unknown'
        };

        // Check Redis
        let redisStatus = 'unknown';
        try {
            await redis.ping();
            redisStatus = 'connected';
        } catch (error) {
            redisStatus = 'disconnected';
        }
        health.redis = { status: redisStatus };

        // System metrics
        health.system = {
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                external: Math.round(process.memoryUsage().external / 1024 / 1024),
                unit: 'MB'
            },
            cpu: {
                loadAverage: os.loadavg(),
                cores: os.cpus().length
            },
            platform: process.platform,
            nodeVersion: process.version
        };

        // Overall health status
        const isHealthy = mongoStatus === 'connected' && redisStatus === 'connected';
        health.status = isHealthy ? 'healthy' : 'degraded';

        const statusCode = isHealthy ? 200 : 503;
        res.status(statusCode).json(health);

    } catch (error) {
        res.status(503).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Readiness check (for k8s/load balancer)
router.get('/ready', async (req, res) => {
    try {
        // Check if MongoDB is ready
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                ready: false,
                reason: 'MongoDB not connected'
            });
        }

        // Check if Redis is ready
        try {
            await redis.ping();
        } catch (error) {
            return res.status(503).json({
                ready: false,
                reason: 'Redis not connected'
            });
        }

        res.json({ ready: true });
    } catch (error) {
        res.status(503).json({
            ready: false,
            reason: error.message
        });
    }
});

// Liveness check (for k8s)
router.get('/alive', (req, res) => {
    res.json({ alive: true });
});

// Metrics endpoint (Prometheus format)
router.get('/metrics', async (req, res) => {
    const metrics = {
        // Process metrics
        process_uptime_seconds: process.uptime(),
        process_memory_heap_used_bytes: process.memoryUsage().heapUsed,
        process_memory_heap_total_bytes: process.memoryUsage().heapTotal,
        process_memory_external_bytes: process.memoryUsage().external,
        process_cpu_user_seconds_total: process.cpuUsage().user / 1000000,
        process_cpu_system_seconds_total: process.cpuUsage().system / 1000000,

        // System metrics
        system_cpu_count: os.cpus().length,
        system_memory_total_bytes: os.totalmem(),
        system_memory_free_bytes: os.freemem(),
        system_load_average_1m: os.loadavg()[0],
        system_load_average_5m: os.loadavg()[1],
        system_load_average_15m: os.loadavg()[2],

        // Database metrics
        mongodb_connection_state: mongoose.connection.readyState,

        // Timestamp
        timestamp: Date.now()
    };

    res.json(metrics);
});

export default router;
