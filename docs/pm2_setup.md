# Job Platform — Deployment Architecture

A production-style microservices job platform deployed on a single Ubuntu server. Built with Node.js, Next.js, MySQL, MongoDB, RabbitMQ, and NGINX.

---

## Architecture Overview

```
                          Internet
                              │
                    http://SERVER_IP
                              │
                        Port 80 (HTTP)
                              │
                              ▼
                        NGINX Reverse Proxy
                              │
            ┌─────────────────┴──────────────────┐
            │                                    │
       / (Frontend)                          /api/*
            │                                    │
            ▼                                    ▼
    Next.js Frontend                       API Gateway
     localhost:3000                       localhost:5000
                                                 │
         ┌───────────────────────────────────────┼───────────────────────────────────────┐
         │                                       │                                       │
         ▼                                       ▼                                       ▼
  User Profile Service                     Job Service                       Application Service
    localhost:5001                        localhost:5002                      localhost:5003
    MongoDB · Cloudinary                     MySQL                                MySQL
                                                 │
                                                 ▼
                                        Interview Service
                                          localhost:5004
                                              MySQL
                                                 │
                                                 ▼
                                          RabbitMQ Broker
                                                 │
                      ┌──────────────────────────┴──────────────────────────┐
                      │                                                     │
                      ▼                                                     ▼
           Notification Service                                       Chat Service
             localhost:5006                                          localhost:5005
             MongoDB · Socket.IO                                     MongoDB · Socket.IO
```

---

## Services

| Service | Port | Database | Notes |
|---------|------|----------|-------|
| Next.js Frontend | 3000 | — | React UI, managed by PM2 |
| API Gateway | 5000 | — | JWT auth, route forwarding |
| User Profile Service | 5001 | MongoDB | Profiles, resumes, Cloudinary |
| Job Service | 5002 | MySQL | Job CRUD, employer postings |
| Application Service | 5003 | MySQL | Apply flow, publishes to RabbitMQ |
| Interview Service | 5004 | MySQL | Scheduling, status |
| Chat Service | 5005 | MongoDB | Real-time messaging, Socket.IO |
| Notification Service | 5006 | MongoDB | RabbitMQ consumer, Socket.IO |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| OS | Ubuntu 20.04 |
| Reverse Proxy | NGINX |
| Process Manager | PM2 |
| Frontend | Next.js 16 |
| Backend | Node.js + Express |
| API Gateway | http-proxy-middleware |
| Authentication | JWT |
| SQL Database | MySQL 8 |
| NoSQL Database | MongoDB |
| Message Broker | RabbitMQ |
| File Storage | Cloudinary |
| Real-time | Socket.IO |

---

## API Gateway Routes

```
/api/user/profile   →  User Profile Service  (5001)
/api/job            →  Job Service           (5002)
/api/application    →  Application Service   (5003)
/api/interview      →  Interview Service     (5004)
/api/chat           →  Chat Service          (5005)
/api/notification   →  Notification Service  (5006)
```

---

## Complete Request Flow

Apply for a job end-to-end:

```
User clicks Apply
        │
        ▼
POST /api/application
        │
        ▼
NGINX (port 80)
        │
        ▼
API Gateway (JWT validation)
        │
        ▼
Application Service → MySQL (save application)
        │
        ▼
RabbitMQ (publish event)
        │
        ▼
Notification Service (consume event)
        │
        ▼
Socket.IO → User receives real-time notification
```

---

## Deployment

### Prerequisites

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2
sudo npm install -g pm2

# MySQL 8
sudo apt install -y mysql-server

# MongoDB
sudo apt install -y mongodb

# RabbitMQ
sudo apt install -y rabbitmq-server

# NGINX
sudo apt install -y nginx
```

### Step 1 — Clone repositories

```bash
sudo mkdir -p /opt/node
cd /opt/node
git clone <backend-repo> job-platform
cd job-platform
```

### Step 2 — Configure MySQL

```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE job_platform;
CREATE USER 'jobuser'@'localhost' IDENTIFIED BY 'yourpassword';
GRANT ALL PRIVILEGES ON job_platform.* TO 'jobuser'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 3 — Configure environment files

Create a `.env` file in each service directory. Example for `job-service`:

```env
PORT=5002
DB_HOST=localhost
DB_USER=jobuser
DB_PASSWORD=yourpassword
DB_NAME=job_platform
JWT_SECRET=your_jwt_secret
```

### Step 4 — Install dependencies

```bash
for service in api-gateway user-profile-service job-service application-service interview-service chat-service notification-service; do
  echo "Installing $service..."
  cd /opt/node/job-platform/$service
  npm ci
done
```

### Step 5 — Start with PM2

```bash
cd /opt/node/job-platform
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 6 — Configure NGINX

Create `/etc/nginx/sites-available/job-platform`:

```nginx
server {
    listen 80;
    server_name YOUR_SERVER_IP;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    server_tokens off;

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:5000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        limit_req zone=general burst=20 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;
    }
}
```

Add to `/etc/nginx/nginx.conf` inside the `http` block:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/job-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7 — Verify

```bash
# All processes running
pm2 status

# NGINX healthy
sudo systemctl status nginx

# Hit the platform
curl http://YOUR_SERVER_IP/api/job
curl http://YOUR_SERVER_IP
```

---

## PM2 Ecosystem File

```javascript
module.exports = {
  apps: [
    {
      name: 'api-gateway',
      script: './api-gateway/index.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M',
      env: { NODE_ENV: 'production', PORT: 5000 }
    },
    {
      name: 'user-profile-service',
      script: './user-profile-service/index.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '256M',
      env: { NODE_ENV: 'production', PORT: 5001 }
    },
    {
      name: 'job-service',
      script: './job-service/index.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '256M',
      env: { NODE_ENV: 'production', PORT: 5002 }
    },
    {
      name: 'application-service',
      script: './application-service/index.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '256M',
      env: { NODE_ENV: 'production', PORT: 5003 }
    },
    {
      name: 'interview-service',
      script: './interview-service/index.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '256M',
      env: { NODE_ENV: 'production', PORT: 5004 }
    },
    {
      name: 'chat-service',
      script: './chat-service/index.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '256M',
      env: { NODE_ENV: 'production', PORT: 5005 }
    },
    {
      name: 'notification-service',
      script: './notification-service/index.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '256M',
      env: { NODE_ENV: 'production', PORT: 5006 }
    },
    {
      name: 'job-frontend',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: './job-frontend',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: { NODE_ENV: 'production', PORT: 3000 }
    }
  ]
};
```

---

## Useful Commands

```bash
# Process management
pm2 status
pm2 logs
pm2 logs <service-name> --lines 50
pm2 restart <service-name>
pm2 monit

# NGINX
sudo nginx -t
sudo systemctl reload nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# MySQL
mysql -u jobuser -p job_platform
SHOW STATUS LIKE 'Threads_connected';

# RabbitMQ
sudo rabbitmqctl list_queues
sudo rabbitmqctl list_exchanges

# System health
df -h
free -h
```

---

## Security Notes

- NGINX rate limiting enabled — 10 req/s per IP on API routes
- JWT validation on all `/api/*` routes via API Gateway
- Security headers configured (X-Frame-Options, X-Content-Type-Options)
- Services bound to localhost only — not exposed directly to internet
- Single public entry point via NGINX on port 80

---

*Deployed and maintained by Srinivas Sarkar*
