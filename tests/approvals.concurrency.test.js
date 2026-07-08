const approvals = require('../src/modules/approvals');
const requests = require('../src/modules/requests');
const wallet = require('../src/modules/wallet');
const prisma = require('../src/lib/prisma');

let proposer, payer, recipient, admin1, admin2, admin3;

beforeAll(async () => {
  proposer = await prisma.user.create({ data: { email: `concurrency-proposer+${Date.now()}@example.com`, fullName: 'Proposer', password: 'pass', role: 'MEMBER' } });
  payer = await prisma.user.create({ data: { email: `concurrency-payer+${Date.now()}@example.com`, fullName: 'Payer', password: 'pass', role: 'MEMBER' } });
  recipient = await prisma.user.create({ data: { email: `concurrency-recipient+${Date.now()}@example.com`, fullName: 'Recipient', password: 'pass', role: 'MEMBER' } });
  admin1 = await prisma.user.create({ data: { email: `concurrency-admin1+${Date.now()}@example.com`, fullName: 'Admin1', password: 'pass', role: 'ADMIN' } });
  admin2 = await prisma.user.create({ data: { email: `concurrency-admin2+${Date.now()}@example.com`, fullName: 'Admin2', password: 'pass', role: 'ADMIN' } });
  admin3 = await prisma.user.create({ data: { email: `concurrency-admin3+${Date.now()}@example.com`, fullName: 'Admin3', password: 'pass', role: 'ADMIN' } });

  await prisma.wallet.upsert({ where: { userId: payer.id }, update: {}, create: { userId: payer.id, available: '0', locked: '0' } });
  await prisma.wallet.upsert({ where: { userId: recipient.id }, update: {}, create: { userId: recipient.id, available: '0', locked: '0' } });

  // seed payer with funds
  await wallet.deposit({ initiatorId: admin1.id, userId: payer.id, amount: '3000', reference: 'seed-payer-concurrency' });
});

afterAll(async () => {
  try {
    await prisma.approval.deleteMany({ where: { approverId: { in: [admin1.id, admin2.id, admin3.id] } } });
    await prisma.request.deleteMany({ where: { proposerId: proposer.id } });
    await prisma.ledgerEntry.deleteMany({ where: { reference: { in: [] } } });
    await prisma.wallet.deleteMany({ where: { userId: { in: [payer.id, recipient.id] } } });
    await prisma.auditLog.deleteMany({ where: { initiatorId: { in: [admin1.id, admin2.id, admin3.id, proposer.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [proposer.id, payer.id, recipient.id, admin1.id, admin2.id, admin3.id] } } });
  } catch (err) {
    console.error('cleanup error', err);
  } finally {
    await prisma.$disconnect();
  }
});

test('concurrent approvals only execute once and respect threshold', async () => {
  // set threshold to 2 via requests.getApprovalThreshold default behaviour in module
  const meta = { action: 'transfer', fromUserId: payer.id, toUserId: recipient.id, amount: '1000' };
  const req = await requests.createRequest({ proposerId: proposer.id, title: 'Concurrency transfer', description: 'transfer test', amount: '1000', metadata: meta });

  // run approvals concurrently from three admins (one may be duplicate if same id used twice)
  const calls = [
    approvals.approveRequest({ approverId: admin1.id, requestId: req.id, note: 'concurrent-1' }),
    approvals.approveRequest({ approverId: admin2.id, requestId: req.id, note: 'concurrent-2' }),
    approvals.approveRequest({ approverId: admin3.id, requestId: req.id, note: 'concurrent-3' }),
  ];

  const results = await Promise.allSettled(calls);

  // ensure at least two approvals succeeded and request executed once
  const fulfilled = results.filter(r => r.status === 'fulfilled');
  expect(fulfilled.length).toBeGreaterThanOrEqual(2);

  // reload request
  const executed = await prisma.request.findUnique({ where: { id: req.id } });
  expect(executed.status).toBe('EXECUTED');

  // confirm wallets reflect a single execution of 1000
  const payerBal = await wallet.getBalance(payer.id);
  const recipientBal = await wallet.getBalance(recipient.id);
  expect(Number(payerBal.available)).toBeGreaterThanOrEqual(2000); // started 3000 -> debited 1000 => >=2000
  expect(Number(recipientBal.available)).toBeGreaterThanOrEqual(1000);

  // ensure there are ledger entries for this request
  const ledgers = await prisma.ledgerEntry.findMany({ where: { reference: req.id } });
  expect(ledgers.length).toBeGreaterThanOrEqual(2);
});
