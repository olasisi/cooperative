const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createRequest, listRequests, getRequest } = require('../modules/requests');

// POST /api/requests
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, description, amount, metadata } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const r = await createRequest({ proposerId: req.user.id, title, description, amount, metadata });
    res.status(201).json(r);
  } catch (err) {
    next(err);
  }
});

// GET /api/requests
router.get('/', authenticate, async (req, res, next) => {
  try {
    const list = await listRequests({ take: 50 });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// GET /api/requests/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const r = await getRequest(req.params.id);
    res.json(r);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
