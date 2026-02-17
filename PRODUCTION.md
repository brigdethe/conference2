# Production Environment Documentation

This document describes the production setup for the Ghana Competition Law Seminar registration system hosted on DigitalOcean.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Server Details](#server-details)
3. [Application URLs](#application-urls)
4. [Tech Stack](#tech-stack)
5. [Deployment Pipeline](#deployment-pipeline)
6. [Manual Deployment Commands](#manual-deployment-commands)
7. [Service Management](#service-management)
8. [Troubleshooting](#troubleshooting)
9. [Database Management](#database-management)
10. [Important Files](#important-files)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     DigitalOcean Droplet                     │
│                      167.71.143.67                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────┐                                           │
│   │   Nginx     │ ← Port 80 (HTTP)                          │
│   │  (Reverse   │                                           │
│   │   Proxy)    │                                           │
│   └──────┬──────┘                                           │
│          │                                                   │
│    ┌─────┴─────┐                                            │
│    │           │                                            │
│    ▼           ▼                                            │
│ ┌──────────┐ ┌──────────┐                                   │
│ │ Node.js  │ │ FastAPI  │                                   │
│ │ Express  │ │ Backend  │                                   │
│ │ (PM2)    │ │(systemd) │                                   │
│ │ Port 3001│ │ Port 8000│                                   │
│ └──────────┘ └────┬─────┘                                   │
│                   │                                          │
│                   ▼                                          │
│            ┌──────────┐                                      │
│            │  SQLite  │                                      │
│            │   DB     │                                      │
│            └──────────┘                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Server Details

| Property | Value |
|----------|-------|
| **Provider** | DigitalOcean |
| **Droplet IP** | `167.71.143.67` |
| **OS** | Ubuntu 24.04 LTS |
| **SSH User** | `root` |
| **App Directory** | `/var/www/conference2` |

---

## Application URLs

| Page | URL | Description |
|------|-----|-------------|
| **Main Website** | http://167.71.143.67 | Public registration page |
| **Contact/Register** | http://167.71.143.67/contact | Registration form |
| **Admin Panel** | http://167.71.143.67/admin/ | Dashboard for managing registrations |
| **Check-In** | http://167.71.143.67/checkin | QR scanner for event day check-in |
| **Terminal Logs** | http://167.71.143.67/terminal | Server logs, DB reset tools |
| **API Docs (Swagger)** | http://167.71.143.67/docs | FastAPI interactive docs |
| **API Docs (ReDoc)** | http://167.71.143.67/redoc | FastAPI alternative docs |

---

## Tech Stack

### Frontend (Node.js/Express)
- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Template Engine**: EJS
- **Process Manager**: PM2
- **Port**: 3001

### Backend (Python/FastAPI)
- **Runtime**: Python 3.12
- **Framework**: FastAPI
- **ORM**: SQLAlchemy
- **Database**: SQLite
- **Process Manager**: systemd
- **Port**: 8000

### Admin Panel (React)
- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Location**: `/var/www/conference2/quantro-main/dist/`

### Reverse Proxy
- **Server**: Nginx
- **Config**: `/etc/nginx/sites-available/conference`

---

## Deployment Pipeline

### Automatic Deployment (GitHub Actions)

When you push to the `main` branch, GitHub Actions automatically deploys to production.

**Workflow file**: `.github/workflows/deploy.yml`

**Required GitHub Secrets** (Settings → Secrets → Actions):

| Secret | Value |
|--------|-------|
| `DROPLET_IP` | `167.71.143.67` |
| `DROPLET_USER` | `root` |
| `SSH_PRIVATE_KEY` | Your private SSH key |

### How Auto-Deploy Works

1. Push to `main` branch
2. GitHub Actions triggers
3. SSH into droplet
4. Runs `deploy/deploy.sh` script
5. Pulls latest code, installs deps, restarts services

---

## Manual Deployment Commands

If auto-deploy fails or you need to deploy manually, use these PowerShell commands:

### 1. Push Changes to GitHub

```powershell
# Stage all changes
git add -A

# Commit with message
git commit -m "Your commit message"

# Push to main branch
git push origin main
```

### 2. SSH into Server

```powershell
ssh root@167.71.143.67
```

### 3. Pull Latest Code on Server

```powershell
# From your local machine (one-liner)
ssh root@167.71.143.67 "cd /var/www/conference2 && git fetch --all && git reset --hard origin/main"
```

### 4. Restart Services

```powershell
# Restart Node.js frontend
ssh root@167.71.143.67 "pm2 restart conference-frontend"

# Restart Python backend
ssh root@167.71.143.67 "systemctl restart conference-backend"

# Reload Nginx (after config changes)
ssh root@167.71.143.67 "nginx -t && systemctl reload nginx"
```

### 5. Update Nginx Config

```powershell
# Copy nginx config from local to server
scp deploy/nginx.conf root@167.71.143.67:/etc/nginx/sites-available/conference

# Test and reload
ssh root@167.71.143.67 "nginx -t && systemctl reload nginx"
```

### 6. Rebuild Admin Panel

```powershell
ssh root@167.71.143.67 "cd /var/www/conference2/quantro-main && npm install && npm run build"
```

### 7. Full Manual Deploy (All Steps)

```powershell
# 1. Push your changes
git add -A
git commit -m "Your changes"
git push origin main

# 2. Pull on server
ssh root@167.71.143.67 "cd /var/www/conference2 && git fetch --all && git reset --hard origin/main"

# 3. Update nginx config
scp deploy/nginx.conf root@167.71.143.67:/etc/nginx/sites-available/conference

# 4. Restart everything
ssh root@167.71.143.67 "nginx -t && systemctl reload nginx && pm2 restart conference-frontend && systemctl restart conference-backend"
```

---

## Service Management

### PM2 (Node.js Frontend)

```bash
# View status
pm2 status

# View logs
pm2 logs conference-frontend

# Restart
pm2 restart conference-frontend

# Stop
pm2 stop conference-frontend

# Start
pm2 start ecosystem.config.js
```

### systemd (Python Backend)

```bash
# View status
systemctl status conference-backend

# View logs
journalctl -u conference-backend -f

# Restart
systemctl restart conference-backend

# Stop
systemctl stop conference-backend

# Start
systemctl start conference-backend
```

### Nginx

```bash
# Test config
nginx -t

# Reload (after config changes)
systemctl reload nginx

# Restart
systemctl restart nginx

# View error logs
tail -f /var/log/nginx/error.log

# View access logs
tail -f /var/log/nginx/access.log
```

---

## Troubleshooting

### Frontend Not Loading

```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs conference-frontend --lines 50

# Restart
pm2 restart conference-frontend
```

### Backend API Errors

```bash
# Check service status
systemctl status conference-backend

# Check logs
journalctl -u conference-backend -n 50

# Test manually
cd /var/www/conference2/backend
source venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8000
```

### Nginx 502 Bad Gateway

```bash
# Check if services are running
pm2 status
systemctl status conference-backend

# Check nginx error log
tail -f /var/log/nginx/error.log

# Restart all services
pm2 restart conference-frontend
systemctl restart conference-backend
```

### Database Issues

```bash
# Check if DB file exists
ls -la /var/www/conference2/backend/conference.db

# Check permissions
chmod 666 /var/www/conference2/backend/conference.db

# Reset database (use Terminal page or manually)
rm /var/www/conference2/backend/conference.db
systemctl restart conference-backend
```

---

## Database Management

### Via Terminal Page (Recommended)

1. Go to http://167.71.143.67/terminal
2. Click "Database" button
3. Choose:
   - **Clear All Data** - Deletes everything
   - **Reset & Seed** - Clears and adds default organizations

### Via Command Line

```bash
# SSH into server
ssh root@167.71.143.67

# Stop backend
systemctl stop conference-backend

# Delete database
rm /var/www/conference2/backend/conference.db

# Start backend (recreates tables)
systemctl start conference-backend

# Optional: Run seed script
cd /var/www/conference2/backend
source venv/bin/activate
python seed_organizations.py
```

---

## Important Files

### Local Project Structure

```
conference2/
├── app.js                    # Main Express server
├── ecosystem.config.js       # PM2 configuration
├── package.json              # Node.js dependencies
├── views/
│   └── pages/
│       ├── home.ejs          # Landing page
│       ├── contact.ejs       # Registration form
│       ├── payment.ejs       # Payment page
│       ├── checkin.ejs       # Event check-in page
│       └── terminal.ejs      # Server logs page
├── backend/
│   ├── main.py               # FastAPI entry point
│   ├── models.py             # SQLAlchemy models
│   ├── routers/              # API route handlers
│   ├── requirements.txt      # Python dependencies
│   └── seed_organizations.py # Database seeder
├── quantro-main/             # Admin panel (React)
│   ├── App.tsx
│   └── dist/                 # Built files (served by Nginx)
├── deploy/
│   ├── nginx.conf            # Nginx configuration
│   ├── conference-backend.service  # systemd service
│   ├── deploy.sh             # Deployment script
│   └── setup-server.sh       # Initial server setup
└── .github/
    └── workflows/
        └── deploy.yml        # GitHub Actions workflow
```

### Server File Locations

| File | Location |
|------|----------|
| App Directory | `/var/www/conference2/` |
| Nginx Config | `/etc/nginx/sites-available/conference` |
| Backend Service | `/etc/systemd/system/conference-backend.service` |
| SQLite Database | `/var/www/conference2/backend/conference.db` |
| PM2 Logs | `/root/.pm2/logs/` |
| Nginx Logs | `/var/log/nginx/` |

---

## Quick Reference

### Common PowerShell Commands

```powershell
# SSH into server
ssh root@167.71.143.67

# Quick deploy (after pushing to GitHub)
ssh root@167.71.143.67 "cd /var/www/conference2 && git pull && pm2 restart conference-frontend && systemctl restart conference-backend"

# View frontend logs
ssh root@167.71.143.67 "pm2 logs conference-frontend --lines 30"

# View backend logs
ssh root@167.71.143.67 "journalctl -u conference-backend -n 30"

# Check all services
ssh root@167.71.143.67 "pm2 status && systemctl status conference-backend --no-pager"
```

---

## Contact

For issues with the production environment, check:
1. Terminal logs page: http://167.71.143.67/terminal
2. PM2 logs: `pm2 logs conference-frontend`
3. Backend logs: `journalctl -u conference-backend -f`

---

*Last updated: February 17, 2026*
