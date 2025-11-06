module.exports = {
    apps: [{
      name: 'requestlist-backend',
      script: 'server.js',
      cwd: '/var/www/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/pm2/requestlist-backend-error.log',
      out_file: '/var/log/pm2/requestlist-backend-out.log',
      log_file: '/var/log/pm2/requestlist-backend.log'
    }]
  };