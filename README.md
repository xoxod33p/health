# Healthcare Sensor Management Platform

A modular-monolith healthcare sensor management SaaS foundation.

## Workspace

- `apps/api`: NestJS REST API. Authentication, tenant context, and domain modules belong here.
- `apps/web`: Next.js frontend. UI permissions are convenience only; API authorization is authoritative.
- `apps/worker`: BullMQ worker process for expiration, notifications, reports, audit, and cleanup queues.
- `infra`: Docker Compose, Nginx, backups, and deployment configuration.
- `docs`: architecture, security, data model, and operational decisions.

## Local start

1. Copy `.env.example` to `.env` and replace development-only values as needed.
2. Start dependencies: `docker compose -f infra/docker-compose.yml up -d mongodb redis minio`
3. Install packages: `npm install`
4. Start the API: `npm run dev:api`

On Windows, run `run-dev.cmd` from the repository folder to open separate PowerShell windows for infrastructure, API, web, and worker.

API health endpoints are available at `/api/v1/health`, `/api/v1/health/live`, and `/api/v1/health/ready`.

Production secrets must come from the deployment secret manager. Never expose the Supabase service-role key, database credentials, Redis password, MinIO secret, or email API key to the browser.
