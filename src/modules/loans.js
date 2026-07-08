const prisma = require('../lib/prisma');
const { logAudit } = require('./audit');

// Create a loan record
async function createLoan({ proposerId, borrowerId, amount, termMonths = null, metadata = {} }) {
  if (!proposerId || !borrowerId || !amount) throw Object.assign(new Error('proposerId, borrowerId and amount are required'), { status: 400 });
  const loan = await prisma.loan.create({
    data: {
      borrowerId,
      amount: String(amount),
      outstanding: String(amount),
      createdAt: new Date(),
      // store metadata as JSON if provided
      // prisma model has no metadata field on Loan; use JSON in "Surety" or Request if needed
    },
  });
  await logAudit('LOAN_CREATED', proposerId, { loanId: loan.id, borrowerId, amount });
  return loan;
}

// Disburse: ensure sufficient surety has been pledged (total pledged >= loan.amount)
async function disburseLoan({ initiatorId = null, loanId }) {
  const loan = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!loan) throw Object.assign(new Error('Loan not found'), { status: 404 });
  if (loan.disbursedAt) throw Object.assign(new Error('Loan already disbursed'), { status: 400 });

  // sum sureties pledged for this loan that are not released
  const sumRes = await prisma.surety.aggregate({ where: { loanId, releasedAt: null }, _sum: { amount: true } });
  const pledged = sumRes._sum.amount ? Number(sumRes._sum.amount) : 0;
  const required = Number(loan.amount);
  if (pledged < required) throw Object.assign(new Error('Insufficient surety pledged for disbursement'), { status: 400 });

  // perform disbursement transactionally: credit borrower wallet and create ledger entry; update loan.disbursedAt & outstanding
  await prisma.$transaction(async (tx) => {
    // credit borrower
    const creditRows = await tx.$queryRaw`
      UPDATE "Wallet" SET "available" = "available" + ${loan.amount}
      WHERE "userId" = ${loan.borrowerId}
      RETURNING *;
    `;
    if (creditRows.length === 0) throw Object.assign(new Error('Borrower wallet not found'), { status: 404 });
    const borrowerWallet = creditRows[0];

    // create ledger entry
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

    // update loan
    await tx.loan.update({ where: { id: loanId }, data: { disbursedAt: new Date(), outstanding: String(loan.amount) } });

    await tx.auditLog.create({ data: { actionType: 'LOAN_DISBURSED', initiatorId: initiatorId, details: { loanId, borrowerId: loan.borrowerId, amount: loan.amount } } });
  });

  return await prisma.loan.findUnique({ where: { id: loanId } });
}

// Repay: borrower repays amount; if fully repaid, release sureties
async function repayLoan({ initiatorId = null, loanId, amount }) {
  if (!amount) throw Object.assign(new Error('amount required'), { status: 400 });
  const loan = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!loan) throw Object.assign(new Error('Loan not found'), { status: 404 });
  if (!loan.disbursedAt) throw Object.assign(new Error('Loan not disbursed'), { status: 400 });

  const repayAmt = String(amount);

  await prisma.$transaction(async (tx) => {
    // withdraw from borrower
    const debitRows = await tx.$queryRaw`
      UPDATE "Wallet" SET "available" = "available" - ${repayAmt}
      WHERE "userId" = ${loan.borrowerId} AND "available" >= ${repayAmt}
      RETURNING *;
    `;
    if (debitRows.length === 0) throw Object.assign(new Error('Insufficient funds for repayment'), { status: 400 });
    const borrowerWallet = debitRows[0];

    // create ledger entry for repayment
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

    // reduce outstanding
    const newOutstanding = Number(loan.outstanding) - Number(repayAmt);
    const updateData = { outstanding: String(Math.max(0, newOutstanding)) };
    if (newOutstanding <= 0) updateData.repaidAt = new Date();
    await tx.loan.update({ where: { id: loanId }, data: updateData });

    await tx.auditLog.create({ data: { actionType: 'LOAN_REPAY', initiatorId, details: { loanId, amount: repayAmt } } });

    // if fully repaid, release all sureties for this loan
    if (newOutstanding <= 0) {
      const sureties = await tx.surety.findMany({ where: { loanId, releasedAt: null } });
      for (const s of sureties) {
        // move locked -> available
        const rows = await tx.$queryRaw`
          UPDATE "Wallet" SET "locked" = "locked" - ${String(s.amount)}, "available" = "available" + ${String(s.amount)}
          WHERE "userId" = ${s.userId} AND "locked" >= ${String(s.amount)}
          RETURNING *;
        `;
        if (rows.length === 0) {
          // log issue but continue
          await tx.auditLog.create({ data: { actionType: 'SURETY_RELEASE_FAILED', initiatorId, details: { suretyId: s.id, userId: s.userId, amount: String(s.amount) } } });
          continue;
        }
        const updated = rows[0];
        await tx.ledgerEntry.create({ data: {
          reference: loanId,
          type: 'SURETY_RELEASE',
          amount: String(s.amount),
          currency: 'NGN',
          debitUserId: null,
          creditUserId: s.userId,
          beforeBalance: String(Number(updated.available) - Number(s.amount)),
          afterBalance: String(updated.available),
        }});
        await tx.surety.update({ where: { id: s.id }, data: { releasedAt: new Date() } });
        await tx.auditLog.create({ data: { actionType: 'SURETY_RELEASED', initiatorId, details: { suretyId: s.id, loanId, userId: s.userId, amount: String(s.amount) } } });
      }
    }
  });

  return await prisma.loan.findUnique({ where: { id: loanId } });
}

async function getLoan(id) {
  return prisma.loan.findUnique({ where: { id } });
}

async function listLoans({ where = {}, take = 50 }) {
  return prisma.loan.findMany({ where, take, orderBy: { createdAt: 'desc' } });
}

module.exports = { createLoan, disburseLoan, repayLoan, getLoan, listLoans };
