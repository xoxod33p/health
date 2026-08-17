# 🏥 CareSignal — Healthcare Sensor Telemetry & Management Platform

CareSignal is an enterprise-grade, privacy-first healthcare sensor telemetry, customer management, and compliance platform. Built with **Next.js 16 (React 19)**, **NestJS 11 (Modular Monolith)**, **MongoDB 4.4 (Universal Non-AVX)**, **Redis 7.4 (Distributed Pub/Sub & Caching)**, and **Native JWT Authentication**.

---

## ⚡ Technology Stack

- **Web Frontend (`apps/web`)**: Next.js 16 (App Router), React 19, Lucide Icons, and Vanilla CSS with zero Tailwind overhead.
- **Progressive Web App (PWA)**: Offline service worker, web app manifest, maskable & touch icons for native-like mobile experience on iOS and Android.
- **Backend API (`apps/api`)**: NestJS 11 Modular Monolith, Mongoose ORM, Distributed Rate Limiting, and Socket.IO WebSocket Gateway.
- **Database**: MongoDB 4.4.29 (`mongo:4.4.29`) — engineered for maximum CPU compatibility across all VPS hypervisors without requiring AVX instruction sets.
- **Cache & Real-time Pub/Sub**: Redis 7.4.2 Alpine with `@socket.io/redis-adapter` and automated graceful fallback.
- **Storage**: Categorized tenant-isolated local filesystem storage (`storage/reports`, `storage/customers`, `storage/sensors`).
- **Security & Auth**: Native self-hosted JWT authentication (`jose`), role-based access control, and immutable audit trails.

---

## 🚀 Key Features

1. **Hardware Sensor Inventory & 15-Day Lifecycles**:
   - Register devices by serial number, manufacturer, and sensor type.
   - Automated 15-day expiration tracking for continuous monitoring patches.
   - Status transitions (`AVAILABLE`, `ASSIGNED`, `EXPIRING_SOON`, `EXPIRED`, `REPLACED`, `DISABLED`).

2. **Sensor Replacement & Maintenance Logs**:
   - Record hardware issues, clinical reasons, and replacement serials.
   - Complete audit trail linking previous customer assignments to new hardware.

3. **Customer Directory (`CUS-XXXXX`)**:
   - Auto-generated sequential customer identifiers.
   - Contact records, medical remarks, active attached sensors, and assignment history.

4. **Executive Reporting Engine**:
   - Instant dynamic exports in **PDF**, **Excel (`.xlsx`)**, and **CSV**.
   - Categories: Sensor Inventory, Expiration & Replacements, Customer Coverage, and Operational Summary.

5. **Role-Based Access & Workspace Management**:
   - Multi-tier roles: `SYSTEM_ADMIN`, `MANAGER`, `INHOUSE_STAFF`, `OUT_EMPLOYEE`.
   - Protected Root Administrator with system maintenance and data reset controls.

6. **Progressive Web App (PWA) & Mobile Touch Optimization**:
   - Installable on iOS (Safari "Add to Home Screen") and Android (Chrome "Install App").
   - Anti-zoom safeguards (`userScalable: false`, `touch-action: manipulation`, 16px input sizing).
   - Embedded search & filter controls directly within panel headers.

---

## 🏛️ System Architecture

```text
               🌐 Internet Traffic (HTTPS / WSS)
                               │
                     ┌─────────▼─────────┐
                     │    Nginx 1.24+    │ (SSL Termination via Certbot)
                     └─────────┬─────────┘
                               │
             ┌─────────────────┴─────────────────┐
             │                                   │
      (HTTP Reverse Proxy)               (API & WebSockets)
             │                                   │
             ▼                                   ▼
     [Next.js 16 Web App]                [NestJS 11 API]
     (PWA Service Worker)                (Port 3001)
     Container: caresignal-web           Container: caresignal-api
     Port: 127.0.0.1:3000                        │
                                     ┌───────────┴───────────┐
                                     │                       │
                                     ▼                       ▼
                            [MongoDB 4.4.29]         [Redis 7.4.2]
                            (Non-AVX Universal)      (Pub/Sub & Cache)
                            Container:               Container:
                            caresignal-mongodb       caresignal-redis
                                     │
                             [Local Storage]
                             /app/storage -> storage_prod_data
```

---

## 💻 Local Development Setup

### Prerequisites
- Node.js 22 LTS
- Docker Desktop

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/yashan223/health.git
cd health
npm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```

Ensure your `.env` contains:
```ini
NODE_ENV=development
PORT=3001
WEB_ORIGIN=http://localhost:3000
MONGODB_URI=mongodb://healthcare:healthcare_prod_secret_123!@localhost:27017/healthcare?authSource=admin
JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars_long!
REDIS_PASSWORD=redis_dev_only
REDIS_URL=redis://:redis_dev_only@localhost:6379
```

### 3. Start Database & Cache Containers
```bash
docker compose -f infra/docker-compose.yml up -d
```

### 4. Run Development Servers
```bash
# Terminal 1: NestJS API
npm run dev:api

# Terminal 2: Next.js Frontend
npm run dev:web
```

Or on Windows:
```cmd
.\run-dev.cmd
```

---

## 🚀 Production Deployment (Ubuntu VPS)

### One-Click Provisioning
```bash
git clone https://github.com/yashan223/health.git /opt/health
cd /opt/health
chmod +x scripts/*.sh
sudo bash scripts/setup-vps.sh "yourdomain.com" "admin@yourdomain.com"
```

### Manual Service Management
```bash
# Pull latest changes & rebuild
git pull origin main
docker compose -f infra/docker-compose.prod.yml up -d --build

# View container logs
docker compose -f infra/docker-compose.prod.yml logs -f api

# Reset demo data (preserves admin user)
./scripts/clean-prod.sh

# Seed realistic demo data
./scripts/seed-prod.sh seed
```

---

## 🧪 Testing & Code Quality

```bash
# Type check all workspaces
npm run typecheck

# Run unit tests across all services
npm test

# Lint code
npm run lint
```

---

## 📱 Installing the PWA on Mobile Devices

- **iOS (Apple Safari)**: Tap the **Share** icon → **"Add to Home Screen"**.
- **Android (Google Chrome / Brave)**: Tap the menu → **"Install App"** / **"Add to Home screen"**.

---

## 📄 License
Proprietary — All Rights Reserved.
