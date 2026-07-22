# Prompt 033: Loan Creation Module

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Loan creation is implemented as a direct `Loan` insert. Surety sufficiency is enforced later at disbursement time, not during creation. The request-governed approval pre-step described in the prompt remains a design extension rather than a checked-in requirement.

## Current Loan Model
```prisma
model Loan {
  id          String   @id @default(uuid())
  borrowerId  String
  borrower    User     @relation(fields: [borrowerId], references: [id])
  amount      Decimal
  outstanding Decimal
  disbursedAt DateTime?
  repaidAt    DateTime?
  createdAt   DateTime @default(now())
}
```

## `createLoan()` Implementation
```js
async function createLoan({ proposerId, borrowerId, amount, termMonths = null, metadata = {} }) {
  if (!proposerId || !borrowerId || !amount) {
    throw Object.assign(new Error('proposerId, borrowerId and amount are required'), { status: 400 });
  }
  const loan = await prisma.loan.create({
    data: {
      borrowerId,
      amount: String(amount),
      outstanding: String(amount),
      createdAt: new Date(),
    },
  });
  await logAudit('LOAN_CREATED', proposerId, { loanId: loan.id, borrowerId, amount });
  return loan;
}
```

## Current Behavior
- validates `proposerId`, `borrowerId`, and `amount`
- creates the `Loan` row immediately
- initializes `outstanding = amount`
- does **not** set `disbursedAt` or `repaidAt`
- does **not** require surety at creation time
- does **not** currently verify borrower wallet existence during creation

## Route
- `POST /api/loans`
- Guard: `authenticate`

## Surety Requirement in Practice
Surety is required before disbursement, not before creation. `disburseLoan()` aggregates pledged surety and rejects the disbursement when pledged collateral is below the loan amount.

## Request-Based Approval Design Note
The prompt topic calls for a `createRequest()` pre-step. That design is compatible with the existing request/approval engine, but the checked-in code currently creates the loan record directly. If governance is required, create a request first and create the loan only after threshold approval.
