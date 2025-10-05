const path = require('path');

module.exports = {
    apps: [
        {
            name: 'accounts-store-cluster',
            script: path.join(__dirname, 'server-optimized.js'),
            instances: 'max', // Use all CPU cores
            exec_mode: 'cluster',
            max_memory_restart: '4G',
            node_args: '--max-old-space-size=4096',
            env: {
                NODE_ENV: 'production',
                PORT: 5000,
                UV_THREADPOOL_SIZE: 64,
                REDIS_URL: 'redis://localhost:6379'
            },
            env_development: {
                NODE_ENV: 'development',
                PORT: 5000
            },
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            min_uptime: '10s',
            max_restarts: 5,
            restart_delay: 4000,

            // Health check
            health_check_grace_period: 3000,
            health_check_fatal_exceptions: true,

            // Performance monitoring
            pmx: true,

            // Auto restart on file changes (development only)
            watch: false,
            ignore_watch: ['node_modules', 'logs', '*.log'],

            // Instance management
            kill_timeout: 5000,
            listen_timeout: 8000,

            // Load balancing
            instance_var: 'INSTANCE_ID'
        }
    ]
};