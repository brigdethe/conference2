#!/bin/bash
# Deployment script - run this after pulling changes
# Usage: bash deploy/deploy.sh

set -e

APP_DIR="/var/www/conference2"
cd $APP_DIR

echo "=== Pulling latest changes ==="
git pull origin main

echo "=== Installing Node.js dependencies ==="
npm install --production

echo "=== Building admin panel ==="
cd quantro-main
npm install
npm run build
cd $APP_DIR

echo "=== Setting up Python backend ==="
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate and install dependencies
source venv/bin/activate
pip install -r requirements.txt
deactivate

cd $APP_DIR

echo "=== Updating Nginx config ==="
cp deploy/nginx.conf /etc/nginx/sites-available/conference
nginx -t && systemctl reload nginx

echo "=== Restarting services ==="
# Restart PM2 processes
pm2 restart ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production

# Restart FastAPI backend
sudo systemctl restart conference-backend

echo "=== Deployment complete! ==="
