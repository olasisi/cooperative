const prisma = require('../lib/prisma');
const { logAudit } = require('./audit');

// helper to create a paired ledger entry (debit and credit)
// beforeDebitBalance and beforeCreditBalance should be snapshots taken BEFORE the wallet mutation.
// If not provided, they fall back to the current wallet balance (which may already reflect the mutation).
async function createLedgerPair({
  reference,
  type,
  amount,
  currency = 'NGN',
  debitUserId = null,
  creditUserId = null,
  beforeDebitBalance = null,
  beforeCreditBalance = null,
}) {
  const amt = Number(amount);

  // read current wallet balances when before-snapshots are not supplied
  const beforeDebit = beforeDebitBalance !== null
    ? { available: beforeDebitBalance }
    : (debitUserId ? await prisma.wallet.findUnique({ where: { userId: debitUserId } }) : null);

  const beforeCredit = beforeCreditBalance !== null
    ? { available: beforeCreditBalance }
    : (creditUserId ? await prisma.wallet.findUnique({ where: { userId: creditUserId } }) : null);

  const entries = [];
  if (debitUserId && beforeDebit) {
    const before = Number(beforeDebit.available);
    entries.push({
      reference,
      type,
      amount: String(amount),
      currency,
      debitUserId,
      creditUserId,
      beforeBalance: String(before),
      afterBalance: String(before - amt),
    });
  }
  if (creditUserId && beforeCredit) {
    const before = Number(beforeCredit.available);
    entries.push({
      reference,
      type,
      amount: String(amount),
      currency,
      debitUserId,
      creditUserId,
      beforeBalance: String(before),
      afterBalance: String(before + amt),
    });
  }
  return prisma.ledgerEntry.createMany({ data: entries });
}

async function getBalance(userId) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw Object.assign(new Error('Wallet not found'), { status: 404 });
  return { available: wallet.available.toString(), locked: wallet.locked.toString() };
}

async function deposit({ initiatorId = null, userId, amount, reference = 'deposit', type = 'DEPOSIT' }) {
  // increment available atomically
  const updated = await prisma.wallet.update({
    where: { userId },
    data: { available: { increment: String(amount) } },
  });
  // create ledger entry pair (credit only)
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

  // audit
  await logAudit('WALLET_DEPOSIT', initiatorId, { userId, amount: String(amount), reference });

  return { available: updated.available.toString(), locked: updated.locked.toString() };
}

async function withdraw({ initiatorId = null, userId, amount, reference = 'withdraw', type = 'WITHDRAW' }) {
  const amt = Number(amount);
  // atomic decrement if available >= amount using raw SQL for returning
  const rows = await prisma.$queryRaw`
    UPDATE "Wallet" SET "available" = "available" - ${amt}::numeric
    WHERE "userId" = ${userId} AND "available" >= ${amt}::numeric
    RETURNING *;
  `;

  if (rows.length === 0) {
    throw Object.assign(new Error('Insufficient available balance'), { status: 400 });
  }
  const updated = rows[0];
  // create ledger entry
  await prisma.ledgerEntry.create({
    data: {
      reference,
      type,
      amount: String(amount),
      currency: 'NGN',
      debitUserId: userId,
      creditUserId: null,
      beforeBalance: String(Number(updated.available) + amt),
      afterBalance: String(updated.available),
    },
  });

  // audit
  await logAudit('WALLET_WITHDRAW', initiatorId, { userId, amount: String(amount), reference });

  return { available: String(updated.available), locked: String(updated.locked) };
}

async function lockFunds({ initiatorId = null, userId, amount, reference = 'lock', type = 'LOCK' }) {
  const amt = Number(amount);
  // move available -> locked atomically
  const rows = await prisma.$queryRaw`
    UPDATE "Wallet" SET "available" = "available" - ${amt}::numeric, "locked" = "locked" + ${amt}::numeric
    WHERE "userId" = ${userId} AND "available" >= ${amt}::numeric
    RETURNING *;
  `;
  if (rows.length === 0) {
    throw Object.assign(new Error('Insufficient available balance to lock'), { status: 400 });
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
      beforeBalance: String(Number(updated.available) + amt),
      afterBalance: String(updated.available),
    },
  });

  // audit
  await logAudit('WALLET_LOCK', initiatorId, { userId, amount: String(amount), reference });

  return { available: String(updated.available), locked: String(updated.locked) };
}

async function unlockFunds({ initiatorId = null, userId, amount, reference = 'unlock', type = 'UNLOCK' }) {
  const amt = Number(amount);
  // move locked -> available atomically
  const rows = await prisma.$queryRaw`
    UPDATE "Wallet" SET "locked" = "locked" - ${amt}::numeric, "available" = "available" + ${amt}::numeric
    WHERE "userId" = ${userId} AND "locked" >= ${amt}::numeric
    RETURNING *;
  `;
  if (rows.length === 0) {
    throw Object.assign(new Error('Insufficient locked balance to unlock'), { status: 400 });
  }
  const updated = rows[0];
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

  // audit
  await logAudit('WALLET_UNLOCK', initiatorId, { userId, amount: String(amount), reference });

  return { available: String(updated.available), locked: String(updated.locked) };
}

module.exports = { getBalance, deposit, withdraw, lockFunds, unlockFunds, createLedgerPair };
