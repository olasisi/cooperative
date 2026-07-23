# Prompt 031: Request Execution Engine

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Request execution is implemented inline inside `approveRequest()` rather than as a separate exported `executeRequest()` function. It uses a database transaction, row-level locking, idempotency guards, ledger writes, and audit logging.

## Execution Trigger
Execution starts only after approval count reaches threshold.

## Row-Level Locking
```js
const lockedRows = await tx.$queryRaw`
  SELECT * FROM "Request" WHERE id = ${requestId} FOR UPDATE
`;
const lockedReq = lockedRows[0];
```

This ensures only one concurrent worker wins the execution path.

## Re-checks Inside the Transaction
```js
if (lockedReq.status !== 'PENDING') return;
if (lockedReq.executed) {
  await tx.request.update({ where: { id: requestId }, data: { status: 'EXECUTED' } });
  return;
}
const txCountRes = await tx.approval.count({ where: { requestId } });
const txThreshold = await getApprovalThreshold();
if (txCountRes < txThreshold) return;
```

## Execution of Transfer Metadata
```js
if (meta && (meta.action === 'transfer' || meta.type === 'transfer')) {
  const amount = String(meta.amount);
  const from = meta.fromUserId || meta.debitUserId;
  const to = meta.toUserId || meta.creditUserId;
  // debit sender, credit recipient, create ledgers, mark executed
}
```

## Ledger and Audit Writes
On successful money movement, the engine writes:
- `EXECUTION_DEBIT` ledger row
- `EXECUTION_CREDIT` ledger row
- `REQUEST_EXECUTED` audit row
- request status update to `EXECUTED`

## Idempotency Guardrails
Before money movement, the engine checks for pre-existing execution ledger rows:
```js
const existingExecution = await tx.ledgerEntry.findFirst({ where: { reference: requestId, type: 'EXECUTION_DEBIT' } });
if (existingExecution) {
  await tx.request.update({ where: { id: requestId }, data: { status: 'EXECUTED', executed: true, executedAt: new Date() } });
  return;
}
```

## Failure Behavior
If debit fails because the source wallet lacks funds, the transaction throws and rolls back. Tests confirm the request remains `PENDING` in that case.

## Design Note
If this logic is later extracted into a dedicated `executeRequest()` service, keep the same ingredients:
1. transactional boundary
2. row lock
3. threshold re-check
4. idempotency check
5. business execution
6. ledger + audit persistence
7. final executed marker
