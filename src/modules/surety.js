const prisma = require('../lib/prisma');
const { logAudit } = require('./audit');

async function pledgeSurety({ initiatorId = null, loanId, userId, amount }) {
  if (!loanId || !userId || !amount) throw Object.assign(new Error('loanId, userId and amount required'), { status: 400 });

  // verify loan exists and has not been disbursed yet
  const loan = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!loan) throw Object.assign(new Error('Loan not found'), { status: 404 });
  if (loan.disbursedAt) throw Object.assign(new Error('Cannot pledge surety for an already-disbursed loan'), { status: 400 });

  // move available -> locked atomically
  const rows = await prisma.$queryRaw`
    UPDATE "Wallet" SET "available" = "available" - ${Number(amount)}::numeric, "locked" = "locked" + ${Number(amount)}::numeric
    WHERE "userId" = ${userId} AND "available" >= ${Number(amount)}::numeric
    RETURNING *;
  `;
  if (rows.length === 0) throw Object.assign(new Error('Insufficient available balance to pledge surety'), { status: 400 });
  const updated = rows[0];

  // create surety record
  const surety = await prisma.surety.create({ data: { loanId, userId, amount: String(amount) } });

  // ledger entry for lock – use surety id as reference for uniqueness
  await prisma.ledgerEntry.create({
    data: {
      reference: `surety-pledge-${surety.id}`,
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

async function releaseSurety({ initiatorId = null, suretyId, amount = null }) {
  const s = await prisma.surety.findUnique({ where: { id: suretyId } });
  if (!s) throw Object.assign(new Error('Surety not found'), { status: 404 });
  if (s.releasedAt) throw Object.assign(new Error('Surety already released'), { status: 400 });

  const releaseAmount = amount ? String(amount) : String(s.amount);
  // move locked -> available atomically
  const rows = await prisma.$queryRaw`
    UPDATE "Wallet" SET "locked" = "locked" - ${Number(releaseAmount)}::numeric, "available" = "available" + ${Number(releaseAmount)}::numeric
    WHERE "userId" = ${s.userId} AND "locked" >= ${Number(releaseAmount)}::numeric
    RETURNING *;
  `;
  if (rows.length === 0) throw Object.assign(new Error('Insufficient locked balance to release'), { status: 400 });
  const updated = rows[0];

  // update surety
  await prisma.surety.update({ where: { id: suretyId }, data: { releasedAt: new Date() } });

  // ledger entry for release – use surety id as reference for uniqueness
  await prisma.ledgerEntry.create({
    data: {
      reference: `surety-release-${suretyId}`,
      type: 'SURETY_RELEASE',
      amount: releaseAmount,
      currency: 'NGN',
      debitUserId: null,
      creditUserId: s.userId,
      beforeBalance: String(Number(updated.available) - Number(releaseAmount)),
      afterBalance: String(updated.available),
    },
  });

  await logAudit('SURETY_RELEASED', initiatorId, { suretyId, userId: s.userId, amount: releaseAmount });
  return { suretyId, userId: s.userId, amount: releaseAmount };
}

module.exports = { pledgeSurety, releaseSurety };
