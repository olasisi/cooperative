const prisma = require('../lib/prisma');
const { logAudit } = require('./audit');

async function getApprovalThreshold() {
  const s = await prisma.setting.findUnique({ where: { key: 'approval_threshold' } });
  return s ? Number(s.value) : 2; // default 2
}

async function createRequest({ proposerId, title, description, amount = null, metadata = {} }) {
  if (!proposerId || !title) throw Object.assign(new Error('proposerId and title required'), { status: 400 });
  const req = await prisma.request.create({
    data: {
      title,
      description,
      amount: amount ? String(amount) : null,
      proposerId,
      status: 'PENDING',
      metadata: JSON.stringify(metadata),
    },
  });
  await logAudit('REQUEST_CREATED', proposerId, { requestId: req.id, title });
  return req;
}

async function getRequest(id) {
  const req = await prisma.request.findUnique({ where: { id }, include: { approvals: true } });
  if (!req) throw Object.assign(new Error('Request not found'), { status: 404 });
  return req;
}

async function listRequests({ where = {}, take = 50 }) {
  return prisma.request.findMany({ where, orderBy: { createdAt: 'desc' }, take, include: { approvals: true } });
}

module.exports = { createRequest, getRequest, listRequests, getApprovalThreshold };
