const requests = require('../src/modules/requests');
const approvals = require('../src/modules/approvals');
const wallet = require('../src/modules/wallet');
const prisma = require('../src/lib/prisma');

let proposer, payer, recipient, admin1, admin2;

beforeAll(async () => {
  // create users
  proposer = await prisma.user.create({ data: { email: `req-proposer+${Date.now()}@example.com`, fullName: 'Proposer', password: 'pass', role: 'MEMBER' } });
  payer = await prisma.user.create({ data: { email: `payer+${Date.now()}@example.com`, fullName: 'Payer', password: 'pass', role: 'MEMBER' } });
  recipient = await prisma.user.create({ data: { email: `recipient+${Date.now()}@example.com`, fullName: 'Recipient', password: 'pass', role: 'MEMBER' } });
  admin1 = await prisma.user.create({ data: { email: `admin1+${Date.now()}@example.com`, fullName: 'Admin One', password: 'pass', role: 'ADMIN' } });
  admin2 = await prisma.user.create({ data: { email: `admin2+${Date.now()}@example.com`, fullName: 'Admin Two', password: 'pass', role: 'ADMIN' } });

  // ensure wallets exist
  await prisma.wallet.upsert({ where: { userId: payer.id }, update: {}, create: { userId: payer.id, available: '0', locked: '0' } });
  await prisma.wallet.upsert({ where: { userId: recipient.id }, update: {}, create: { userId: recipient.id, available: '0', locked: '0' } });

  // seed payer with funds
  await wallet.deposit({ initiatorId: admin1.id, userId: payer.id, amount: '2000', reference: 'seed-payer' });
});

afterAll(async () => {
  try {
    // cleanup approvals, requests, ledger entries, wallets, users, audit
    await prisma.approval.deleteMany({ where: { approverId: { in: [admin1.id, admin2.id, proposer.id] } } });
    await prisma.request.deleteMany({ where: { proposerId: proposer.id } });
    await prisma.ledgerEntry.deleteMany({ where: { OR: [{ debitUserId: { in: [payer.id, recipient.id] } }, { creditUserId: { in: [payer.id, recipient.id] } }] } });
    await prisma.wallet.deleteMany({ where: { userId: { in: [payer.id, recipient.id] } } });
    await prisma.auditLog.deleteMany({ where: { initiatorId: { in: [admin1.id, admin2.id, proposer.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [proposer.id, payer.id, recipient.id, admin1.id, admin2.id] } } });
  } catch (err) {
    console.error('cleanup error', err);
  } finally {
    await prisma.$disconnect();
  }
});

test('proposer cannot approve their own request', async () => {
  const r = await requests.createRequest({ proposerId: proposer.id, title: 'Own approval test', description: 'should fail' });
  await expect(approvals.approveRequest({ approverId: proposer.id, requestId: r.id })).rejects.toThrow(/Proposer cannot approve/);
});

test('approval threshold enforcement and successful execution', async () => {
  // create a request that transfers 1000 from payer -> recipient
  const meta = { action: 'transfer', fromUserId: payer.id, toUserId: recipient.id, amount: '1000' };
  const r = await requests.createRequest({ proposerId: proposer.id, title: 'Pay vendor', description: 'transfer test', amount: '1000', metadata: meta });

  // first approval should not execute yet
  const a1 = await approvals.approveRequest({ approverId: admin1.id, requestId: r.id, note: 'first' });
  const afterFirst = await prisma.request.findUnique({ where: { id: r.id } });
  expect(afterFirst.status).toBe('PENDING');

  // second approval should trigger execution
  const a2 = await approvals.approveRequest({ approverId: admin2.id, requestId: r.id, note: 'second' });

  // reload request
  const executed = await prisma.request.findUnique({ where: { id: r.id } });
  expect(executed.status).toBe('EXECUTED');

  // check wallets
  const payerBal = await wallet.getBalance(payer.id);
  const recipientBal = await wallet.getBalance(recipient.id);
  expect(Number(payerBal.available)).toBeLessThanOrEqual(1000); // started with 2000, debited 1000 => ~1000
  expect(Number(recipientBal.available)).toBeGreaterThanOrEqual(1000);

  // ledger entries for this request should exist
  const ledgers = await prisma.ledgerEntry.findMany({ where: { reference: r.id } });
  expect(ledgers.length).toBeGreaterThanOrEqual(2);
});

test('rejection flow sets request to REJECTED', async () => {
  const r = await requests.createRequest({ proposerId: proposer.id, title: 'Reject test', description: 'should be rejected' });
  const rej = await approvals.rejectRequest({ approverId: admin1.id, requestId: r.id, note: 'nope' });
  const updated = await prisma.request.findUnique({ where: { id: r.id } });
  expect(updated.status).toBe('REJECTED');
});

test('insufficient funds causes execution rollback', async () => {
  // create low-fund payer
  const lowPayer = await prisma.user.create({ data: { email: `lowpayer+${Date.now()}@example.com`, fullName: 'Low Payer', password: 'pass', role: 'MEMBER' } });
  await prisma.wallet.upsert({ where: { userId: lowPayer.id }, update: {}, create: { userId: lowPayer.id, available: '10', locked: '0' } });

  const meta = { action: 'transfer', fromUserId: lowPayer.id, toUserId: recipient.id, amount: '1000' };
  const r = await requests.createRequest({ proposerId: proposer.id, title: 'Insufficient', description: 'should fail execution', amount: '1000', metadata: meta });

  // first approval
  await approvals.approveRequest({ approverId: admin1.id, requestId: r.id, note: 'first' });
  // second approval should attempt execution and fail
  await expect(approvals.approveRequest({ approverId: admin2.id, requestId: r.id, note: 'second' })).rejects.toThrow(/Insufficient funds/);

  // request should remain PENDING because execution transaction rolled back
  const still = await prisma.request.findUnique({ where: { id: r.id } });
  expect(still.status).toBe('PENDING');

  // cleanup lowPayer
  await prisma.wallet.deleteMany({ where: { userId: lowPayer.id } });
  await prisma.user.deleteMany({ where: { id: lowPayer.id } });
});
