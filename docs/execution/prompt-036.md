# Prompt 036: Surety Pledge Module

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Surety pledge is implemented as a wallet lock plus a `Surety` record and ledger/audit entries. The current checked-in route allows any authenticated caller; admin-only authority is a policy hardening step rather than current behavior.

## `pledgeSurety()` Implementation
```js
async function pledgeSurety({ initiatorId = null, loanId, userId, amount, reference = 'SURETY_PLEDGE' }) {
  if (!loanId || !userId || !amount) throw Object.assign(new Error('loanId, userId and amount required'), { status: 400 });

  const rows = await prisma.$queryRaw`
    UPDATE "Wallet" SET "available" = "available" - ${String(amount)}, "locked" = "locked" + ${String(amount)}
    WHERE "userId" = ${userId} AND "available" >= ${String(amount)}
    RETURNING *;
  `;
  if (rows.length === 0) throw Object.assign(new Error('Insufficient available balance to pledge surety'), { status: 400 });
  const updated = rows[0];

  const surety = await prisma.surety.create({ data: { loanId, userId, amount: String(amount) } });

  await prisma.ledgerEntry.create({
    data: {
      reference,
      type: 'SURETY_PLEDGE',
      amount: String(amount),
      currency: 'NGN',
      debitUserId: userId,
      creditUserId: null,
      beforeBalance: String(Number(updated.available) + Number(amount)),
      afterBalance: String(updated.available),
    },
  });

  await logAudit('SURETY_PLEDGED', initiatorId, { loanId, suretyId: surety.id, userId, amount: String(amount) });
  return surety;
}
```

## Current Route Surface
```js
router.post('/pledge', authenticate, async (req, res, next) => {
  const { loanId, userId, amount } = req.body;
  const result = await pledgeSurety({ initiatorId: req.user.id, loanId, userId, amount });
  res.status(201).json(result);
});
```

## What the Function Guarantees
- input validation on `loanId`, `userId`, `amount`
- atomic move from `available` to `locked`
- failure on insufficient available balance
- creation of the `Surety` row
- `SURETY_PLEDGE` ledger entry
- `SURETY_PLEDGED` audit entry

## Edge Cases and Current Gaps
- no explicit loan existence check before creating the surety row
- no admin-only guard on the pledge route today
- caller can supply any `userId`; if stricter policy is desired, enforce either:
  - self-only pledge: `userId === req.user.id`, or
  - admin-only delegated pledge: `ensureRole('ADMIN')`
- repeated pledges are allowed and aggregate at disbursement time

## Release Pair
Release is admin-only and reverses the lock:
- route: `POST /api/surety/release`
- guard: `ensureRole('ADMIN')`
- ledger type: `SURETY_RELEASE`
- audit type: `SURETY_RELEASED`
