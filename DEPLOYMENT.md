# DigitalOcean Deployment Guide

This guide walks you through deploying the Conference application to a DigitalOcean Droplet with automatic GitHub deployments.

## Architecture Overview

- **Frontend**: Node.js/Express (port 3001) - serves EJS templates
- **Backend**: Python/FastAPI (port 8000) - handles API logic
- **Reverse Proxy**: Nginx (port 80/443)
- **Process Manager**: PM2 (Node.js) + systemd (Python)

---

## Part 1: Create DigitalOcean Droplet

### Step 1: Create Account & Droplet

1. Go to [DigitalOcean](https://www.digitalocean.com/) and create an account
2. Click **Create** → **Droplets**
3. Choose these settings:
   - **Region**: Choose closest to your users
   - **Image**: Ubuntu 24.04 (LTS) x64
   - **Size**: Basic → Regular → $6/mo (1GB RAM) or $12/mo (2GB RAM recommended)
   - **Authentication**: Choose **SSH Key** (more secure)
   
### Step 2: Set Up SSH Key (if you don't have one)

On your local machine (Windows PowerShell):

```powershell
# Generate SSH key
ssh-keygen -t ed25519 -C "your-email@example.com"

# View your public key (copy this to DigitalOcean)
Get-Content ~/.ssh/id_ed25519.pub
```

Add this public key to DigitalOcean when creating the droplet.

### Step 3: Connect to Your Droplet

After creation, note your Droplet's IP address (e.g., `164.92.xxx.xxx`)

```powershell
ssh root@YOUR_DROPLET_IP
```

---

## Part 2: Initial Server Setup

### Step 1: Run Setup Script

Once connected to your droplet:

```bash
# Create a non-root user (recommended)
adduser deploy
usermod -aG sudo deploy

# Switch to deploy user
su - deploy

# Clone your repository
cd /var/www
sudo mkdir -p conference2
sudo chown -R deploy:deploy conference2
git clone https://github.com/YOUR_USERNAME/conference2.git conference2
cd conference2

# Run the setup script
chmod +x deploy/setup-server.sh
bash deploy/setup-server.sh
```

### Step 2: Set Up Python Backend

```bash
cd /var/www/conference2/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Install systemd service
sudo cp /var/www/conference2/deploy/conference-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable conference-backend
sudo systemctl start conference-backend

# Check status
sudo systemctl status conference-backend
```

### Step 3: Set Up Node.js Frontend

```bash
cd /var/www/conference2

# Install dependencies
npm install --production

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 process list and set up startup script
pm2 save
pm2 startup
# Run the command it outputs (sudo env PATH=...)
```

### Step 4: Configure Nginx

```bash
# Copy nginx config
sudo cp /var/www/conference2/deploy/nginx.conf /etc/nginx/sites-available/conference

# Edit the config to add your domain or IP
sudo nano /etc/nginx/sites-available/conference
# Replace 'your-domain.com' with your actual domain or droplet IP

# Enable the site
sudo ln -s /etc/nginx/sites-available/conference /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove default site

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## Part 3: Set Up GitHub Auto-Deploy

This allows changes pushed to `main` branch to automatically deploy to your server.

### Step 1: Add GitHub Secrets

1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `DROPLET_IP` | Your droplet's IP address (e.g., `164.92.xxx.xxx`) |
| `DROPLET_USER` | `deploy` (or `root` if you didn't create a user) |
| `SSH_PRIVATE_KEY` | Your private SSH key (see below) |

### Step 2: Get Your Private SSH Key

On your local machine:

```powershell
# View your private key (copy the ENTIRE output including BEGIN and END lines)
Get-Content ~/.ssh/id_ed25519
```

Copy the entire key (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`) and paste it as the `SSH_PRIVATE_KEY` secret.

### Step 3: Ensure SSH Key is on Server

Make sure your public key is in the server's authorized_keys:

```bash
# On your droplet, as the deploy user
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
# Paste your public key here
chmod 600 ~/.ssh/authorized_keys
```

### Step 4: Test the Deployment

1. Push a change to your `main` branch
2. Go to GitHub → **Actions** tab to see the deployment running
3. Check your site to verify changes are live

---

## Part 4: Add SSL Certificate (HTTPS)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is set up automatically, but you can test it:
sudo certbot renew --dry-run
```

---

## Manual Deployment

If you need to deploy manually without GitHub Actions:

```bash
ssh deploy@YOUR_DROPLET_IP
cd /var/www/conference2
bash deploy/deploy.sh
```

---

## Useful Commands

```bash
# View frontend logs
pm2 logs conference-frontend

# View backend logs
sudo journalctl -u conference-backend -f

# Restart frontend
pm2 restart conference-frontend

# Restart backend
sudo systemctl restart conference-backend

# Restart nginx
sudo systemctl restart nginx

# Check service status
pm2 status
sudo systemctl status conference-backend
sudo systemctl status nginx
```

---

## Troubleshooting

### Backend not starting
```bash
# Check logs
sudo journalctl -u conference-backend -n 50

# Test manually
cd /var/www/conference2/backend
source venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8000
```

### Frontend not starting
```bash
# Check PM2 logs
pm2 logs conference-frontend --lines 50

# Test manually
cd /var/www/conference2
node app.js
```

### Nginx errors
```bash
# Test config
sudo nginx -t

# Check error log
sudo tail -f /var/log/nginx/error.log
```

### Permission issues
```bash
# Fix ownership
sudo chown -R deploy:deploy /var/www/conference2
sudo chown -R www-data:www-data /var/www/conference2/backend/conference.db
```

---

## Cost Estimate

- **Droplet**: $6-12/month
- **Domain** (optional): ~$10-15/year
- **Total**: ~$6-12/month

---

## Quick Reference

| Service | Port | Manager | Restart Command |
|---------|------|---------|-----------------|
| Frontend | 3001 | PM2 | `pm2 restart conference-frontend` |
| Backend | 8000 | systemd | `sudo systemctl restart conference-backend` |
| Nginx | 80/443 | systemd | `sudo systemctl restart nginx` |
