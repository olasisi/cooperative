const prisma = require('../lib/prisma');

async function logAudit(actionType, initiatorId = null, details = {}) {
  try {
    await prisma.auditLog.create({
      data: {
        actionType,
        initiatorId,
        details,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log', err);
  }
}

module.exports = { logAudit };
