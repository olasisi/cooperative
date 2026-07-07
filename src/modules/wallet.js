// src/modules/wallet.js
const prisma = require('../lib/prisma');

// helper to create a paired ledger entry (debit and credit)
async function createLedgerPair({ reference, type, amount, currency = 'NGN', debitUserId = null, creditUserId = null }) {
  // amount should be a string or number
  const beforeDebit = debitUserId ? await prisma.wallet.findUnique({ where: { userId: debitUserId } }) : null;
  const beforeCredit = creditUserId ? await prisma.wallet.findUnique({ where: { userId: creditUserId } }) : null;

  const entries = [];
  if (debitUserId) {
    entries.push({
      reference,
      type,
      amount: String(amount),
      currency,
      debitUserId,
      creditUserId,
      beforeBalance: beforeDebit ? String(beforeDebit.available) : '0',
      afterBalance: beforeDebit ? String(beforeDebit.available) : '0',
    });
  }
  if (creditUserId) {
    entries.push({
      reference,
      type,
      amount: String(amount),
      currency,
      debitUserId,
      creditUserId,
      beforeBalance: beforeCredit ? String(beforeCredit.available) : '0',
      afterBalance: beforeCredit ? String(beforeCredit.available) : '0',
    });
  }
  // create entries
  return prisma.ledgerEntry.createMany({ data: entries });
}

async function getBalance(userId) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw Object.assign(new Error('Wallet not found'), { status: 404 });
  return { available: wallet.available.toString(), locked: wallet.locked.toString() };
}

async function deposit({ userId, amount, reference = 'deposit', type = 'DEPOSIT' }) {
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
  return { available: updated.available.toString(), locked: updated.locked.toString() };
}

async function withdraw({ userId, amount, reference = 'withdraw', type = 'WITHDRAW' }) {
  // atomic decrement if available >= amount using raw SQL for returning
  const rows = await prisma.$queryRaw`
    UPDATE "Wallet" SET "available" = "available" - ${String(amount)}
    WHERE "userId" = ${userId} AND "available" >= ${String(amount)}
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
      beforeBalance: String(Number(updated.available) + Number(amount)),
      afterBalance: String(updated.available),
    },
  });
  return { available: String(updated.available), locked: String(updated.locked) };
}

async function lockFunds({ userId, amount, reference = 'lock', type = 'LOCK' }) {
  // move available -> locked atomically
  const rows = await prisma.$queryRaw`
    UPDATE "Wallet" SET "available" = "available" - ${String(amount)}, "locked" = "locked" + ${String(amount)}
    WHERE "userId" = ${userId} AND "available" >= ${String(amount)}
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
      beforeBalance: String(Number(updated.available) + Number(amount)),
      afterBalance: String(updated.available),
    },
  });
  return { available: String(updated.available), locked: String(updated.locked) };
}

async function unlockFunds({ userId, amount, reference = 'unlock', type = 'UNLOCK' }) {
  // move locked -> available atomically
  const rows = await prisma.$queryRaw`
    UPDATE "Wallet" SET "locked" = "locked" - ${String(amount)}, "available" = "available" + ${String(amount)}
    WHERE "userId" = ${userId} AND "locked" >= ${String(amount)}
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
  return { available: String(updated.available), locked: String(updated.locked) };
}

module.exports = { getBalance, deposit, withdraw, lockFunds, unlockFunds, createLedgerPair };
