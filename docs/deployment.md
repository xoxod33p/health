# 🚀 Production Deployment Guide (Ubuntu VPS Manual Deployment)

Operational reference guide for deploying and maintaining the CareSignal Healthcare Sensor Platform on a private Ubuntu VPS.

---

## 1. System Architecture

```text
Browser / Client (Port 80 / Port 443 HTTPS)
              │
        [ Nginx 1.27 ]
         /          \
  (Port 3000)     (Port 3001)
  Next.js Web      NestJS API
                     │
         ┌───────────┼───────────┐
      [MongoDB 8] [Redis 7.4] [MinIO]
```

---

## 2. One-Time VPS Initial Setup

SSH into your Ubuntu 22.04 or 24.04 LTS VPS:
```bash
ssh root@YOUR_VPS_IP
```

Run initial setup:
```bash
curl -fsSL https://raw.githubusercontent.com/yashan223/health/main/infra/scripts/setup-vps.sh | bash
```

---

## 3. Fresh Reset & Clean Pull Command

To completely wipe all running containers, data volumes, local uncommitted modifications, and pull fresh code from `origin/main`:

```bash
cd /opt/health && docker compose -f infra/docker-compose.yml down -v --remove-orphans && git reset --hard HEAD && git clean -fd && git pull origin main
```

---

## 4. 1-Click SSL Certificate Setup (Let's Encrypt)

Run the automated SSL setup script on your VPS:

```bash
sudo bash infra/scripts/setup-ssl.sh test.xoxod33p.tech
```

### What `setup-ssl.sh` performs:
1. Generates temporary self-signed fallback certificates in `/etc/letsencrypt/live/test.xoxod33p.tech/` so Nginx boots on Port 443 with zero crashes.
2. Starts Nginx listening on both Port 80 and Port 443.
3. Requests official Let's Encrypt SSL certificates via `certbot certonly --webroot`.
4. Automatically reloads Nginx with production SSL certificates.

---

## 5. Production `.env` Template

Create or verify `/opt/health/.env` on your VPS:

```env
NODE_ENV=production
PORT=3001
DOMAIN_NAME=test.xoxod33p.tech
WEB_ORIGIN=https://test.xoxod33p.tech
JWT_SECRET=care_signal_secure_prod_jwt_secret_99812_key!

NEXT_PUBLIC_API_URL=https://test.xoxod33p.tech/api/v1

MONGO_ROOT_USERNAME=healthcare
MONGO_ROOT_PASSWORD=HealthcareSecurePassword123!
MONGO_DATABASE=healthcare
MONGODB_URI=mongodb://healthcare:HealthcareSecurePassword123!@mongodb:27017/healthcare?authSource=admin

REDIS_PASSWORD=RedisSecurePassword123!
REDIS_URL=redis://:RedisSecurePassword123!@redis:6379

MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minio_admin_key
MINIO_SECRET_KEY=minio_secure_secret_123!
MINIO_USE_SSL=false
```

---

## 6. Manual Rebuild & Restart Commands

```bash
cd /opt/health

# Rebuild images
docker compose -f infra/docker-compose.yml build --no-cache

# Recreate all containers
docker compose -f infra/docker-compose.yml up -d --force-recreate

# Bootstrap admin account in MongoDB
docker compose -f infra/docker-compose.yml exec api npm run admin:bootstrap

# Check status
docker compose -f infra/docker-compose.yml ps

# View real-time logs
docker compose -f infra/docker-compose.yml logs -f
```
