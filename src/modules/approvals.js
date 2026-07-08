const prisma = require('../lib/prisma');
const { logAudit } = require('./audit');
const { getApprovalThreshold } = require('./requests');
const { Prisma } = require('@prisma/client');

async function approveRequest({ approverId, requestId, note = null }) {
  // fetch request
  const req = await prisma.request.findUnique({ where: { id: requestId } });
  if (!req) throw Object.assign(new Error('Request not found'), { status: 404 });
  if (req.proposerId === approverId) throw Object.assign(new Error('Proposer cannot approve their own request'), { status: 403 });
  if (req.status !== 'PENDING') throw Object.assign(new Error('Request not in pending state'), { status: 400 });

  // prevent duplicate approval by same approver
  const existing = await prisma.approval.findFirst({ where: { requestId, approverId } });
  if (existing) throw Object.assign(new Error('You have already approved this request'), { status: 400 });

  // record approval
  const approval = await prisma.approval.create({ data: { requestId, approverId, note } });
  await logAudit('REQUEST_APPROVED', approverId, { requestId, approvalId: approval.id, note });

  // count approvals and compare against threshold
  const count = await prisma.approval.count({ where: { requestId } });
  const threshold = await getApprovalThreshold();
  if (count >= threshold) {
    // We must ensure only one concurrent caller performs execution.
    // Acquire a row-lock on the request and re-check approval count/status inside a transaction.
    await prisma.$transaction(async (tx) => {
      // lock the request row to make execution single-winner under concurrency
      const lockedRows = await tx.$queryRaw`
        SELECT * FROM "Request" WHERE id = ${requestId} FOR UPDATE
      `;
      const lockedReq = lockedRows[0];
      if (!lockedReq) throw Object.assign(new Error('Request not found'), { status: 404 });

      // if status changed by another concurrent worker, abort execution path
      if (lockedReq.status !== 'PENDING') {
        return;
      }

      // re-count approvals inside transaction to avoid races
      const txCountRes = await tx.approval.count({ where: { requestId } });
      const txThreshold = await getApprovalThreshold();
      if (txCountRes < txThreshold) {
        // another concurrent process hasn't fully recorded approvals yet
        return;
      }

      // mark request APPROVED and note execution time
      await tx.request.update({ where: { id: requestId }, data: { status: 'APPROVED', executedAt: new Date() } });
      await tx.auditLog.create({ data: { actionType: 'REQUEST_THRESHOLD_MET', details: { requestId, approvals: txCountRes, threshold: txThreshold } } });

      // parse metadata from the locked request row
      let meta = lockedReq.metadata;
      try {
        if (meta && typeof meta === 'string') meta = JSON.parse(meta);
      } catch (err) {
        // leave meta as-is if parsing fails
      }

      if (meta && (meta.action === 'transfer' || meta.type === 'transfer')) {
        const amount = String(meta.amount);
        const from = meta.fromUserId || meta.debitUserId;
        const to = meta.toUserId || meta.creditUserId;
        if (!from || !to || !amount) {
          // missing execution details, still mark executed but audit the issue
          await tx.auditLog.create({ data: { actionType: 'REQUEST_EXECUTION_SKIPPED', details: { requestId, reason: 'missing execution metadata' } } });
        } else {
          // idempotency guard: if execution ledger entries already exist, treat as already executed and skip money ops
          const existingExecution = await tx.ledgerEntry.findFirst({ where: { reference: requestId, type: 'EXECUTION_DEBIT' } });
          if (existingExecution) {
            await tx.auditLog.create({ data: { actionType: 'REQUEST_EXECUTION_SKIPPED', details: { requestId, reason: 'already executed - existing ledger entries' } } });
            // ensure request marked EXECUTED and return
            await tx.request.update({ where: { id: requestId }, data: { status: 'EXECUTED' } });
            return;
          }

          // debit the sender atomically
          const debitRows = await tx.$queryRaw`
            UPDATE "Wallet" SET "available" = "available" - ${amount}
            WHERE "userId" = ${from} AND "available" >= ${amount}
            RETURNING *;
          `;
          if (debitRows.length === 0) throw Object.assign(new Error('Insufficient funds for execution'), { status: 400 });
          const fromUpdated = debitRows[0];

          // credit the recipient
          const creditRows = await tx.$queryRaw`
            UPDATE "Wallet" SET "available" = "available" + ${amount}
            WHERE "userId" = ${to}
            RETURNING *;
          `;
          if (creditRows.length === 0) throw Object.assign(new Error('Recipient wallet not found'), { status: 404 });
          const toUpdated = creditRows[0];

          // create paired ledger entries (double-entry)
          try {
            await tx.ledgerEntry.createMany({ data: [
              {
                reference: requestId,
                type: 'EXECUTION_DEBIT',
                amount: amount,
                currency: 'NGN',
                debitUserId: from,
                creditUserId: to,
                beforeBalance: String(Number(fromUpdated.available) + Number(amount)),
                afterBalance: String(fromUpdated.available),
              },
              {
                reference: requestId,
                type: 'EXECUTION_CREDIT',
                amount: amount,
                currency: 'NGN',
                debitUserId: from,
                creditUserId: to,
                beforeBalance: String(Number(toUpdated.available) - Number(amount)),
                afterBalance: String(toUpdated.available),
              }
            ]});
          } catch (err) {
            // handle unique constraint (duplicate ledger entries) gracefully as idempotent behaviour
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
              await tx.auditLog.create({ data: { actionType: 'REQUEST_EXECUTION_IDEMPOTENT', details: { requestId, reason: 'duplicate ledger entries detected' } } });
            } else {
              throw err;
            }
          }

          await tx.auditLog.create({ data: { actionType: 'REQUEST_EXECUTED', details: { requestId, from, to, amount } } });
        }
      } else {
        // no executable metadata; just mark executed and audit
        await tx.auditLog.create({ data: { actionType: 'REQUEST_EXECUTED', details: { requestId, note: 'no execution metadata' } } });
      }

      // finally set status to EXECUTED
      await tx.request.update({ where: { id: requestId }, data: { status: 'EXECUTED' } });
    });
  }

  return approval;
}

async function rejectRequest({ approverId, requestId, note = null }) {
  const req = await prisma.request.findUnique({ where: { id: requestId } });
  if (!req) throw Object.assign(new Error('Request not found'), { status: 404 });
  if (req.proposerId === approverId) throw Object.assign(new Error('Proposer cannot reject their own request'), { status: 403 });
  if (req.status !== 'PENDING') throw Object.assign(new Error('Request not in pending state'), { status: 400 });

  const approval = await prisma.approval.create({ data: { requestId, approverId, note } });
  await prisma.request.update({ where: { id: requestId }, data: { status: 'REJECTED' } });
  await logAudit('REQUEST_REJECTED', approverId, { requestId, approvalId: approval.id, note });
  return approval;
}

module.exports = { approveRequest, rejectRequest };