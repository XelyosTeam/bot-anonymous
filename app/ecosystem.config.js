// pm2 configuration: `pm2 start ecosystem.config.js` (from the app/ folder)
// A single instance is mandatory: two processes logged in with the same token
// would handle every message twice.
module.exports = {
    apps: [
        {
            name: 'bot-anonymous',
            script: 'app.js',
            cwd: __dirname,
            exec_mode: 'fork',
            instances: 1,
            autorestart: true,
            restart_delay: 5000,
            max_memory_restart: '512M',
            kill_timeout: 10000,
            env: {
                NODE_ENV: 'production',
            },
        },
    ],
};
