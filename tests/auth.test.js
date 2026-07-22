const auth = require('../src/modules/auth');
const prisma = require('../src/lib/prisma');

let testEmail;
let testUser;

beforeAll(async () => {
  testEmail = `auth-test+${Date.now()}@example.com`;
  testUser = await auth.register({ email: testEmail, fullName: 'Auth Test User', password: 'TestPass123' });
});

afterAll(async () => {
  try {
    await prisma.refreshToken.deleteMany({ where: { userId: testUser.id } });
    await prisma.wallet.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.deleteMany({ where: { id: testUser.id } });
  } catch (err) {
    console.error('cleanup error', err);
  } finally {
    await prisma.$disconnect();
  }
});

test('register creates user and wallet', async () => {
  expect(testUser).toHaveProperty('id');
  expect(testUser.email).toBe(testEmail);
  const wallet = await prisma.wallet.findUnique({ where: { userId: testUser.id } });
  expect(wallet).toBeTruthy();
});

test('register rejects duplicate email', async () => {
  await expect(auth.register({ email: testEmail, fullName: 'Dup', password: 'pass' })).rejects.toThrow(/already in use/i);
});

test('login returns access and refresh tokens', async () => {
  const result = await auth.login({ email: testEmail, password: 'TestPass123' });
  expect(result).toHaveProperty('accessToken');
  expect(result).toHaveProperty('refreshToken');
  expect(result.user.email).toBe(testEmail);
});

test('login stores refresh token in DB', async () => {
  const before = await prisma.refreshToken.count({ where: { userId: testUser.id } });
  await auth.login({ email: testEmail, password: 'TestPass123' });
  const after = await prisma.refreshToken.count({ where: { userId: testUser.id } });
  expect(after).toBeGreaterThan(before);
});

test('login rejects wrong password', async () => {
  await expect(auth.login({ email: testEmail, password: 'wrongpass' })).rejects.toThrow(/Invalid credentials/i);
});

test('refresh token rotates access and refresh tokens', async () => {
  const loginResult = await auth.login({ email: testEmail, password: 'TestPass123' });
  const { refreshToken: oldRefresh } = loginResult;

  const refreshResult = await auth.refreshAccessToken({ token: oldRefresh });
  expect(refreshResult).toHaveProperty('accessToken');
  expect(refreshResult).toHaveProperty('refreshToken');
  // new refresh token must be different from the old one
  expect(refreshResult.refreshToken).not.toBe(oldRefresh);

  // old refresh token should now be revoked
  await expect(auth.refreshAccessToken({ token: oldRefresh })).rejects.toThrow(/revoked or expired/i);
});

test('logout revokes refresh token', async () => {
  const loginResult = await auth.login({ email: testEmail, password: 'TestPass123' });
  const { refreshToken } = loginResult;

  await auth.logout({ token: refreshToken });

  // attempting refresh after logout should fail
  await expect(auth.refreshAccessToken({ token: refreshToken })).rejects.toThrow(/revoked or expired/i);
});

test('refresh with invalid token throws', async () => {
  await expect(auth.refreshAccessToken({ token: 'not-a-valid-token' })).rejects.toThrow(/invalid or expired/i);
});
