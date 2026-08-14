# 🚀 Deployment Guide

Deployment reference guide for running CareSignal across Docker environments.

---

## 1. System Architecture

```text
Next.js Web (Port 3000)   ──>   NestJS API (Port 3001)
                                      │
                         ┌────────────┴────────────┐
                    [MongoDB 8]               [Redis 7.4]
                    Port 27017                 Port 6379
                         │
               [Categorized Storage]
                  storage/reports/
```

---

## 2. Infrastructure Setup

Start database and caching services using Docker Compose:

```bash
docker compose -f infra/docker-compose.yml up -d
```

---

## 3. Production Environment Template

Create or verify `.env`:

```env
NODE_ENV=production
PORT=3001
DOMAIN_NAME=localhost
WEB_ORIGIN=http://localhost:3000
JWT_SECRET=care_signal_secure_prod_jwt_secret_99812_key!

NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

MONGO_ROOT_USERNAME=healthcare
MONGO_ROOT_PASSWORD=HealthcareSecurePassword123!
MONGO_DATABASE=healthcare
MONGODB_URI=mongodb://healthcare:HealthcareSecurePassword123!@mongodb:27017/healthcare?authSource=admin

REDIS_PASSWORD=RedisSecurePassword123!
REDIS_URL=redis://:RedisSecurePassword123!@redis:6379

STORAGE_PATH=

DEFAULT_ADMIN_EMAIL=admin@localhost.test
DEFAULT_ADMIN_PASSWORD=ChangeMe_dev_only_123!
DEFAULT_ADMIN_ROLE=SYSTEM_ADMIN
DEFAULT_ADMIN_COMPANY_ID=development-company
```

---

## 4. Admin Account Bootstrap

```bash
npx tsx apps/api/src/scripts/bootstrap-admin.ts
```

---

## 5. Verification & Health Checks

- API Health Status: `http://localhost:3001/api/v1/health`
- Container Status: `docker compose -f infra/docker-compose.yml ps`
