# Prompt 026: Ledger Entry Module

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Ledger entries are the immutable financial journal of the system. The schema enforces unique `(reference, type)` pairs, and wallet/loan/request/surety flows write append-only entries rather than mutating prior records.

## Model
```prisma
model LedgerEntry {
  id            String   @id @default(uuid())
  reference     String
  type          String
  amount        Decimal
  currency      String   @default("NGN")
  debitUserId   String?
  creditUserId  String?
  beforeBalance Decimal
  afterBalance  Decimal
  createdAt     DateTime @default(now())

  @@unique([reference, type], name: "unique_reference_type")
}
```

## Helper: `createLedgerPair()`
```js
async function createLedgerPair({ reference, type, amount, currency = 'NGN', debitUserId = null, creditUserId = null }) {
  const beforeDebit = debitUserId ? await prisma.wallet.findUnique({ where: { userId: debitUserId } }) : null;
  const beforeCredit = creditUserId ? await prisma.wallet.findUnique({ where: { userId: creditUserId } }) : null;

  const entries = [];
  if (debitUserId) {
    entries.push({ reference, type, amount: String(amount), currency, debitUserId, creditUserId,
      beforeBalance: beforeDebit ? String(beforeDebit.available) : '0',
      afterBalance: beforeDebit ? String(beforeDebit.available) : '0' });
  }
  if (creditUserId) {
    entries.push({ reference, type, amount: String(amount), currency, debitUserId, creditUserId,
      beforeBalance: beforeCredit ? String(beforeCredit.available) : '0',
      afterBalance: beforeCredit ? String(beforeCredit.available) : '0' });
  }
  return prisma.ledgerEntry.createMany({ data: entries });
}
```

## Current Usage Pattern
Most business flows currently write ledger entries inline rather than through `createLedgerPair()`:
- deposit → `DEPOSIT`
- withdraw → `WITHDRAW`
- lock funds → `LOCK`
- unlock funds → `UNLOCK`
- request execution → `EXECUTION_DEBIT` / `EXECUTION_CREDIT`
- loan disbursement → `LOAN_DISBURSE`
- loan repayment → `LOAN_REPAY`
- surety pledge → `SURETY_PLEDGE`
- surety release → `SURETY_RELEASE`

## Balance Snapshots
Each entry stores:
- `beforeBalance`
- `afterBalance`

These are captured from the updated wallet row or from pre-read wallet data, depending on the flow. That makes every journal row independently useful for audits and account history reconstruction.

## Immutability Policy
Application code only creates ledger rows. There are no module paths that update or delete ledger entries during normal business operations. Corrections should be handled by compensating entries, not mutation.

## Idempotency Constraint
`@@unique([reference, type])` prevents duplicate writes for the same business event/type combination. This is especially important for concurrent request execution.

## Type Vocabulary Note
The prompt topic lists canonical business labels such as `TRANSFER`, `SURETY_LOCK`, and `SURETY_UNLOCK`. The current implementation persists slightly different concrete values such as `EXECUTION_DEBIT`, `EXECUTION_CREDIT`, `SURETY_PLEDGE`, and `SURETY_RELEASE`.
