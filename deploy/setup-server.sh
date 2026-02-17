#!/bin/bash
# DigitalOcean Droplet Initial Setup Script
# Run this script on a fresh Ubuntu 22.04/24.04 droplet

set -e

echo "=== Updating system packages ==="
sudo apt update && sudo apt upgrade -y

echo "=== Installing Node.js 20.x ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "=== Installing Python 3 and pip ==="
sudo apt install -y python3 python3-pip python3-venv

echo "=== Installing Nginx ==="
sudo apt install -y nginx

echo "=== Installing PM2 globally ==="
sudo npm install -g pm2

echo "=== Installing Git ==="
sudo apt install -y git

echo "=== Creating web directory ==="
sudo mkdir -p /var/www/conference2
sudo chown -R $USER:$USER /var/www/conference2

echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "1. Clone your repository: cd /var/www && git clone https://github.com/YOUR_USERNAME/conference2.git"
echo "2. Run the deploy script: cd /var/www/conference2 && bash deploy/deploy.sh"
