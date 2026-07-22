# Prompt 022: Wallet Creation & Linking

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Every registered member gets exactly one linked wallet at signup. Wallet ownership is enforced with a unique `userId`, and balances start at zero for both available and locked funds.

## Schema Design
```prisma
model Wallet {
  id         String   @id @default(uuid())
  userId     String   @unique
  user       User     @relation(fields: [userId], references: [id])
  available  Decimal  @default(0)
  locked     Decimal  @default(0)
  createdAt  DateTime @default(now())
}
```

## Registration Hook
Wallet creation happens immediately after user creation:
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

await prisma.wallet.create({ data: { userId: user.id, available: 0, locked: 0 } });
```

## Why `userId @unique` Matters
`Wallet.userId @unique` guarantees:
- one wallet per member
- easy lookup with `findUnique({ where: { userId } })`
- no ambiguity for deposits, withdrawals, surety locks, or loan disbursements

## Initial Balances
New wallets are initialized as:
```json
{
  "available": 0,
  "locked": 0
}
```

That matches the later wallet flows:
- deposits increment `available`
- surety pledges move money from `available` to `locked`
- surety release moves it back

## Balance Retrieval
### Module
```js
async function getBalance(userId) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw Object.assign(new Error('Wallet not found'), { status: 404 });
  return { available: wallet.available.toString(), locked: wallet.locked.toString() };
}
```

### API
- `GET /api/wallets/balance`
- Requires authentication
- Uses `req.user.id` from JWT middleware

```js
router.get('/balance', authenticate, async (req, res, next) => {
  const b = await wallet.getBalance(req.user.id);
  res.json(b);
});
```

## Returned Shape
```json
{
  "available": "0",
  "locked": "0"
}
```

Balances are returned as strings because Prisma Decimal values should not be emitted as JavaScript floating-point numbers.
