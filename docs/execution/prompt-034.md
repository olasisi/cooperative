# Prompt 034: Loan Disbursement

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Loan disbursement is an admin-only operation. It verifies the loan exists, has not already been disbursed, and has sufficient active surety before crediting the borrower wallet and recording ledger and audit entries.

## Route Guard
```js
router.post('/:id/disburse', authenticate, ensureRole('ADMIN'), async (req, res, next) => {
  const loan = await disburseLoan({ initiatorId: req.user.id, loanId: req.params.id });
  res.json(loan);
});
```

## Surety Check
```js
const sumRes = await prisma.surety.aggregate({ where: { loanId, releasedAt: null }, _sum: { amount: true } });
const pledged = sumRes._sum.amount ? Number(sumRes._sum.amount) : 0;
const required = Number(loan.amount);
if (pledged < required) throw Object.assign(new Error('Insufficient surety pledged for disbursement'), { status: 400 });
```

## Transactional Disbursement
```js
await prisma.$transaction(async (tx) => {
  const creditRows = await tx.$queryRaw`
    UPDATE "Wallet" SET "available" = "available" + ${loan.amount}
    WHERE "userId" = ${loan.borrowerId}
    RETURNING *;
  `;
  if (creditRows.length === 0) throw Object.assign(new Error('Borrower wallet not found'), { status: 404 });
  const borrowerWallet = creditRows[0];

  await tx.ledgerEntry.create({ data: {
    reference: loanId,
    type: 'LOAN_DISBURSE',
    amount: String(loan.amount),
    currency: 'NGN',
    debitUserId: null,
    creditUserId: loan.borrowerId,
    beforeBalance: String(Number(borrowerWallet.available) - Number(loan.amount)),
    afterBalance: String(borrowerWallet.available),
  }});

  await tx.loan.update({ where: { id: loanId }, data: { disbursedAt: new Date(), outstanding: String(loan.amount) } });
  await tx.auditLog.create({ data: { actionType: 'LOAN_DISBURSED', initiatorId, details: { loanId, borrowerId: loan.borrowerId, amount: loan.amount } } });
});
```

## Business Rules
- caller must be admin/super-admin
- loan must exist
- loan must not already be disbursed
- total unreleased surety must be at least the loan amount
- borrower wallet must exist

## Side Effects
- borrower `available` balance increases
- ledger row `LOAN_DISBURSE` is created
- audit row `LOAN_DISBURSED` is created
- `disbursedAt` is set
