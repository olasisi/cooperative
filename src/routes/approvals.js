const express = require('express');
const router = express.Router();
const { authenticate, ensureRole } = require('../middleware/auth');
const { approveRequest, rejectRequest } = require('../modules/approvals');

// POST /api/approvals/:requestId
// body: { action: 'approve' | 'reject', note?: string }
router.post('/:requestId', authenticate, ensureRole('ADMIN'), async (req, res, next) => {
  try {
    const { action, note } = req.body;
    if (!action) return res.status(400).json({ error: 'action required' });
    const requestId = req.params.requestId;
    if (action === 'approve') {
      const a = await approveRequest({ approverId: req.user.id, requestId, note });
      return res.json(a);
    } else if (action === 'reject') {
      const r = await rejectRequest({ approverId: req.user.id, requestId, note });
      return res.json(r);
    } else {
      return res.status(400).json({ error: 'invalid action' });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
