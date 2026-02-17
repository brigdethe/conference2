module.exports = {
  apps: [
    {
      name: 'conference-frontend',
      script: 'app.js',
      cwd: '/var/www/conference2',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        BACKEND_URL: 'http://127.0.0.1:8000'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    }
  ]
};
