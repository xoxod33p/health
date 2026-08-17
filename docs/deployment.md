# 🚀 CareSignal Production Deployment & CI/CD Guide

Complete end-to-end production deployment guide for CareSignal on an **Ubuntu VPS (22.04 / 24.04 LTS)** with custom domain, automated **Let's Encrypt SSL via Certbot**, **Nginx Reverse Proxy**, **Docker Compose multi-container stack**, and **GitHub Actions CI/CD pipeline** with SSH password authentication.

---

## 🏛️ Production Architecture

```text
               🌐 Internet Traffic (DNS A-Record)
                               │
                     ┌─────────▼─────────┐
                     │    Nginx 1.24+    │ (Ports 80 & 443 + Certbot SSL)
                     └─────────┬─────────┘
                               │
             ┌─────────────────┴─────────────────┐
             │                                   │
      (HTTP Reverse Proxy)               (API & WebSockets)
             │                                   │
             ▼                                   ▼
     [Next.js Web Frontend]              [NestJS Modular API]
     Container: caresignal-web           Container: caresignal-api
     Port: 127.0.0.1:3000                Port: 127.0.0.1:3001
                                                 │
                                     ┌───────────┴───────────┐
                                     │                       │
                                     ▼                       ▼
                            [MongoDB 4.4.29]         [Redis 7.4.2]
                            (Non-AVX Compatible)     Container:
                            Container:               caresignal-redis
                            caresignal-mongodb       Port: 6379 (Internal)
                            Port: 27017 (Internal)
                                     │
                             [Persistent Storage]
                             /app/storage -> storage_prod_data
```

---

## 📋 Prerequisites Checklist

1. **Ubuntu VPS**: Clean install of Ubuntu 22.04 LTS or Ubuntu 24.04 LTS (minimum 1–2 GB RAM).
2. **VPS Access**: Root or sudo user with SSH password or private key.
3. **Domain Name**: Domain or subdomain (e.g. `caresignal.yourdomain.com` or `yourdomain.com`).
4. **DNS Setup**:
   - **Type A Record**: `@` (or subdomain) `-->` `YOUR_VPS_PUBLIC_IP`
   - **TTL**: 300 seconds (or standard).

---

## ⚡ Step 1: One-Click Ubuntu VPS Provisioning

SSH into your Ubuntu VPS as `root` (or sudo user) with your password:

```bash
ssh root@YOUR_VPS_IP
```

Run the automated provisioning script:

```bash
# Clone the repository
git clone https://github.com/yashan223/health.git /opt/health
cd /opt/health

# Make scripts executable and run setup
chmod +x scripts/*.sh
sudo bash scripts/setup-vps.sh "yourdomain.com" "admin@yourdomain.com"
```

### What `setup-vps.sh` automatically does:
- ✅ Installs **Docker Engine** & **Docker Compose** plugin from the official Docker repository.
- ✅ Installs **Nginx**, **Certbot**, and `python3-certbot-nginx`.
- ✅ Configures **UFW Firewall** (allowing SSH on port 22, HTTP on port 80, HTTPS on port 443).
- ✅ Requests and configures a valid **Let's Encrypt SSL certificate** for your domain.
- ✅ Configures Nginx with WebSocket streaming (`/socket.io`, `/realtime`), API proxy (`/api/v1`), static file caching, and gzip compression.
- ✅ Uses **MongoDB 4.4.29** for AVX CPU compatibility across all VPS providers.
- ✅ Connects **Redis 7.4** with automatic graceful fallback.
- ✅ Generates a cryptographically secure production `.env` with random passwords and JWT secret.
- ✅ Enables automatic SSL renewal via `certbot.timer`.

---

## 🔐 Step 2: Configure GitHub Actions Secrets

To enable automated CI/CD deployment every time you push code to `main`, add the following secrets to your GitHub repository:

Navigate to **GitHub Repo `Settings` ➔ `Secrets and variables` ➔ `Actions` ➔ `New repository secret`**:

| Secret Name | Example Value | Description |
| :--- | :--- | :--- |
| `VPS_HOST` | `203.0.113.50` | Your Ubuntu VPS Public IP address |
| `VPS_USERNAME` | `root` or `ubuntu` | SSH login username |
| `VPS_PASSWORD` | `YourVpsSecurePassword!` | SSH password for the user |
| `VPS_PORT` | `22` | SSH Port (default is `22`) |
| `DOMAIN_NAME` | `caresignal.yourdomain.com` | Your configured domain name |
| `WEB_ORIGIN` | `https://caresignal.yourdomain.com` | Full HTTPS URL of the web frontend |
| `JWT_SECRET` | *(Generated random 32+ char key)* | Production JWT Secret Key |
| `MONGO_ROOT_PASSWORD` | *(Secure database password)* | MongoDB root password |
| `REDIS_PASSWORD` | *(Secure redis password)* | Redis authentication password |
| `DEFAULT_ADMIN_EMAIL` | `admin@yourdomain.com` | Initial admin account email |
| `DEFAULT_ADMIN_PASSWORD` | `SecureAdminPassword123!` | Initial admin account password |

---

## 🔄 Step 3: Trigger CI/CD Deployment

### Automatic Trigger
Every time you push commits to `main`, GitHub Actions will:
1. Run static lint checks (`npm run lint`).
2. Run build verification (`npm run build`).
3. Execute unit test suite (`npm run test`).
4. Securely SSH into your Ubuntu VPS.
5. Pull latest code, build Docker images, start containers, and run database bootstrap.
6. Verify service health and reload Nginx.

---

## 🛠️ Step 4: Manual Deployment on VPS

If you need to deploy directly on the server:

```bash
cd /opt/health
git pull origin main
docker compose -f infra/docker-compose.prod.yml up -d --build
```

---

## 🔒 Step 5: Certbot SSL Certificate Management

Let's Encrypt certificates are valid for 90 days. Certbot automatically checks and renews certificates via systemd timer.

### Verify Auto-Renewal Status
```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

---

## 🩺 Step 6: Health Checks & Verification

After deployment, verify your live system:

- **Web Application**: `https://yourdomain.com`
- **API Health Check**: `https://yourdomain.com/api/v1/health`
- **Docker Container Status**:
  ```bash
  docker compose -f /opt/health/infra/docker-compose.prod.yml ps
  ```

---

## 📊 Day-2 Operations & Maintenance Commands

### View Live Container Logs
```bash
# View all logs
docker compose -f /opt/health/infra/docker-compose.prod.yml logs -f

# View API logs only
docker compose -f /opt/health/infra/docker-compose.prod.yml logs -f api

# View Next.js Web logs only
docker compose -f /opt/health/infra/docker-compose.prod.yml logs -f web
```

### Restart All Services
```bash
docker compose -f /opt/health/infra/docker-compose.prod.yml restart
```

### Seed Demo Healthcare Telemetry Data
```bash
docker compose -f /opt/health/infra/docker-compose.prod.yml exec -T api node apps/api/dist/scripts/seed.js
```

### Reset / Clean Database Data
```bash
docker compose -f /opt/health/infra/docker-compose.prod.yml exec -T api node apps/api/dist/scripts/clean.js
```
