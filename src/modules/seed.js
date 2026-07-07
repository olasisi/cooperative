const prisma = require('../lib/prisma');
const bcrypt = require('bcrypt');

async function seedSuperAdmin() {
  const email = process.env.DEV_ADMIN_EMAIL;
  const password = process.env.DEV_ADMIN_PASSWORD;
  if (!email || !password) return;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Dev super admin already exists');
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      fullName: 'Dev Super Admin',
      password: hashed,
      role: 'ADMIN',
      isSuper: true,
      membershipStart: new Date(),
    },
  });
  // create wallet
  await prisma.wallet.create({
    data: { userId: user.id, available: 0, locked: 0 },
  });
  console.log(`Seeded dev super admin ${email}`);
}

module.exports = { seedSuperAdmin };
