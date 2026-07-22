// src/modules/auth.js
const prisma = require('../lib/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES_SECONDS = 30 * 24 * 60 * 60; // 30 days in seconds
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '30d';

function signAccess(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
}

function signRefresh(user) {
  // include a random jti so tokens issued in the same second are always unique
  const jti = crypto.randomBytes(16).toString('hex');
  return jwt.sign({ sub: user.id, jti }, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function storeRefreshToken(userId, token) {
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_SECONDS * 1000);
  await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
}

async function register({ email, phone, fullName, password }) {
  if (!password || !(email || phone)) throw Object.assign(new Error('email/phone and password required'), { status: 400 });
  // prevent duplicates
  if (email) {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw Object.assign(new Error('Email already in use'), { status: 409 });
  }
  if (phone) {
    const existsP = await prisma.user.findUnique({ where: { phone } });
    if (existsP) throw Object.assign(new Error('Phone already in use'), { status: 409 });
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      phone,
      fullName,
      password: hashed,
      role: 'MEMBER',
      membershipStart: new Date()
    }
  });
  // create wallet row
  await prisma.wallet.create({ data: { userId: user.id, available: 0, locked: 0 } });
  return user;
}

async function login({ email, password }) {
  if (!email || !password) throw Object.assign(new Error('email and password required'), { status: 400 });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const accessToken = signAccess(user);
  const refreshToken = signRefresh(user);

  // persist refresh token (hashed) for later revocation
  await storeRefreshToken(user.id, refreshToken);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, isSuper: user.isSuper }
  };
}

async function refreshAccessToken({ token }) {
  if (!token) throw Object.assign(new Error('Refresh token required'), { status: 400 });

  // verify JWT signature and expiry
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw Object.assign(new Error('Invalid or expired refresh token'), { status: 401 });
  }

  // check DB record: must exist and not be revoked
  const tokenHash = hashToken(token);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw Object.assign(new Error('Refresh token revoked or expired'), { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw Object.assign(new Error('User not found'), { status: 401 });

  // rotate: revoke old token, issue new pair
  await prisma.refreshToken.update({ where: { tokenHash }, data: { revokedAt: new Date() } });

  const newAccessToken = signAccess(user);
  const newRefreshToken = signRefresh(user);
  await storeRefreshToken(user.id, newRefreshToken);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, isSuper: user.isSuper }
  };
}

async function logout({ token }) {
  if (!token) throw Object.assign(new Error('Refresh token required'), { status: 400 });
  const tokenHash = hashToken(token);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (stored && !stored.revokedAt) {
    await prisma.refreshToken.update({ where: { tokenHash }, data: { revokedAt: new Date() } });
  }
}

module.exports = { register, login, refreshAccessToken, logout, signAccess, signRefresh };
