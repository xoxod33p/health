# Data model

All tenant-owned documents include `companyId`, `createdAt`, and `updatedAt` where applicable.

Core collections:

- `companies`, `users`, `company_members`, `roles`, `permissions`, `role_permissions`
- `customers`, `customer_contacts`, `customer_notes`, `employees`
- `sensor_types`, `sensors`, `sensor_assignments`, `sensor_events`
- `notifications`, `notification_preferences`, `notification_jobs`
- `reports`, `report_exports`, `files`, `audit_logs`

Required uniqueness is compound and tenant-aware, for example `{ companyId: 1, serialNumber: 1 }` on sensors. Assignment history and sensor events are append-only; replacement and unassignment create events rather than deleting history.

Expiration notification idempotency uses a unique key composed from `companyId`, `sensorId`, expiration threshold, and calendar processing date. Report exports and email delivery records retain job attempts and failure details.
