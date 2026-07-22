const wallet = require('../src/modules/wallet');
const prisma = require('../src/lib/prisma');

let testUser = null;

beforeAll(async () => {
  // create a test user and ensure wallet exists
  testUser = await prisma.user.create({
    data: {
      email: `test-wallet+${Date.now()}@example.com`,
      fullName: 'Test Wallet User',
      password: 'testpass',
      role: 'MEMBER',
      membershipStart: new Date(),
    },
  });
  await prisma.wallet.upsert({
    where: { userId: testUser.id },
    update: {},
    create: { userId: testUser.id, available: '0', locked: '0' },
  });
});

afterAll(async () => {
  // cleanup: remove ledger entries, wallet, user
  try {
    await prisma.ledgerEntry.deleteMany({ where: { OR: [{ debitUserId: testUser.id }, { creditUserId: testUser.id }] } });
    await prisma.wallet.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.deleteMany({ where: { id: testUser.id } });
  } catch (err) {
    console.error('cleanup error', err);
  } finally {
    await prisma.$disconnect();
  }
});

test('deposit increases available balance', async () => {
  const before = await wallet.getBalance(testUser.id);
  expect(before.available).toBe('0');

  const res = await wallet.deposit({ initiatorId: testUser.id, userId: testUser.id, amount: '1000', reference: 'test-deposit' });
  expect(res.available).toBeDefined();
  expect(Number(res.available)).toBeGreaterThanOrEqual(1000);

  const after = await wallet.getBalance(testUser.id);
  expect(Number(after.available)).toBe(Number(res.available));
});

test('withdraw reduces available balance and fails on insufficient funds', async () => {
  // ensure there is 1000 available
  await wallet.deposit({ initiatorId: testUser.id, userId: testUser.id, amount: '1000', reference: 'test-deposit-2' });
  const before = await wallet.getBalance(testUser.id);
  const availableBefore = Number(before.available);
  const withdrawAmount = 500;
  const res = await wallet.withdraw({ initiatorId: testUser.id, userId: testUser.id, amount: String(withdrawAmount), reference: 'test-withdraw' });
  expect(Number(res.available)).toBe(availableBefore - withdrawAmount);

  // attempt to withdraw more than available
  const large = String(availableBefore + 1000000);
  await expect(wallet.withdraw({ initiatorId: testUser.id, userId: testUser.id, amount: large })).rejects.toThrow();
});

test('lock funds moves available to locked and prevents withdrawal of locked funds', async () => {
  // deposit a known amount
  await wallet.deposit({ initiatorId: testUser.id, userId: testUser.id, amount: '1000', reference: 'test-deposit-3' });
  const before = await wallet.getBalance(testUser.id);
  const avail = Number(before.available);
  const lockAmt = 700;
  const locked = await wallet.lockFunds({ initiatorId: testUser.id, userId: testUser.id, amount: String(lockAmt), reference: 'test-lock' });
  expect(Number(locked.locked)).toBeGreaterThanOrEqual(lockAmt);
  expect(Number(locked.available)).toBe(avail - lockAmt);

  // now try to withdraw more than available (should fail)
  const toWithdraw = String(avail); // trying to withdraw original avail should fail because some locked
  await expect(wallet.withdraw({ initiatorId: testUser.id, userId: testUser.id, amount: toWithdraw })).rejects.toThrow();

  // unlock some and then withdraw should succeed
  await wallet.unlockFunds({ initiatorId: testUser.id, userId: testUser.id, amount: String(lockAmt), reference: 'test-unlock' });
  const afterUnlock = await wallet.getBalance(testUser.id);
  expect(Number(afterUnlock.locked)).toBeLessThanOrEqual(0);
});

test('concurrent withdraws cannot double-spend', async () => {
  // Reset wallet to exactly 1000 available so that two concurrent withdrawals
  // of 800 each cannot both succeed (only one can, since 1000 < 1600).
  await prisma.wallet.update({ where: { userId: testUser.id }, data: { available: '1000', locked: '0' } });

  const withdrawAmount = '800';
  const attempts = [
    wallet.withdraw({ initiatorId: testUser.id, userId: testUser.id, amount: withdrawAmount, reference: 'concurrent-1' }),
    wallet.withdraw({ initiatorId: testUser.id, userId: testUser.id, amount: withdrawAmount, reference: 'concurrent-2' }),
  ];

  const results = await Promise.allSettled(attempts);
  const fulfilled = results.filter(r => r.status === 'fulfilled');
  const rejected = results.filter(r => r.status === 'rejected');

  // only one should succeed because 1000 < 800 + 800
  expect(fulfilled.length).toBe(1);
  expect(rejected.length).toBe(1);
});
