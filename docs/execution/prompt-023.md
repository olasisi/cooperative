# Prompt 023: Deposit Operation

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Deposits are implemented as an admin-triggered wallet credit with an atomic Prisma increment, a single ledger credit entry, and an audit log entry.

## API Endpoint
- `POST /api/wallets/deposit`
- Guards: `authenticate`, `ensureRole('ADMIN')`

```js
router.post('/deposit', authenticate, ensureRole('ADMIN'), async (req, res, next) => {
  const { userId, amount, reference } = req.body;
  if (!userId || !amount) return res.status(400).json({ error: 'userId and amount required' });
  const result = await wallet.deposit({ initiatorId: req.user.id, userId, amount, reference });
  res.json(result);
});
```

## `deposit()` Implementation
```js
async function deposit({ initiatorId = null, userId, amount, reference = 'deposit', type = 'DEPOSIT' }) {
  const updated = await prisma.wallet.update({
    where: { userId },
    data: { available: { increment: String(amount) } },
  });

  await prisma.ledgerEntry.create({
    data: {
      reference,
      type,
      amount: String(amount),
      currency: 'NGN',
      debitUserId: null,
      creditUserId: userId,
      beforeBalance: String(Number(updated.available) - Number(amount)),
      afterBalance: String(updated.available),
    },
  });

  await logAudit('WALLET_DEPOSIT', initiatorId, { userId, amount: String(amount), reference });
  return { available: updated.available.toString(), locked: updated.locked.toString() };
}
```

## Important Behaviors
- Balance update is atomic because Prisma issues an increment operation directly in SQL.
- The ledger row is credit-only:
  - `debitUserId: null`
  - `creditUserId: userId`
- The audit event uses `actionType = 'WALLET_DEPOSIT'`.

## Response Shape
```json
{
  "available": "1000",
  "locked": "0"
}
```

## Design Notes
- Deposits are intentionally centralized under admin authority.
- `reference` is caller-supplied so external payment references can be preserved.
- Because `LedgerEntry` has a unique `(reference, type)` constraint, callers should not reuse the same reference for the same business type unless idempotency is desired.
