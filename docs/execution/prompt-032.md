# Prompt 032: Idempotency Implementation

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Idempotency is enforced by a combination of request state, row locking, existing-ledger detection, and the `LedgerEntry` unique constraint on `(reference, type)`.

## Database Guard
```prisma
model LedgerEntry {
  // ...
  @@unique([reference, type], name: "unique_reference_type")
}
```

## Request State Guard
```prisma
model Request {
  // ...
  executed   Boolean  @default(false)
  executedAt DateTime?
}
```

## Re-Entrancy Checks
Inside the approval execution transaction:
```js
if (lockedReq.status !== 'PENDING') return;
if (lockedReq.executed) {
  await tx.request.update({ where: { id: requestId }, data: { status: 'EXECUTED' } });
  return;
}
```

## Existing Ledger Detection
```js
const existingExecution = await tx.ledgerEntry.findFirst({
  where: { reference: requestId, type: 'EXECUTION_DEBIT' }
});
if (existingExecution) {
  await tx.auditLog.create({ data: { actionType: 'REQUEST_EXECUTION_SKIPPED', details: { requestId, reason: 'already executed - existing ledger entries' } } });
  await tx.request.update({ where: { id: requestId }, data: { status: 'EXECUTED', executed: true, executedAt: new Date() } });
  return;
}
```

## Unique Constraint Handling (`P2002`)
```js
} catch (err) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    await tx.auditLog.create({ data: { actionType: 'REQUEST_EXECUTION_IDEMPOTENT', details: { requestId, reason: 'duplicate ledger entries detected' } } });
    await tx.request.update({ where: { id: requestId }, data: { status: 'EXECUTED', executed: true, executedAt: new Date() } });
    return;
  } else {
    throw err;
  }
}
```

## What Happens on Duplicate Execution Attempts
- the row lock narrows execution to one winner under concurrency
- if a second worker arrives after ledger creation, the existing-ledger check returns gracefully
- if a race still reaches the insert point, `P2002` is caught and treated as an idempotent success path
- the request is marked executed rather than failing permanently

## Verified Behavior
`tests/approvals.concurrency.test.js` asserts:
- request status becomes `EXECUTED`
- `executed = true`
- only two execution ledger rows exist
- only one `REQUEST_EXECUTED` audit row exists
