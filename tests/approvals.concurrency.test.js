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
    await prisma.ledgerEntry.deleteMany({ where: { OR: [{ debitUserId: { in: [payer.id, recipient.id] } }, { creditUserId: { in: [payer.id, recipient.id] } }] } });
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

  // run approvals concurrently from three admins
  const calls = [
    approvals.approveRequest({ approverId: admin1.id, requestId: req.id, note: 'concurrent-1' }),
    approvals.approveRequest({ approverId: admin2.id, requestId: req.id, note: 'concurrent-2' }),
    approvals.approveRequest({ approverId: admin3.id, requestId: req.id, note: 'concurrent-3' }),
  ];

  const results = await Promise.allSettled(calls);

  // ensure at least two approvals recorded
  const fulfilled = results.filter(r => r.status === 'fulfilled');
  expect(fulfilled.length).toBeGreaterThanOrEqual(2);

  // reload request and assert it was executed and marked idempotently
  const executedReq = await prisma.request.findUnique({ where: { id: req.id } });
  expect(executedReq.status).toBe('EXECUTED');
  expect(executedReq.executed).toBe(true);
  expect(executedReq.executedAt).toBeTruthy();

  // confirm wallets reflect a single execution of 1000 (exact balances)
  const payerBal = await wallet.getBalance(payer.id);
  const recipientBal = await wallet.getBalance(recipient.id);
  expect(Number(payerBal.available)).toBe(2000); // started 3000 -> debited 1000 => 2000
  expect(Number(recipientBal.available)).toBe(1000);

  // ensure there are exactly two ledger entries for this request (debit + credit)
  const ledgers = await prisma.ledgerEntry.findMany({ where: { reference: req.id } });
  expect(ledgers.length).toBe(2);
  const types = ledgers.map(l => l.type).sort();
  expect(types).toEqual(['EXECUTION_CREDIT', 'EXECUTION_DEBIT'].sort());

  // ensure exactly one REQUEST_EXECUTED audit entry for this request
  const audits = await prisma.auditLog.findMany({ where: { actionType: 'REQUEST_EXECUTED' } });
  const execAudits = audits.filter(a => a.details && a.details.requestId === req.id);
  expect(execAudits.length).toBe(1);
});
