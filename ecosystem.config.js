module.exports = {
  apps: [
    {
      name: 'conference-frontend',
      script: 'app.js',
      cwd: '/var/www/conference2',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        BACKEND_URL: 'http://127.0.0.1:8000',
        SESSION_SECRET: process.env.SESSION_SECRET || '',
        ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
        BACKEND_API_KEY: process.env.BACKEND_API_KEY || ''
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    }
  ]
};
