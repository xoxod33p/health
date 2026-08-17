# 🏛️ CareSignal System Architecture

CareSignal is structured as a high-performance modular monolith with strict domain boundaries, self-hosted data isolation, and distributed pub/sub capabilities.

---

## 🗺️ High-Level Topology

```text
               🌐 HTTPS / WSS Internet Ingress
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
    (PWA + Service Worker)              (Modular Monolith)
    Container: caresignal-web           Container: caresignal-api
    Port: 127.0.0.1:3000                Port: 127.0.0.1:3001
                                                │
                                    ┌───────────┴───────────┐
                                    │                       │
                                    ▼                       ▼
                           [MongoDB 4.4.29]         [Redis 7.4.2]
                           (Universal Non-AVX)      (Pub/Sub & Cache)
                           Container:               Container:
                           caresignal-mongodb       caresignal-redis
                                    │
                            [Local Storage]
                            /app/storage -> storage_prod_data
```

---

## 🧱 Key Architectural Components

### 1. Web Application (`apps/web`)
- **Next.js 16 (React 19)** App Router.
- **PWA Ready**: Registered Service Worker (`/sw.js`), Web App Manifest (`/manifest.json`), Apple touch icons, and offline caching shell.
- **Pure CSS Design System**: Zero Tailwind dependencies, responsive drawer navigation, custom scrollbars, and mobile touch-locking safeguards.
- **Embedded Search**: Search and filter toolbars positioned within panel headers for intuitive contextual search.

### 2. Backend API (`apps/api`)
- **NestJS 11 Modular Monolith**:
  - `AuthModule`: Self-hosted native JWT (`jose`) with role-based security guards.
  - `SensorsModule`: Sensor inventory, 15-day lifecycle tracking, customer assignments, and replacement maintenance logs.
  - `CustomersModule`: Customer profiles, `CUS-XXXXX` identifier generation, and sensor attachment queries.
  - `ReportsModule`: Executive dynamic PDF, Excel (`.xlsx`), and CSV generation with persistent filesystem archiving.
  - `RedisModule`: Connection pooling, query cache invalidation, and WebSocket adapter bridging.
  - `RealtimeModule`: WebSocket gateway (`/realtime`) with `@socket.io/redis-adapter` for multi-instance pub/sub event broadcasting.
  - `AuditModule`: Append-only immutable compliance log.
  - `HealthModule`: Liveness & readiness reporting database and Redis state.

### 3. Database & Caching Layer
- **MongoDB 4.4.29**: Universal compatibility image running without AVX CPU requirements, ensuring zero illegal instruction crashes on low-cost virtualized VPS hypervisors.
- **Redis 7.4.2 Alpine**: Caches frequent telemetry counts, stores distributed rate-limiting buckets, and powers WebSocket pub/sub.
