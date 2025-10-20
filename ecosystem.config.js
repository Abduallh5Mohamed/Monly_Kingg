// PM2 Ecosystem Configuration for High Load (200k+ users)
export default {
    apps: [
        {
            name: 'accounts-store-cluster',
            script: 'server-integrated.js', // Updated to use integrated server
            instances: 'max', // Use all CPU cores (auto-detect, or set specific number like 8)
            exec_mode: 'cluster',

            // Environment variables
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
            node_args: [
                '--max-old-space-size=4096', // 4GB heap per instance
                '--max-http-header-size=16384', // Support larger headers
                '--optimize-for-size', // Optimize V8 for memory
            ].join(' '),

            max_memory_restart: '3G', // Restart if instance exceeds 3GB
            instances_balancer_policy: 'round_robin',

            // Socket.IO specific
            kill_timeout: 5000, // Grace period for socket disconnection
            listen_timeout: 10000,
            wait_ready: true, // Wait for app.listen() before considering ready

            // Auto-restart configuration
            autorestart: true,
            max_restarts: 10,
            min_uptime: '30s', // Must stay up 30s to avoid restart loop
            restart_delay: 4000, // Delay between restarts

            // Monitoring & metrics
            monitoring: true,
            pmx: true,
            instance_var: 'INSTANCE_ID',

            // Logs
            log_file: './logs/combined.log',
            out_file: './logs/out.log',
            error_file: './logs/error.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            log_type: 'json',

            // Graceful shutdown
            kill_signal: 'SIGTERM',
            shutdown_with_message: true,

            // Cron restart (optional - restart at 3 AM daily for maintenance)
            cron_restart: '0 3 * * *',

            // Load balancing
            increment_var: 'PORT',

            // Error handling
            error_file: './logs/error.log',
            combine_logs: true
        }
    ],

    // Deployment configuration (optional - for PM2 deploy)
    deploy: {
        production: {
            user: 'deploy',
            host: ['server1.example.com', 'server2.example.com'],
            ref: 'origin/main',
            repo: 'https://github.com/Abduallh5Mohamed/Monly_Kingg.git',
            path: '/var/www/accounts-store',
            'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
            'pre-setup': 'apt-get install -y git'
        }
    }
};