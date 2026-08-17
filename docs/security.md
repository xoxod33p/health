# 🔐 Security Architecture & Principles

CareSignal is designed with strict healthcare data confidentiality, role isolation, and self-hosted privacy standards.

---

## Key Security Controls

1. **Native Self-Hosted Authentication**:
   - Zero third-party SaaS dependencies (Supabase, Firebase, Auth0 are not used).
   - High-security cryptographic JWT verification with `jose` and `bcrypt` password hashing.
   - Root protected administrator safeguards (`admin@caresignal.local`) prevents accidental deletion or demotion.

2. **Server-Enforced Tenant Context (`companyId`)**:
   - Client-provided identifiers are ignored.
   - All MongoDB queries enforce `{ companyId: user.companyId }` filtering.
   - Role permissions (`SYSTEM_ADMIN`, `MANAGER`, `INHOUSE_STAFF`, `OUT_EMPLOYEE`) are verified strictly server-side.

3. **Rate Limiting & Brute Force Mitigation**:
   - Distributed NestJS `ThrottlerGuard` protects login and sensitive API endpoints.
   - Fallback-safe connection pooling to Redis.

4. **Private Storage & Download Tokens**:
   - Categorized storage files (`storage/reports/`, `storage/sensors/`) are not directly accessible from the web.
   - Downloads require an authenticated API request with streaming response headers.

5. **Immutable Audit Logging**:
   - All destructive actions, user updates, sensor assignments, and data clearances produce an immutable audit log entry in the `audit_logs` collection.
