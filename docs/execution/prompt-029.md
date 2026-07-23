# Prompt 029: Approval Module (Multi-Admin Approval)

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Multi-admin approval is implemented in `src/modules/approvals.js`. Duplicate votes are rejected, proposers cannot self-approve, and the threshold check automatically triggers execution when enough approvals exist.

## Route Guard
Admin-only access is enforced at the HTTP layer:
```js
router.post('/:requestId', authenticate, ensureRole('ADMIN'), async (req, res, next) => {
  const { action, note } = req.body;
  if (action === 'approve') {
    const a = await approveRequest({ approverId: req.user.id, requestId, note });
    return res.json(a);
  }
});
```

## `approveRequest()` Validation
```js
const req = await prisma.request.findUnique({ where: { id: requestId } });
if (!req) throw Object.assign(new Error('Request not found'), { status: 404 });
if (req.proposerId === approverId) throw Object.assign(new Error('Proposer cannot approve their own request'), { status: 403 });
if (req.status !== 'PENDING') throw Object.assign(new Error('Request not in pending state'), { status: 400 });

const existing = await prisma.approval.findFirst({ where: { requestId, approverId } });
if (existing) throw Object.assign(new Error('You have already approved this request'), { status: 400 });
```

## Vote Recording
```js
const approval = await prisma.approval.create({ data: { requestId, approverId, note } });
await logAudit('REQUEST_APPROVED', approverId, { requestId, approvalId: approval.id, note });
```

## Threshold Enforcement
```js
const count = await prisma.approval.count({ where: { requestId } });
const threshold = await getApprovalThreshold();
if (count >= threshold) {
  await prisma.$transaction(async (tx) => {
    // lock row, re-check count/status/executed, then execute
  });
}
```

## Automatic Execution Trigger
Once approval count reaches threshold, the module:
1. locks the request row
2. re-checks state under transaction
3. marks request `APPROVED`
4. executes transfer metadata when present
5. marks request `EXECUTED`

## Rejection Path
The same route also supports rejection:
```js
async function rejectRequest({ approverId, requestId, note = null }) {
  const approval = await prisma.approval.create({ data: { requestId, approverId, note } });
  await prisma.request.update({ where: { id: requestId }, data: { status: 'REJECTED' } });
  await logAudit('REQUEST_REJECTED', approverId, { requestId, approvalId: approval.id, note });
  return approval;
}
```

## Verified by Tests
- self-approval rejection
- threshold enforcement
- successful transfer execution
- rollback on insufficient funds
- concurrency-safe single execution
