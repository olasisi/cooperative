const express = require('express');
const router = express.Router();
const { authenticate, ensureRole } = require('../middleware/auth');
const { createLoan, disburseLoan, repayLoan, getLoan, listLoans } = require('../modules/loans');

// POST /api/loans
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { borrowerId, amount, termMonths, metadata } = req.body;
    if (!borrowerId || !amount) return res.status(400).json({ error: 'borrowerId and amount required' });
    const loan = await createLoan({ proposerId: req.user.id, borrowerId, amount, termMonths, metadata });
    res.status(201).json(loan);
  } catch (err) {
    next(err);
  }
});

// POST /api/loans/:id/disburse (admin only)
router.post('/:id/disburse', authenticate, ensureRole('ADMIN'), async (req, res, next) => {
  try {
    const loan = await disburseLoan({ initiatorId: req.user.id, loanId: req.params.id });
    res.json(loan);
  } catch (err) {
    next(err);
  }
});

// POST /api/loans/:id/repay (borrower)
router.post('/:id/repay', authenticate, async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ error: 'amount required' });
    const loan = await repayLoan({ initiatorId: req.user.id, loanId: req.params.id, amount });
    res.json(loan);
  } catch (err) {
    next(err);
  }
});

// GET /api/loans
router.get('/', authenticate, async (req, res, next) => {
  try {
    const loans = await listLoans({ take: 50 });
    res.json(loans);
  } catch (err) {
    next(err);
  }
});

// GET /api/loans/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const loan = await getLoan(req.params.id);
    res.json(loan);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
