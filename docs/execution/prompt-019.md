# Prompt 019: User Registration Module

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Registration is implemented in `src/modules/auth.js` with identifier validation, duplicate checks on email and phone, bcrypt hashing with 10 salt rounds, member creation, and automatic wallet creation.

## Entry Points
- Module: `src/modules/auth.js`
- Route: `POST /api/auth/register`

```js
router.post('/register', async (req, res, next) => {
  const { email, phone, fullName, password } = req.body;
  const user = await auth.register({ email, phone, fullName, password });
  res.status(201).json({ id: user.id, email: user.email, fullName: user.fullName });
});
```

## `register()` Flow
```js
async function register({ email, phone, fullName, password }) {
  if (!password || !(email || phone)) {
    throw Object.assign(new Error('email/phone and password required'), { status: 400 });
  }
  if (email) {
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw Object.assign(new Error('Email already in use'), { status: 409 });
  }
  if (phone) {
    const existsP = await prisma.user.findUnique({ where: { phone } });
    if (existsP) throw Object.assign(new Error('Phone already in use'), { status: 409 });
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ ... });
  await prisma.wallet.create({ data: { userId: user.id, available: 0, locked: 0 } });
  return user;
}
```

## Validation Rules
- At least one identifier is required: `email` or `phone`
- `password` is required
- `fullName` is passed through to persistence and should be treated as required by API callers even though the function only explicitly guards password/identifier presence

## Uniqueness Checks
The implementation performs explicit pre-insert checks before the database insert:
- `prisma.user.findUnique({ where: { email } })`
- `prisma.user.findUnique({ where: { phone } })`

This gives friendly `409 Conflict` messages before the database unique constraint fires.

## Password Hashing
- Library: `bcrypt`
- Salt rounds: `10`

```js
const hashed = await bcrypt.hash(password, 10);
```

The stored `User.password` value is the hash only.

## User Creation
New users are created as members:
```js
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
```

## Wallet Auto-Creation
Immediately after creating the user, registration inserts the linked wallet row:
```js
await prisma.wallet.create({ data: { userId: user.id, available: 0, locked: 0 } });
```

That guarantees every registered member can participate in wallet, surety, and loan flows.

## Response Shape
### Internal module return
`register()` returns the full Prisma `User` object.

### HTTP response
The route intentionally trims the response to:
```json
{
  "id": "user-uuid",
  "email": "member@example.com",
  "fullName": "Member Name"
}
```

## Error Cases
- `400`: missing password or both identifiers absent
- `409`: email already used
- `409`: phone already used
- `500`: unexpected persistence failure
