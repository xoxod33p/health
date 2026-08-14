# Architecture

The platform operates as a modular monolith:

```text
Next.js web (Port 3000) -> NestJS API (Port 3001) -> MongoDB (Port 27017)
                                                  -> Redis (Port 6379)
                                                  -> Categorized Storage (storage/)
```

The API serves as the trust boundary, deriving `userId`, company membership (`companyId`), role, and permissions from verified JWT session data.

Tenant-owned repositories require tenant context and apply `companyId` internally on all queries and storage operations.
