# Security decisions

- Supabase Auth is authentication only. MongoDB is the application system of record.
- JWT verification and membership lookup happen server-side.
- Role and company identifiers from the client are ignored for authorization.
- Tenant-owned data access is repository-scoped by authenticated `companyId`.
- All request DTOs use whitelist validation; unknown fields are rejected or stripped at the API boundary.
- Helmet, constrained CORS, rate limiting, structured request logs, and immutable audit writes belong to the API.
- MinIO objects are private. Downloads use short-lived signed URLs after an API authorization check.
- MongoDB, Redis, and MinIO bind to loopback in local Compose and are not public application dependencies.
- Production secrets must be injected at runtime and must never be bundled into Next.js client code.
- Cross-tenant API tests are mandatory for customers, employees, sensors, reports, notifications, files, and audit logs.
