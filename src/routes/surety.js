const express = require('express');
const router = express.Router();
const { authenticate, ensureRole } = require('../middleware/auth');
const { pledgeSurety, releaseSurety } = require('../modules/surety');

// POST /api/surety/pledge
router.post('/pledge', authenticate, async (req, res, next) => {
  try {
    const { loanId, userId, amount } = req.body;
    if (!loanId || !userId || !amount) return res.status(400).json({ error: 'loanId, userId and amount required' });
    const result = await pledgeSurety({ initiatorId: req.user.id, loanId, userId, amount });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/surety/release
// admin only
router.post('/release', authenticate, ensureRole('ADMIN'), async (req, res, next) => {
  try {
    const { suretyId, amount } = req.body;
    if (!suretyId) return res.status(400).json({ error: 'suretyId required' });
    const result = await releaseSurety({ initiatorId: req.user.id, suretyId, amount });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
