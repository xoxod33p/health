# Production Deployment Guide (Ubuntu VPS)

This document provides complete operational instructions for configuring your private Ubuntu VPS and running the GitHub Actions CI/CD pipeline for the Healthcare Sensor Management Platform.

---

## 1. Overview & Architecture

The production environment runs containerized services orchestrated via Docker Compose behind an Nginx reverse proxy:

```text
User Browser / Clients (HTTPS 443 / HTTP 80)
            |
      [Nginx Reverse Proxy]
       /                 \
      /                   \
[Next.js Web]       [NestJS API]
 (Port 3000)         (Port 3001)
                         |
      +------------------+------------------+
      |                  |                  |
  [MongoDB]           [Redis]            [MinIO]
 (Port 27017)       (Port 6379)        (Port 9000/9001)
```

---

## 2. Initial VPS Setup (One-Time Execution)

1. SSH into your newly provisioned Ubuntu 22.04 or 24.04 LTS VPS server as root or a user with sudo privileges:
   ```bash
   ssh root@YOUR_VPS_IP
   ```

2. Clone or copy `infra/scripts/setup-vps.sh` to your server and run it:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/YOUR_REPO/main/infra/scripts/setup-vps.sh | bash
   ```
   *This script automatically installs Docker Engine, Docker Compose Plugin, configures firewall rules (ports 22, 80, 443), creates `/opt/health`, and configures log rotation to prevent disk overflow.*

---

## 3. GitHub Secrets Setup

Navigate to your GitHub repository: **Settings > Secrets and variables > Actions** and create the following Repository Secrets:

| Secret Name | Description | Example / Note |
|---|---|---|
| `VPS_HOST` | IP address or domain name of your Ubuntu VPS | `192.0.2.1` or `api.yourdomain.com` |
| `VPS_USERNAME` | SSH username on your server | `ubuntu` or `root` |
| `VPS_SSH_KEY` | Private SSH Key for authentication | Ensure corresponding public key is in `~/.ssh/authorized_keys` |
| `VPS_PORT` | SSH Port | `22` (default if omitted) |
| `PROD_ENV_FILE` | Complete production environment variables | Copy from template in Section 4 below |

---

## 4. Production Environment Template (`PROD_ENV_FILE`)

Paste the following environment template into the `PROD_ENV_FILE` secret in GitHub:

```env
# Application
NODE_ENV=production
PORT=3001
DOMAIN_NAME=yourdomain.com
WEB_ORIGIN=https://yourdomain.com

# Database Secrets
MONGO_ROOT_USERNAME=healthcare_admin
MONGO_ROOT_PASSWORD=SUPER_SECRET_MONGO_PASSWORD_HERE
MONGO_DATABASE=healthcare_prod
MONGODB_URI=mongodb://healthcare_admin:SUPER_SECRET_MONGO_PASSWORD_HERE@mongodb:27017/healthcare_prod?authSource=admin

# Redis Secrets
REDIS_PASSWORD=SUPER_SECRET_REDIS_PASSWORD_HERE
REDIS_URL=redis://:SUPER_SECRET_REDIS_PASSWORD_HERE@redis:6379

# MinIO Object Storage
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=SUPER_SECRET_MINIO_ACCESS_KEY
MINIO_SECRET_KEY=SUPER_SECRET_MINIO_SECRET_KEY
MINIO_USE_SSL=false

# Supabase Authentication
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SECRET_KEY=your_supabase_secret_key
SUPABASE_JWKS_URL=https://your-project.supabase.co/rest/v1/
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Email & Monitoring
RESEND_API_KEY=re_123456789
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
```

---

## 5. SSL / TLS Certificate Setup (Let's Encrypt)

Once your domain DNS `A record` points to your VPS IP:

1. Ensure Nginx container is running and UFW firewall allows HTTP traffic:
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo mkdir -p /var/www/certbot
   docker compose -f /opt/health/infra/docker-compose.prod.yml up -d nginx
   ```

2. Obtain a free Let's Encrypt SSL certificate using Certbot for your domain (omit `www` if you do not have a `www` DNS A-record):
   ```bash
   sudo certbot certonly --webroot -w /var/www/certbot -d test.xoxod33p.tech
   ```

3. Edit `/opt/health/infra/nginx/conf.d/app.conf` on your VPS and uncomment the HTTPS `server { ... }` block, replacing `yourdomain.com` with your actual domain name.

4. Reload Nginx configuration:
   ```bash
   docker compose -f /opt/health/infra/docker-compose.prod.yml exec nginx nginx -s reload
   ```

---

## 6. Deployment Workflows

### Automatic CI/CD Pipeline
- **CI (`ci.yml`)**: Triggered on pull requests and pushes to `main`. Runs linting, typechecking, tests, and validates Docker buildability.
- **CD (`cd.yml`)**: Triggered automatically on push to `main`. Builds multi-stage Docker images for `@healthcare/api` and `@healthcare/web`, pushes them to GitHub Container Registry (`ghcr.io`), connects to your VPS via SSH, updates container images, and executes zero-downtime container upgrades (`docker compose up -d`).

### Manual CLI Command Deployment (On VPS)
If you need to trigger a manual deployment directly on the VPS:
```bash
cd /opt/health
docker compose -f infra/docker-compose.prod.yml pull
docker compose -f infra/docker-compose.prod.yml up -d
```

---

## 7. Operations & Troubleshooting

### View Container Logs
```bash
# View all container logs in real time
docker compose -f /opt/health/infra/docker-compose.prod.yml logs -f

# View API logs only
docker compose -f /opt/health/infra/docker-compose.prod.yml logs -f api

# View Nginx logs
docker compose -f /opt/health/infra/docker-compose.prod.yml logs -f nginx
```

### Inspect Container Health
```bash
docker compose -f /opt/health/infra/docker-compose.prod.yml ps
```

### API Health Checks
```bash
# Liveness
curl http://localhost:3001/api/v1/health/live

# Readiness
curl http://localhost:3001/api/v1/health/ready
```
