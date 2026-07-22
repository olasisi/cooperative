# Prompt 030: Approval Threshold Management

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Approval thresholds are persisted in the `Setting` model. The current implementation reads the `approval_threshold` setting and falls back to `2` when no record exists.

## Setting Model
```prisma
model Setting {
  id        String   @id @default(uuid())
  key       String   @unique
  value     String
  createdAt DateTime @default(now())
}
```

## Runtime Getter
```js
async function getApprovalThreshold() {
  const s = await prisma.setting.findUnique({ where: { key: 'approval_threshold' } });
  return s ? Number(s.value) : 2; // default 2
}
```

## Default Threshold
If there is no setting row, the effective threshold is:
```txt
2
```

## Where It Is Enforced
`approveRequest()` reads the threshold after recording a vote and again inside the execution transaction before promoting the request.

## Current Configuration State
What exists now:
- `Setting` table
- threshold getter
- threshold enforcement in approval logic

What does **not** yet exist in checked-in routes:
- `GET /api/settings/approval-threshold`
- `PUT /api/settings/approval-threshold`

## Implementation-Ready Setter Pattern
A matching admin setter can be added with an upsert:
```js
async function setApprovalThreshold(value) {
  if (!Number.isInteger(Number(value)) || Number(value) < 1) {
    throw Object.assign(new Error('threshold must be a positive integer'), { status: 400 });
  }
  return prisma.setting.upsert({
    where: { key: 'approval_threshold' },
    update: { value: String(value) },
    create: { key: 'approval_threshold', value: String(value) },
  });
}
```

## Suggested API Contract
- `GET /api/settings/approval-threshold`
- `PUT /api/settings/approval-threshold` with `{ "value": 3 }`
- Guard: `authenticate`, `ensureRole('ADMIN')`

## Naming Note
The code uses the lowercase key `approval_threshold`, even though prompt phrasing may refer to `APPROVAL_THRESHOLD` conceptually.
