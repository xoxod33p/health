# 🏥 CareSignal — Healthcare Sensor Management Platform

CareSignal is an enterprise-grade, modular-monolith healthcare sensor telemetry & customer management SaaS platform built with **Next.js 16**, **React 19**, **NestJS 11**, **MongoDB 8**, **Redis 7.4**, **MinIO**, **Nginx**, and **Supabase Auth**.

---

## ⚡ Tech Stack Architecture

- **Frontend (`apps/web`)**: Next.js 16 (App Router), React 19, Tailwind CSS, Lucide Icons, Mobile-optimized responsive design system.
- **Backend API (`apps/api`)**: NestJS 11 Modular Monolith with Mongoose, Throttler, WebSocket Gateway, and role-based permissions.
- **Database & Cache**: MongoDB 8 (`employees`, `customers`, `sensors`, `assignments`, `audit_logs`) and Redis 7.4.
- **Object Storage**: MinIO S3-compatible file storage.
- **Reverse Proxy**: Nginx 1.27 with automated SSL (Let's Encrypt / Certbot) and WebSocket reverse proxying.
- **Authentication**: Supabase Auth & JWT session management.

---

## 🚀 Key Features

1. **Sensor & Telemetry Management**: Register devices, track models/serials, manage statuses (`AVAILABLE`, `ASSIGNED`, `DISABLED`), and inspect telemetry.
2. **Instant Customer-Sensor Linking**: Link sensors to specific customers directly during registration or assign unassigned devices later.
3. **User Management & Role Control**: User administration directory supporting `COMPANY_ADMIN`, `MANAGER`, `HEALTHCARE_EMPLOYEE`, and `AUDITOR` roles with live Supabase Auth session integration.
4. **Customer Directory**: Customer records with optional address, contact info, and clinical description notes.
5. **Mobile-First Responsive Layout**: Touch-optimized navigation drawer with dark backdrop blur, responsive data tables, mobile-friendly stat grids, and modal popups.
6. **Zero-Downtime Deployment & 1-Click SSL**: Built-in scripts for self-signed fallback certs, automated Let's Encrypt certbot issuance, and GitHub Actions CI/CD.

---

## 💻 Local Development Setup

### Prerequisites
- Node.js 22 LTS
- Docker Desktop

### Quick Start (Local)
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` files:
   ```bash
   cp .env.example .env
   cp apps/web/.env.example apps/web/.env.local
   ```
3. Start infrastructure containers (MongoDB, Redis, MinIO):
   ```bash
   docker compose -f infra/docker-compose.yml up -d
   ```
4. Run development servers:
   ```bash
   # Terminal 1: API (Port 3001)
   npm run dev:api

   # Terminal 2: Web (Port 3000)
   npm run dev:web
   ```

---

## 🌐 Production VPS Deployment

### 1. Single-Command Clean Pull & Reset (On VPS)
To completely wipe stale containers/volumes and pull the latest production code:
```bash
cd ~/health && docker compose -f infra/docker-compose.prod.yml down -v --remove-orphans && git reset --hard HEAD && git clean -fd && git pull origin main
```

### 2. 1-Click SSL Certificate Setup (Let's Encrypt)
To automatically issue Let's Encrypt SSL certificates for your domain and configure Nginx:
```bash
sudo bash infra/scripts/setup-ssl.sh test.xoxod33p.tech
```

### 3. Rebuild Containers
```bash
docker compose -f infra/docker-compose.prod.yml build --no-cache
docker compose -f infra/docker-compose.prod.yml up -d --force-recreate
```

---

## 🤖 GitHub Actions CI/CD Pipeline

Required Secrets in **GitHub Repository > Settings > Secrets and variables > Actions**:

| Secret Name | Description | Example |
|---|---|---|
| `VPS_HOST` | VPS Server IP address or domain | `136.85.39.220` |
| `VPS_USERNAME` | SSH User | `root` |
| `VPS_PASSWORD` | VPS Root Password | `YourSecureVpsPassword` |
| `SUPABASE_URL` | Supabase Project URL | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase Publishable / Anon Key | `sb_publishable_...` |
| `WEB_ORIGIN` | Production Web Origin URL | `http://test.xoxod33p.tech` |
| `PROD_ENV_FILE` | Complete production `.env` contents | Paste full `.env` contents |

---

## 🛠️ Verification & Health Checks

- **Web Frontend**: `http://test.xoxod33p.tech` / `https://test.xoxod33p.tech`
- **API Liveness**: `curl http://test.xoxod33p.tech/api/v1/health/live`
- **API Readiness**: `curl http://test.xoxod33p.tech/api/v1/health/ready`
- **Container Status**: `docker compose -f infra/docker-compose.prod.yml ps`
