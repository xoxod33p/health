# Architecture

The platform starts as a modular monolith with separate runtime processes:

```text
Nginx -> Next.js web -> NestJS API -> MongoDB
                         |          -> Redis/BullMQ
                         |          -> MinIO metadata/object storage
                         `-> Supabase Auth JWT verification

Background processing is intentionally deferred while the worker process is disabled. Redis remains available for future queue integration.
```

The browser only receives the Supabase public client configuration. The API is the trust boundary and derives `userId`, membership, `companyId`, role, and permissions from verified identity plus MongoDB membership data.

Tenant-owned repositories will require a `TenantContext` and apply `companyId` internally. Controller query parameters cannot override it. Super Admin operations are explicit platform-scoped paths and are never reached through tenant repositories.
