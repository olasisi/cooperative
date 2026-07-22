const prisma = require('../src/lib/prisma');
const loans = require('../src/modules/loans');
const wallet = require('../src/modules/wallet');
const surety = require('../src/modules/surety');

let tenant1, tenant2;
let adminA, memberA1, memberA2;
let adminB, memberB1;

beforeAll(async () => {
  // create two tenants
  tenant1 = await prisma.tenant.create({ data: { name: 'Cooperative A', slug: `coop-a-${Date.now()}` } });
  tenant2 = await prisma.tenant.create({ data: { name: 'Cooperative B', slug: `coop-b-${Date.now()}` } });

  // create users for tenant 1
  adminA = await prisma.user.create({ data: { email: `admin-a+${Date.now()}@example.com`, fullName: 'Admin A', password: 'pass', role: 'ADMIN', tenantId: tenant1.id } });
  memberA1 = await prisma.user.create({ data: { email: `member-a1+${Date.now()}@example.com`, fullName: 'Member A1', password: 'pass', role: 'MEMBER', tenantId: tenant1.id } });
  memberA2 = await prisma.user.create({ data: { email: `member-a2+${Date.now()}@example.com`, fullName: 'Member A2', password: 'pass', role: 'MEMBER', tenantId: tenant1.id } });

  // create users for tenant 2
  adminB = await prisma.user.create({ data: { email: `admin-b+${Date.now()}@example.com`, fullName: 'Admin B', password: 'pass', role: 'ADMIN', tenantId: tenant2.id } });
  memberB1 = await prisma.user.create({ data: { email: `member-b1+${Date.now()}@example.com`, fullName: 'Member B1', password: 'pass', role: 'MEMBER', tenantId: tenant2.id } });

  // create wallets
  for (const u of [adminA, memberA1, memberA2, adminB, memberB1]) {
    await prisma.wallet.upsert({ where: { userId: u.id }, update: {}, create: { userId: u.id, available: '0', locked: '0' } });
  }

  // seed funds
  await wallet.deposit({ initiatorId: adminA.id, userId: memberA1.id, amount: '5000', reference: `seed-tenant-a1-${Date.now()}` });
  await wallet.deposit({ initiatorId: adminB.id, userId: memberB1.id, amount: '5000', reference: `seed-tenant-b1-${Date.now()}` });
});

afterAll(async () => {
  try {
    const userIds = [adminA.id, memberA1.id, memberA2.id, adminB.id, memberB1.id];
    await prisma.surety.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.loan.deleteMany({ where: { borrowerId: { in: userIds } } });
    await prisma.request.deleteMany({ where: { proposerId: { in: userIds } } });
    await prisma.ledgerEntry.deleteMany({ where: { OR: [{ debitUserId: { in: userIds } }, { creditUserId: { in: userIds } }] } });
    await prisma.wallet.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.auditLog.deleteMany({ where: { initiatorId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenant1.id, tenant2.id] } } });
  } catch (err) {
    console.error('cleanup error', err);
  } finally {
    await prisma.$disconnect();
  }
});

test('tenant model: users carry tenantId', async () => {
  const fetched = await prisma.user.findUnique({ where: { id: memberA1.id } });
  expect(fetched.tenantId).toBe(tenant1.id);

  const fetchedB = await prisma.user.findUnique({ where: { id: memberB1.id } });
  expect(fetchedB.tenantId).toBe(tenant2.id);
});

test('tenant model: tenantId query scopes users to one tenant', async () => {
  const tenantAUsers = await prisma.user.findMany({ where: { tenantId: tenant1.id } });
  const tenantBUsers = await prisma.user.findMany({ where: { tenantId: tenant2.id } });

  const tenantAIds = tenantAUsers.map(u => u.id);
  const tenantBIds = tenantBUsers.map(u => u.id);

  // tenant A users should not appear in tenant B query and vice-versa
  expect(tenantAIds).toContain(memberA1.id);
  expect(tenantAIds).not.toContain(memberB1.id);
  expect(tenantBIds).toContain(memberB1.id);
  expect(tenantBIds).not.toContain(memberA1.id);
});

test('loan: self-loan prevention (proposer cannot be borrower)', async () => {
  await expect(
    loans.createLoan({ proposerId: memberA1.id, borrowerId: memberA1.id, amount: '1000' })
  ).rejects.toThrow(/Proposer cannot be the borrower/);
});

test('loan: proposerId is stored on loan', async () => {
  const loan = await loans.createLoan({ proposerId: adminA.id, borrowerId: memberA2.id, amount: '500' });
  expect(loan.proposerId).toBe(adminA.id);
  // cleanup
  await prisma.loan.delete({ where: { id: loan.id } });
});

test('surety: cannot pledge for already-disbursed loan', async () => {
  // create and disburse a loan
  const loan = await loans.createLoan({ proposerId: adminA.id, borrowerId: memberA2.id, amount: '300' });
  await wallet.deposit({ initiatorId: adminA.id, userId: memberA2.id, amount: '0', reference: `seed-${Date.now()}` }); // ensure wallet
  // pledge enough surety
  await surety.pledgeSurety({ initiatorId: memberA1.id, loanId: loan.id, userId: memberA1.id, amount: '300' });
  await loans.disburseLoan({ initiatorId: adminA.id, loanId: loan.id });

  // try to pledge more surety after disbursement
  await expect(
    surety.pledgeSurety({ initiatorId: memberA1.id, loanId: loan.id, userId: memberA1.id, amount: '100' })
  ).rejects.toThrow(/already-disbursed/);

  // cleanup: repay and release
  await wallet.deposit({ initiatorId: adminA.id, userId: memberA2.id, amount: '300', reference: `repay-seed-${Date.now()}` });
  await loans.repayLoan({ initiatorId: memberA2.id, loanId: loan.id, amount: '300' });
});

test('loan status transitions: PENDING -> ACTIVE -> REPAID', async () => {
  const loan = await loans.createLoan({ proposerId: adminA.id, borrowerId: memberA2.id, amount: '200' });
  expect(loan.status).toBe('PENDING');

  await surety.pledgeSurety({ initiatorId: memberA1.id, loanId: loan.id, userId: memberA1.id, amount: '200' });
  const disbursed = await loans.disburseLoan({ initiatorId: adminA.id, loanId: loan.id });
  expect(disbursed.status).toBe('ACTIVE');

  await wallet.deposit({ initiatorId: adminA.id, userId: memberA2.id, amount: '200', reference: `repay-seed2-${Date.now()}` });
  const repaid = await loans.repayLoan({ initiatorId: memberA2.id, loanId: loan.id, amount: '200' });
  expect(repaid.status).toBe('REPAID');
});
