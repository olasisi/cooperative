# Prompt 035: Loan Repayment

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Repayment debits the borrower wallet atomically, records a `LOAN_REPAY` ledger entry, reduces outstanding principal, marks the loan repaid when the remaining balance reaches zero, and releases sureties in the same transaction.

## `repayLoan()` Core Flow
```js
async function repayLoan({ initiatorId = null, loanId, amount }) {
  if (!amount) throw Object.assign(new Error('amount required'), { status: 400 });
  const loan = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!loan) throw Object.assign(new Error('Loan not found'), { status: 404 });
  if (!loan.disbursedAt) throw Object.assign(new Error('Loan not disbursed'), { status: 400 });

  const repayAmt = String(amount);
  await prisma.$transaction(async (tx) => {
    const debitRows = await tx.$queryRaw`
      UPDATE "Wallet" SET "available" = "available" - ${repayAmt}
      WHERE "userId" = ${loan.borrowerId} AND "available" >= ${repayAmt}
      RETURNING *;
    `;
    if (debitRows.length === 0) throw Object.assign(new Error('Insufficient funds for repayment'), { status: 400 });
    const borrowerWallet = debitRows[0];

    await tx.ledgerEntry.create({ data: {
      reference: loanId,
      type: 'LOAN_REPAY',
      amount: repayAmt,
      currency: 'NGN',
      debitUserId: loan.borrowerId,
      creditUserId: null,
      beforeBalance: String(Number(borrowerWallet.available) + Number(repayAmt)),
      afterBalance: String(borrowerWallet.available),
    }});

    const newOutstanding = Number(loan.outstanding) - Number(repayAmt);
    const updateData = { outstanding: String(Math.max(0, newOutstanding)) };
    if (newOutstanding <= 0) updateData.repaidAt = new Date();
    await tx.loan.update({ where: { id: loanId }, data: updateData });

    await tx.auditLog.create({ data: { actionType: 'LOAN_REPAY', initiatorId, details: { loanId, amount: repayAmt } } });

    if (newOutstanding <= 0) {
      // release sureties
    }
  });
}
```

## Full Repayment Behavior
When `newOutstanding <= 0`:
- `repaidAt` is set
- unreleased sureties for the loan are loaded
- each surety's locked balance is moved back to available
- each surety gets a `SURETY_RELEASE` ledger row
- each surety gets `releasedAt = new Date()`
- audit rows `SURETY_RELEASED` are created

## Important Notes
- wallet debit is atomic and fails safely on insufficient funds
- outstanding is reduced and clamped to zero
- current audit action type is `LOAN_REPAY` (not `LOAN_REPAID`)
- current implementation does **not** explicitly reject overpayment; it clamps outstanding to `0` if the caller repays more than the remaining amount

## Route
- `POST /api/loans/:id/repay`
- Guard: `authenticate`
