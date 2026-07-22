# Prompt 024: Withdrawal Operation

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Withdrawals use a conditional SQL update to atomically reduce available balance only when funds are sufficient, then persist a debit ledger entry and audit log.

## API Endpoint
- `POST /api/wallets/withdraw`
- Guard: `authenticate`
- Caller can only withdraw from `req.user.id`

```js
router.post('/withdraw', authenticate, async (req, res, next) => {
  const { amount, reference } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount required' });
  const result = await wallet.withdraw({ initiatorId: req.user.id, userId: req.user.id, amount, reference });
  res.json(result);
});
```

## `withdraw()` Implementation
```js
async function withdraw({ initiatorId = null, userId, amount, reference = 'withdraw', type = 'WITHDRAW' }) {
  const rows = await prisma.$queryRaw`
    UPDATE "Wallet" SET "available" = "available" - ${String(amount)}
    WHERE "userId" = ${userId} AND "available" >= ${String(amount)}
    RETURNING *;
  `;

  if (rows.length === 0) {
    throw Object.assign(new Error('Insufficient available balance'), { status: 400 });
  }
  const updated = rows[0];

  await prisma.ledgerEntry.create({
    data: {
      reference,
      type,
      amount: String(amount),
      currency: 'NGN',
      debitUserId: userId,
      creditUserId: null,
      beforeBalance: String(Number(updated.available) + Number(amount)),
      afterBalance: String(updated.available),
    },
  });

  await logAudit('WALLET_WITHDRAW', initiatorId, { userId, amount: String(amount), reference });
  return { available: String(updated.available), locked: String(updated.locked) };
}
```

## Why Raw SQL Is Used
The condition `available >= amount` must be checked in the same statement that decrements balance. That prevents a race where two concurrent withdrawals both read the same balance and overspend.

## Error Handling
If no row is returned, the function throws:
- message: `Insufficient available balance`
- status: `400`

## Ledger Pattern
Withdrawal is debit-only:
- `debitUserId = userId`
- `creditUserId = null`
- `type = 'WITHDRAW'` by default

## Verified Behavior
`tests/wallet.test.js` includes:
- successful withdrawal
- insufficient-balance rejection
- concurrent withdrawal protection
