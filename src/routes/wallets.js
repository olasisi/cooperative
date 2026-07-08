const express = require('express');
const router = express.Router();
const { authenticate, ensureRole } = require('../middleware/auth');
const wallet = require('../modules/wallet');

// GET /api/wallets/balance
router.get('/balance', authenticate, async (req, res, next) => {
  try {
    const b = await wallet.getBalance(req.user.id);
    res.json(b);
  } catch (err) {
    next(err);
  }
});

// POST /api/wallets/deposit
router.post('/deposit', authenticate, ensureRole('ADMIN'), async (req, res, next) => {
  try {
    const { userId, amount, reference } = req.body;
    if (!userId || !amount) return res.status(400).json({ error: 'userId and amount required' });
    const result = await wallet.deposit({ initiatorId: req.user.id, userId, amount, reference });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/wallets/withdraw
router.post('/withdraw', authenticate, async (req, res, next) => {
  try {
    const { amount, reference } = req.body;
    if (!amount) return res.status(400).json({ error: 'amount required' });
    const result = await wallet.withdraw({ initiatorId: req.user.id, userId: req.user.id, amount, reference });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/wallets/lock
router.post('/lock', authenticate, async (req, res, next) => {
  try {
    const { amount, reference } = req.body;
    if (!amount) return res.status(400).json({ error: 'amount required' });
    const result = await wallet.lockFunds({ initiatorId: req.user.id, userId: req.user.id, amount, reference });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/wallets/unlock
router.post('/unlock', authenticate, ensureRole('ADMIN'), async (req, res, next) => {
  try {
    const { userId, amount, reference } = req.body;
    if (!userId || !amount) return res.status(400).json({ error: 'userId and amount required' });
    const result = await wallet.unlockFunds({ initiatorId: req.user.id, userId, amount, reference });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
