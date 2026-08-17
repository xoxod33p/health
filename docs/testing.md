# 🧪 CareSignal Testing & Quality Assurance

CareSignal maintains a comprehensive testing pipeline verifying static types, unit correctness, and cross-workspace compatibility.

---

## 🏃 Running Tests

### 1. Static Type Checking
Validates strict TypeScript types across both `@healthcare/api` and `@healthcare/web`:
```bash
npm run typecheck
```

### 2. Unit Testing
Executes Jest test suites across all core services:
```bash
npm test
```

### 3. Linting
```bash
npm run lint
```

---

## 🔬 Test Coverage Areas

1. **Storage Service** (`storage.service.spec.ts`):
   - Validates localized directory initialization (`storage/reports`, `storage/sensors`, etc.).
   - Tests file writing, reading, and stream downloads.

2. **Health Service** (`health.service.spec.ts`):
   - Validates `/api/v1/health` liveness response.
   - Tests MongoDB connection state and Redis readiness fallback.

3. **Audit Service** (`audit.service.spec.ts`):
   - Tests immutable audit logging, actor association, and error isolation.

4. **System Service** (`system.service.spec.ts`):
   - Tests protected root admin preservation and data reset isolation.

5. **Reports Service** (`reports.service.spec.ts`):
   - Tests PDF, Excel (`.xlsx`), and CSV generation pipelines.
   - Validates 15-day sensor replacement reporting calculations.
