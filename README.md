# Healthcare Sensor Management Platform

A modular-monolith healthcare sensor management SaaS foundation.

## Workspace

- `apps/api`: NestJS REST API. Authentication, tenant context, and domain modules belong here.
- `apps/web`: Next.js frontend with Tailwind CSS. UI permissions are convenience only; API authorization is authoritative.
- `infra`: Docker Compose, Nginx, backups, and deployment configuration.
- `docs`: architecture, security, data model, and operational decisions.

## Local start

1. Copy `.env.example` to `.env` and replace development-only values as needed.
2. Install packages: `npm install`
3. Start the data services: `docker compose -f infra/docker-compose.yml up -d mongodb redis minio`
4. Start the API: `npm run dev:api`

To create or reset the local development admin in Supabase and MongoDB, run `npm --workspace apps/api run admin:bootstrap`. Use the `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` values from your local `.env` to sign in at `/login`.

On Windows, run `run-dev.cmd` from the repository folder to open separate PowerShell windows for infrastructure, API, and web.

Docker services expose only local development ports: MongoDB on `27017`, Redis on `6379`, and MinIO on `9000` with its console on `9001`. Compose reads database credentials from `.env` and falls back to development-only defaults when variables are absent.

API health endpoints are available at `/api/v1/health`, `/api/v1/health/live`, and `/api/v1/health/ready`.

Production secrets must come from the deployment secret manager. Never expose the Supabase service-role key, database credentials, Redis password, MinIO secret, or email API key to the browser.
