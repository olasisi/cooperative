# Prompt 047: Pagination & Filtering

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Defined a shared pagination and filtering pattern for list endpoints such as audit logs, loans, requests, and reports. The design standardizes query parameters, Prisma `skip/take`, and response envelopes.

## Query Parameters
Use these common parameters:
- `page` (1-based)
- `pageSize`
- `type`
- `userId`
- `dateFrom`
- `dateTo`
- optional sort override

## Prisma Pattern
```js
const page = Math.max(1, Number(req.query.page || 1));
const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)));
const skip = (page - 1) * pageSize;
const take = pageSize;

const where = {
  ...(req.query.type ? { type: req.query.type } : {}),
  ...(req.query.userId ? { userId: req.query.userId } : {}),
  ...(req.query.dateFrom || req.query.dateTo
    ? { createdAt: { ...(req.query.dateFrom ? { gte: new Date(req.query.dateFrom) } : {}), ...(req.query.dateTo ? { lte: new Date(req.query.dateTo) } : {}) } }
    : {}),
};
```

## Sorting
Default sort order should be newest first.

```js
orderBy: { createdAt: 'desc' }
```

## Response Envelope
```json
{
  "data": [],
  "total": 250,
  "page": 2,
  "pageSize": 25
}
```

## Example Service
```js
const [data, total] = await prisma.$transaction([
  prisma.loan.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
  prisma.loan.count({ where }),
]);

return { data, total, page, pageSize };
```

## Endpoint Coverage
Recommended for:
- `GET /api/requests`
- `GET /api/loans`
- `GET /api/audit-logs`
- `GET /api/reports/*`
- future `GET /api/members`

## Flow
```mermaid
flowchart LR
  A[Query params] --> B[Normalize page/pageSize]
  B --> C[Build Prisma where]
  C --> D[findMany + count]
  D --> E[{data,total,page,pageSize}]
```

## Implementation Notes
- cap `pageSize` to protect the database;
- use identical envelopes across modules;
- only expose filter fields that map cleanly to indexed columns.
