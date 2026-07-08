const prisma = require('../lib/prisma');
const { logAudit } = require('./audit');
const { getApprovalThreshold } = require('./requests');

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
    // mark request APPROVED and then execute
    await prisma.request.update({ where: { id: requestId }, data: { status: 'APPROVED', executedAt: new Date() } });
    await logAudit('REQUEST_THRESHOLD_MET', null, { requestId, approvals: count, threshold });

    // trigger execution hook - for now mark EXECUTED and audit (actual financial execution handled elsewhere)
    await prisma.request.update({ where: { id: requestId }, data: { status: 'EXECUTED' } });
    await logAudit('REQUEST_EXECUTED', null, { requestId });
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
