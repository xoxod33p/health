# 📊 CareSignal Data Model

All tenant-owned collections enforce `companyId`, `createdAt`, and `updatedAt`.

---

## Core Collections

### 1. `users`
- `authUserId`: Unique identifier.
- `email`: Normalized lowercase email.
- `passwordHash`: Salted bcrypt hash.
- `role`: `SYSTEM_ADMIN` | `MANAGER` | `INHOUSE_STAFF` | `OUT_EMPLOYEE`.
- `status`: `ACTIVE` | `INACTIVE` | `SUSPENDED`.
- `companyId`: Tenant reference.

### 2. `customers`
- `customerNumber`: Unique sequential ID (`CUS-00001`, `CUS-00002`).
- `firstName`, `lastName`, `phone`, `email`, `address`, `notes`.
- `status`: `ACTIVE` | `INACTIVE`.
- `companyId`: Tenant reference.

### 3. `sensors`
- `serialNumber`: Hardware identifier (uppercase, e.g. `SN-882194`).
- `sensorTypeId`: Type registry reference.
- `manufacturer`, `model`, `hardwareVersion`.
- `status`: `AVAILABLE` | `ASSIGNED` | `EXPIRING_SOON` | `EXPIRED` | `REPLACED` | `DISABLED`.
- `activatedAt`: Installation / activation timestamp.
- `expiresAt`: Automated expiration date (15-day lifecycle from activation).
- `customerId`: Attached customer reference.

### 4. `sensor_assignments`
- `sensorId`: Target sensor.
- `customerId`: Assigned customer.
- `assignedBy`: User identifier.
- `assignedAt`, `unassignedAt`: Lifecycle timestamps.
- `reason`: Assignment purpose or note.

### 5. `sensor_replacements`
- `customerName`: Recipient customer name.
- `serialNumber`: Replaced sensor serial number.
- `replacedDate`: Date of replacement.
- `issueType`: Hardware fault, wear expiration, or reason.
- `notes`: Clinical or operational remarks.
- `replacedBy`: Staff member logging the replacement.

### 6. `sensor_types`
- `name`: Display name (e.g. `Continuous Glucose Monitor`).
- `code`: Identifier (e.g. `CGM-G7`).
- `description`, `status`: Active status.

### 7. `reports`
- `title`, `type`: `SENSOR_INVENTORY` | `EXPIRATION_REPLACEMENT` | `CUSTOMER_COVERAGE` | `OPERATIONAL_SUMMARY`.
- `filePath`: Local storage archive path (`storage/reports/`).
- `format`: `PDF` | `XLSX` | `CSV`.
- `status`: `GENERATED` | `FAILED`.

### 8. `audit_logs`
- `action`: Event name (`sensor.create`, `sensor.assign`, `customer.create`, etc.).
- `resourceType`, `resourceId`: Entity reference.
- `userEmail`, `authUserId`: Performing user.
- `details`: Metadata snapshot of the operation.
