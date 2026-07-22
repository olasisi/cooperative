const loans = require('../src/modules/loans');
const surety = require('../src/modules/surety');
const wallet = require('../src/modules/wallet');
const prisma = require('../src/lib/prisma');

let proposer, borrower, pledger, admin;

beforeAll(async () => {
  proposer = await prisma.user.create({ data: { email: `loan-proposer+${Date.now()}@example.com`, fullName: 'Proposer', password: 'pass', role: 'MEMBER' } });
  borrower = await prisma.user.create({ data: { email: `borrower+${Date.now()}@example.com`, fullName: 'Borrower', password: 'pass', role: 'MEMBER' } });
  pledger = await prisma.user.create({ data: { email: `pledger+${Date.now()}@example.com`, fullName: 'Pledger', password: 'pass', role: 'MEMBER' } });
  admin = await prisma.user.create({ data: { email: `loan-admin+${Date.now()}@example.com`, fullName: 'Admin', password: 'pass', role: 'ADMIN' } });

  // ensure wallets
  await prisma.wallet.upsert({ where: { userId: pledger.id }, update: {}, create: { userId: pledger.id, available: '0', locked: '0' } });
  await prisma.wallet.upsert({ where: { userId: borrower.id }, update: {}, create: { userId: borrower.id, available: '0', locked: '0' } });

  // seed pledger with funds
  await wallet.deposit({ initiatorId: admin.id, userId: pledger.id, amount: '10000', reference: 'seed-pledger' });
  // seed borrower with some funds for partial repay tests
  await wallet.deposit({ initiatorId: admin.id, userId: borrower.id, amount: '500', reference: 'seed-borrower' });
});

afterAll(async () => {
  try {
    await prisma.surety.deleteMany({ where: { userId: pledger.id } });
    await prisma.loan.deleteMany({ where: { borrowerId: borrower.id } });
    await prisma.ledgerEntry.deleteMany({ where: { OR: [{ debitUserId: { in: [pledger.id, borrower.id] } }, { creditUserId: { in: [pledger.id, borrower.id] } }] } });
    await prisma.wallet.deleteMany({ where: { userId: { in: [pledger.id, borrower.id] } } });
    await prisma.auditLog.deleteMany({ where: { initiatorId: { in: [proposer.id, admin.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [proposer.id, borrower.id, pledger.id, admin.id] } } });
  } catch (err) {
    console.error('cleanup error', err);
  } finally {
    await prisma.$disconnect();
  }
});

test('create loan, pledge surety, disburse and repay lifecycle', async () => {
  // create loan for 2000
  const loan = await loans.createLoan({ proposerId: proposer.id, borrowerId: borrower.id, amount: '2000' });
  expect(loan).toHaveProperty('id');

  // attempt disburse should fail (no surety)
  await expect(loans.disburseLoan({ initiatorId: admin.id, loanId: loan.id })).rejects.toThrow(/Insufficient surety/);

  // pledge surety from pledger (10000 available seeded earlier)
  const s = await surety.pledgeSurety({ initiatorId: pledger.id, loanId: loan.id, userId: pledger.id, amount: '2000' });
  expect(s).toHaveProperty('id');

  // disburse should succeed now
  const disbursed = await loans.disburseLoan({ initiatorId: admin.id, loanId: loan.id });
  expect(disbursed.disbursedAt).toBeTruthy();

  // borrower balance should increase by 2000
  const bal = await wallet.getBalance(borrower.id);
  expect(Number(bal.available)).toBeGreaterThanOrEqual(2000);

  // repay partially 500
  const afterPartial = await loans.repayLoan({ initiatorId: borrower.id, loanId: loan.id, amount: '500' });
  expect(Number(afterPartial.outstanding)).toBeGreaterThan(0);

  // repay remaining amount
  const remaining = Number(afterPartial.outstanding);
  // ensure borrower has enough for the remaining (deposit if necessary)
  const borrowerBal = await wallet.getBalance(borrower.id);
  if (Number(borrowerBal.available) < remaining) {
    await wallet.deposit({ initiatorId: admin.id, userId: borrower.id, amount: String(remaining), reference: 'seed-for-repay' });
  }

  const afterFull = await loans.repayLoan({ initiatorId: borrower.id, loanId: loan.id, amount: String(remaining) });
  expect(afterFull.repaidAt).toBeTruthy();

  // surety should be released
  const released = await prisma.surety.findUnique({ where: { id: s.id } });
  expect(released.releasedAt).toBeTruthy();
});

test('disburse fails if pledged surety is insufficient', async () => {
  const loan = await loans.createLoan({ proposerId: proposer.id, borrowerId: borrower.id, amount: '50000' });
  // no surety pledged for this large loan
  await expect(loans.disburseLoan({ initiatorId: admin.id, loanId: loan.id })).rejects.toThrow(/Insufficient surety/);
});

test('repay fails if borrower has insufficient funds', async () => {
  const loan = await loans.createLoan({ proposerId: proposer.id, borrowerId: borrower.id, amount: '1000' });
  // pledge surety so disburse can happen
  await surety.pledgeSurety({ initiatorId: pledger.id, loanId: loan.id, userId: pledger.id, amount: '1000' });
  await loans.disburseLoan({ initiatorId: admin.id, loanId: loan.id });

  // empty borrower wallet
  const bal = await wallet.getBalance(borrower.id);
  // withdraw available if any (test setup)
  if (Number(bal.available) > 0) {
    // not exposing withdraw in tests; emulate by direct prisma update for cleanup
    await prisma.wallet.update({ where: { userId: borrower.id }, data: { available: '0' } });
  }

  await expect(loans.repayLoan({ initiatorId: borrower.id, loanId: loan.id, amount: '500' })).rejects.toThrow(/Insufficient funds/);
});
