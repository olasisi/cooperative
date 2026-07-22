const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { authenticate, ensureRole } = require('../middleware/auth');
const prisma = require('../lib/prisma');

const userReadLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// GET /api/users/me
router.get('/me', userReadLimit, authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, phone: true, fullName: true, role: true, isSuper: true, membershipStart: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// GET /api/users (admin only)
router.get('/', userReadLimit, authenticate, ensureRole('ADMIN'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, phone: true, fullName: true, role: true, isSuper: true, membershipStart: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
