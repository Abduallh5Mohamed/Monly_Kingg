import app from "./app.js";

const PORT = process.env.PORT || 5000;

// Production-ready server configuration
const server = app.listen(PORT, () => {
    console.log(`✅ Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Optimize server for high concurrency
server.maxConnections = 10000; // Max simultaneous connections
server.timeout = 30000; // 30 seconds timeout
server.keepAliveTimeout = 65000; // 65 seconds (longer than load balancer timeout)
server.headersTimeout = 66000; // Slightly longer than keepAliveTimeout

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received. Closing server gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received. Closing server gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

export default server;
