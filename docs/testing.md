# Testing strategy

- Unit: services, permission evaluation, lifecycle transitions, expiration threshold calculation, and idempotency keys.
- API integration: Supabase JWT verification, membership resolution, DTO validation, and repository tenant filters.
- Security: Company A identities must receive `403` or `404` for Company B resources even when IDs and query parameters are changed.
- Background processing: retry/backoff, duplicate notification prevention, failed-job recording, and manual retry will be covered when the worker is reintroduced.
- E2E: login, MFA for privileged accounts, customer and sensor workflows, reports, private files, and notification states.
- Performance: indexed pagination and aggregation against representative customer, sensor, notification, and audit volumes.
