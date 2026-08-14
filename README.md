# 🏥 CareSignal — Healthcare Sensor Management Platform

CareSignal is an enterprise-grade, modular-monolith healthcare sensor telemetry & customer management SaaS platform built with **Next.js 16**, **React 19**, **NestJS 11**, **MongoDB 8**, **Redis 7.4**, and **Native JWT Authentication**.

---

## ⚡ Tech Stack Architecture

- **Frontend (`apps/web`)**: Next.js 16 (App Router), React 19, Lucide Icons, and Mobile-optimized responsive design system.
- **Backend API (`apps/api`)**: NestJS 11 Modular Monolith with Mongoose, Throttler, WebSocket Gateway, and role-based permissions.
- **Database & Cache**: MongoDB 8 (`employees`, `customers`, `sensors`, `assignments`, `reports`, `audit_logs`) and Redis 7.4.
- **Storage**: Local categorized tenant-isolated filesystem storage (`storage/reports`, `storage/customers`, `storage/sensors`).
- **Authentication**: Native JWT session authentication and role-based access control.

---

## 🚀 Key Features

1. **Sensor & Telemetry Management**: Register devices, track models/serials, manage statuses (`AVAILABLE`, `ASSIGNED`, `DISABLED`), and inspect telemetry.
2. **Instant Customer-Sensor Linking**: Link sensors to specific customers directly during registration or assign unassigned devices later.
3. **Comprehensive Report Engine**: Generate and export reports in **Excel (`.xlsx`)**, **PDF**, and **CSV** with automatic persistent storage archiving.
4. **User Management & Role Control**: User administration directory supporting `SYSTEM_ADMIN`, `MANAGER`, `INHOUSE_STAFF`, and `OUT_EMPLOYEE` roles with protected root administrator security.
5. **Customer Directory**: Customer records with contact info, status, and linked hardware devices.
6. **Mobile-First Responsive Layout**: Touch-optimized navigation drawer with dark backdrop blur, responsive data tables, mobile-friendly stat grids, and modal popups.

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
   ```
3. Start infrastructure containers (MongoDB, Redis):
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

Or simply run the unified startup script on Windows:
```bash
.\run-dev.cmd
```

---

## 🛠️ Verification & Health Checks

- **Web Frontend**: `http://localhost:3000`
- **API Liveness**: `http://localhost:3001/api/v1/health`
- **Container Status**: `docker compose -f infra/docker-compose.yml ps`
