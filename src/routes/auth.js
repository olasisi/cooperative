const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const auth = require('../modules/auth');

// Strict rate limit for auth endpoints to prevent brute-force
const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

// POST /api/auth/register
router.post('/register', authLimit, async (req, res, next) => {
  try {
    const { email, phone, fullName, password } = req.body;
    const user = await auth.register({ email, phone, fullName, password });
    res.status(201).json({ id: user.id, email: user.email, fullName: user.fullName });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', authLimit, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const token = await auth.login({ email, password });
    res.json(token);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', authLimit, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await auth.refreshAccessToken({ token: refreshToken });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', authLimit, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await auth.logout({ token: refreshToken });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
