const express = require('express');
const authRoutes = require('../routes/auth');
const userRoutes = require('../routes/users');
const walletRoutes = require('../routes/wallets');
const requestRoutes = require('../routes/requests');
const approvalRoutes = require('../routes/approvals');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/wallets', walletRoutes);
router.use('/requests', requestRoutes);
router.use('/approvals', approvalRoutes);

module.exports = router;
