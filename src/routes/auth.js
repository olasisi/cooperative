const express = require('express');
const router = express.Router();
const auth = require('../modules/auth');

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, phone, fullName, password } = req.body;
    const user = await auth.register({ email, phone, fullName, password });
    res.status(201).json({ id: user.id, email: user.email, fullName: user.fullName });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const token = await auth.login({ email, password });
    res.json(token);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
