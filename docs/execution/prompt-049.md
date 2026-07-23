# Prompt 049: Approvals Test Suite

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Documented the approvals suite that validates approval, rejection, threshold-based execution, and rollback behavior for executable requests.

## Covered Files
- `tests/approvals.test.js`
- related execution logic in `src/modules/approvals.js`

## Covered Behaviors
- proposer cannot approve own request;
- first approval leaves request `PENDING`;
- second approval reaches threshold and executes transfer;
- rejection sets request to `REJECTED`;
- failed execution rolls back status and balance changes.

## Admin vs Member Auth Model
Tests create:
- one member proposer;
- one member payer;
- one member recipient;
- two admin approvers.

This mirrors the route requirement that approval endpoints are admin-only while requests are member-proposed.

## Threshold Execution Test
```js
const meta = { action: 'transfer', fromUserId: payer.id, toUserId: recipient.id, amount: '1000' };
const r = await requests.createRequest({ proposerId: proposer.id, title: 'Pay vendor', amount: '1000', metadata: meta });

await approvals.approveRequest({ approverId: admin1.id, requestId: r.id, note: 'first' });
await approvals.approveRequest({ approverId: admin2.id, requestId: r.id, note: 'second' });

const executed = await prisma.request.findUnique({ where: { id: r.id } });
expect(executed.status).toBe('EXECUTED');
```

## Rollback on Rejection / Failed Execution
Rejection is immediate and terminal:

```js
const rej = await approvals.rejectRequest({ approverId: admin1.id, requestId: r.id, note: 'nope' });
expect(updated.status).toBe('REJECTED');
```

For insufficient-funds execution, the second approval throws and the transaction keeps the request `PENDING`.

## Expected Response Shapes
Approval result:

```json
{
  "id": "approval-uuid",
  "requestId": "request-uuid",
  "approverId": "admin-uuid",
  "note": "first"
}
```

Request after execution:

```json
{
  "id": "request-uuid",
  "status": "EXECUTED",
  "executed": true,
  "executedAt": "2026-07-22T12:00:00.000Z"
}
```

## Isolation Notes
Each suite creates fresh users and wallets, uses unique emails, and deletes approvals/requests/users on teardown.
