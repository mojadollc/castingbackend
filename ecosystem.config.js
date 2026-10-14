module.exports = {
  apps: [
    {
      name: 'casting-api',
      script: 'dist/main.js',
      instances: 'max',          // one process per CPU core
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Graceful shutdown — wait for in-flight requests
      kill_timeout: 10000,
      wait_ready: true,
      listen_timeout: 15000,
      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/casting/error.log',
      out_file: '/var/log/casting/out.log',
      merge_logs: true,
      // Auto-restart on crash with exponential backoff
      autorestart: true,
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'git@github.com:your-org/casting-backend.git',
      path: '/var/www/casting-backend',
      'pre-deploy-local': '',
      'post-deploy':
        'npm ci --only=production && npx prisma migrate deploy && npx prisma generate && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'mkdir -p /var/log/casting',
    },
  },
};
