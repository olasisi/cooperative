# Prompt 039: Cooperative Settings Module

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Defined the cooperative settings subsystem for runtime configuration such as approval thresholds. The design uses a simple key/value table, admin-only mutation endpoints, and optional read caching.

## Data Model

```prisma
model Setting {
  id        String   @id @default(uuid())
  key       String   @unique
  value     String
  createdAt DateTime @default(now())
}
```

Recommended keys:
- `APPROVAL_THRESHOLD`
- `LOAN_MAX_TERM_MONTHS`
- `TRANSFER_DAILY_LIMIT`
- `MAINTENANCE_MODE`

## Service Operations
- `createSetting(key, value)`
- `getSetting(key)`
- `listSettings()`
- `updateSetting(key, value)`
- `deleteSetting(key)`

```js
async function getApprovalThreshold() {
  const setting = await prisma.setting.findUnique({ where: { key: 'APPROVAL_THRESHOLD' } });
  return setting ? Number(setting.value) : 2;
}
```

## CRUD Behavior
### Create
Insert a unique key; reject duplicates with `409 Conflict`.

### Read
Return the setting by key or the full list for admin dashboards.

### Update
Upsert is acceptable for operational simplicity when the key is known.

```js
await prisma.setting.upsert({
  where: { key: 'APPROVAL_THRESHOLD' },
  update: { value: '2' },
  create: { key: 'APPROVAL_THRESHOLD', value: '2' },
});
```

### Delete
Allow only for non-critical settings; core settings may be safer as non-deletable.

## API Endpoints
```http
GET    /api/settings
GET    /api/settings/:key
POST   /api/settings
PATCH  /api/settings/:key
DELETE /api/settings/:key
```

Mutation routes must be admin-only; reads can be admin-only or selectively public depending on the key.

## Approval Threshold Usage
The approvals flow reads `APPROVAL_THRESHOLD` to decide when a request transitions from `PENDING` to executable.

```mermaid
flowchart TD
  A[Admin updates setting] --> B[(Setting table)]
  B --> C[getApprovalThreshold()]
  C --> D[approveRequest() checks threshold]
```

## Caching Considerations
A tiny cache is sufficient because settings are low-volume and read often.

```js
const cache = new Map();

async function getSettingCached(key) {
  if (cache.has(key)) return cache.get(key);
  const setting = await prisma.setting.findUnique({ where: { key } });
  cache.set(key, setting?.value ?? null);
  return setting?.value ?? null;
}
```

Cache invalidation rules:
- clear on create/update/delete;
- keep TTL short if multiple app instances run;
- use Redis for distributed cache if needed.
