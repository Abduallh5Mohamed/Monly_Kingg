// PM2 Ecosystem Configuration for High Load
export default {
    apps: [
        {
            name: 'accounts-store-cluster',
            script: 'server-optimized.js',
            instances: 'max', // Use all CPU cores
            exec_mode: 'cluster',
            env: {
                NODE_ENV: 'production',
                PORT: 5000,
                REDIS_ADAPTER: 'true'
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 5000
            },
            // Performance optimizations
            node_args: '--max-old-space-size=4096', // 4GB heap
            max_memory_restart: '2G',
            instances_balancer_policy: 'round_robin',

            // Monitoring
            monitoring: true,
            pmx: true,

            // Auto restart on high memory
            max_restarts: 10,
            min_uptime: '10s',

            // Logs
            log_file: './logs/combined.log',
            out_file: './logs/out.log',
            error_file: './logs/error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

            // Health check
            health_check_url: 'http://localhost:5000/health',
            health_check_grace_period: 3000
        }
    ]
};