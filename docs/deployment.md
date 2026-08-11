# 🚀 Production Deployment Guide (Ubuntu VPS & GitHub Actions CI/CD)

Complete operational reference guide for deploying and maintaining the CareSignal Healthcare Sensor Platform on a private Ubuntu VPS with automated SSL and GitHub Actions CI/CD.

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
cd ~/health && docker compose -f infra/docker-compose.prod.yml down -v --remove-orphans && git reset --hard HEAD && git clean -fd && git pull origin main
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

## 5. GitHub Secrets Configuration

Add these Repository Secrets in **GitHub > Settings > Secrets and variables > Actions**:

| Secret Name | Description | Example |
|---|---|---|
| `VPS_HOST` | VPS Server IP address | `136.85.39.220` |
| `VPS_USERNAME` | SSH Username | `root` |
| `VPS_PASSWORD` | VPS Root Password | `YourRootPassword` |
| `SUPABASE_URL` | Supabase URL | `https://iwgxcuwyioxvwegoofhv.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase Anon / Publishable Key | `sb_publishable_...` |
| `WEB_ORIGIN` | Production Domain Origin | `http://test.xoxod33p.tech` |
| `PROD_ENV_FILE` | Complete `.env` file contents | Paste full `.env` |

---

## 6. Production `.env` Template

Create or verify `~/health/.env` on your VPS:

```env
NODE_ENV=production
PORT=3001
DOMAIN_NAME=test.xoxod33p.tech
WEB_ORIGIN=http://test.xoxod33p.tech

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

SUPABASE_URL=https://iwgxcuwyioxvwegoofhv.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_DtKmQBeutdxhWIUhdZ892g_-YTpnqMN
SUPABASE_ANON_KEY=sb_publishable_DtKmQBeutdxhWIUhdZ892g_-YTpnqMN
```

---

## 7. Manual Rebuild & Restart Commands

```bash
# Rebuild web image with build args
docker compose -f infra/docker-compose.prod.yml build web --no-cache

# Recreate all containers
docker compose -f infra/docker-compose.prod.yml up -d --force-recreate

# Check status
docker compose -f infra/docker-compose.prod.yml ps

# View real-time logs
docker compose -f infra/docker-compose.prod.yml logs -f
```
