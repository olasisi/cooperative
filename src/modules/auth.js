// src/modules/auth.js
const prisma = require('../lib/prisma');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '30d';

function signAccess(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
}
function signRefresh(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
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

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, isSuper: user.isSuper }
  };
}

module.exports = { register, login, signAccess, signRefresh };
