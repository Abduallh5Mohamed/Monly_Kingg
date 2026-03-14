import express from 'express';
import mongoose from 'mongoose';
import redis from '../config/redis.js';
import os from 'os';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireAdmin } from '../middlewares/roleMiddleware.js';
const router = express.Router();

// Health check endpoint — protected by global limiter
router.get('/health', (req, res) => {
    const isHealthy = mongoose.connection.readyState === 1;
    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'ok' : 'degraded'
    });
});

// Readiness check (for k8s/load balancer)
router.get('/ready', authMiddleware, requireAdmin, async (req, res) => {
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
router.get('/metrics', authMiddleware, requireAdmin, async (req, res) => {
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
