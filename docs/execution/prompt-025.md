# Prompt 025: Transfer Operation

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
There is no standalone `wallet.transfer()` helper or `/api/wallets/transfer` route in the current codebase. The implemented transfer path lives inside request execution and performs an atomic debit/credit transfer once approval threshold is met.

## Current Transfer Execution Pattern
Transfers are encoded in request metadata:
```js
const meta = { action: 'transfer', fromUserId: payer.id, toUserId: recipient.id, amount: '1000' };
const r = await requests.createRequest({ proposerId: proposer.id, title: 'Pay vendor', description: 'transfer test', amount: '1000', metadata: meta });
```

When the second admin approval arrives, `approveRequest()` executes the transfer inside a transaction.

## Atomic Debit + Credit
```js
const debitRows = await tx.$queryRaw`
  UPDATE "Wallet" SET "available" = "available" - ${amount}
  WHERE "userId" = ${from} AND "available" >= ${amount}
  RETURNING *;
`;
if (debitRows.length === 0) throw Object.assign(new Error('Insufficient funds for execution'), { status: 400 });

const creditRows = await tx.$queryRaw`
  UPDATE "Wallet" SET "available" = "available" + ${amount}
  WHERE "userId" = ${to}
  RETURNING *;
`;
if (creditRows.length === 0) throw Object.assign(new Error('Recipient wallet not found'), { status: 404 });
```

## Ledger Pair
```js
await tx.ledgerEntry.createMany({ data: [
  {
    reference: requestId,
    type: 'EXECUTION_DEBIT',
    amount,
    currency: 'NGN',
    debitUserId: from,
    creditUserId: to,
    beforeBalance: String(Number(fromUpdated.available) + Number(amount)),
    afterBalance: String(fromUpdated.available),
  },
  {
    reference: requestId,
    type: 'EXECUTION_CREDIT',
    amount,
    currency: 'NGN',
    debitUserId: from,
    creditUserId: to,
    beforeBalance: String(Number(toUpdated.available) - Number(amount)),
    afterBalance: String(toUpdated.available),
  }
]});
```

## Audit Trail
Successful execution writes:
```js
await tx.auditLog.create({
  data: { actionType: 'REQUEST_EXECUTED', details: { requestId, from, to, amount } }
});
```

## API Surface Today
- **Transfer proposal:** `POST /api/requests`
- **Transfer approval/execution trigger:** `POST /api/approvals/:requestId`

## Design Note
If a direct member-to-member transfer API is later extracted, it should reuse this same pattern:
1. atomic sender debit with balance check
2. atomic receiver credit
3. paired ledger entries
4. audit log
5. idempotency reference
