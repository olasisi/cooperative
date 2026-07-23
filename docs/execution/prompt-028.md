# Prompt 028: Request Module (Propose Transactions)

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
The request module creates and reads approval-governed work items. Threshold lookup is already backed by the `Setting` table. The runtime module currently stores richer fields than are visible in the schema snapshot, so schema alignment is the key follow-up task.

## Lifecycle States
The schema defines:
```prisma
enum RequestStatus {
  PENDING
  APPROVED
  REJECTED
  EXECUTED
}
```

## Current Schema Intent
```prisma
model Request {
  id            String        @id @default(uuid())
  cooperativeId String?
  type          String
  metadata      Json?
  proposerId    String
  proposer      User          @relation("proposer", fields: [proposerId], references: [id])
  status        RequestStatus @default(PENDING)
  executed      Boolean       @default(false)
  approvals     Approval[]
  createdAt     DateTime      @default(now())
  executedAt    DateTime?
}
```

## Current Module Contract
```js
async function createRequest({ proposerId, title, description, amount = null, metadata = {} }) {
  if (!proposerId || !title) throw Object.assign(new Error('proposerId and title required'), { status: 400 });
  const req = await prisma.request.create({
    data: {
      title,
      description,
      amount: amount ? String(amount) : null,
      proposerId,
      status: 'PENDING',
      metadata: JSON.stringify(metadata),
    },
  });
  await logAudit('REQUEST_CREATED', proposerId, { requestId: req.id, title });
  return req;
}
```

## Read APIs
### List
```js
async function listRequests({ where = {}, take = 50 }) {
  return prisma.request.findMany({ where, orderBy: { createdAt: 'desc' }, take, include: { approvals: true } });
}
```

### Get single request
```js
async function getRequest(id) {
  const req = await prisma.request.findUnique({ where: { id }, include: { approvals: true } });
  if (!req) throw Object.assign(new Error('Request not found'), { status: 404 });
  return req;
}
```

## Approval Threshold Lookup
```js
async function getApprovalThreshold() {
  const s = await prisma.setting.findUnique({ where: { key: 'approval_threshold' } });
  return s ? Number(s.value) : 2;
}
```

## Route Surface
- `POST /api/requests`
- `GET /api/requests`
- `GET /api/requests/:id`

## Alignment Notes
- The schema topic calls for `cooperativeId`, `type`, `metadata`, and `proposerId`.
- The runtime module currently writes `title`, `description`, `amount`, and JSON-stringified `metadata`.
- If the request model is intended to support both governance metadata and human-readable proposal content, the next schema migration should include those fields explicitly.
