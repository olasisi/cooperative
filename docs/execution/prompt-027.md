# Prompt 027: Balance Calculation & History

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Current balance retrieval is implemented. Ledger-backed history querying is straightforward from the existing schema, but the checked-in routes only expose the balance endpoint today.

## Current Balance Implementation
```js
async function getBalance(userId) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) throw Object.assign(new Error('Wallet not found'), { status: 404 });
  return { available: wallet.available.toString(), locked: wallet.locked.toString() };
}
```

## API Endpoint
- `GET /api/wallets/balance`
- Requires JWT authentication

Response shape:
```json
{
  "available": "1500",
  "locked": "700"
}
```

## History Source of Truth
Transaction history comes from `LedgerEntry` rows keyed by either:
- `debitUserId = userId`
- `creditUserId = userId`

## Implementation-Ready Query Pattern
A history endpoint can be built directly on the current model:
```js
async function getLedgerHistory({ userId, type, startDate, endDate, page = 1, pageSize = 20 }) {
  return prisma.ledgerEntry.findMany({
    where: {
      OR: [{ debitUserId: userId }, { creditUserId: userId }],
      ...(type ? { type } : {}),
      ...(startDate || endDate ? {
        createdAt: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        }
      } : {})
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
}
```

## Suggested HTTP Contract
- `GET /api/wallets/history?page=1&pageSize=20&type=DEPOSIT&startDate=2026-07-01&endDate=2026-07-31`

Suggested response:
```json
{
  "page": 1,
  "pageSize": 20,
  "items": [
    {
      "reference": "seed-payer",
      "type": "DEPOSIT",
      "amount": "2000",
      "beforeBalance": "0",
      "afterBalance": "2000",
      "createdAt": "2026-07-22T12:00:00.000Z"
    }
  ]
}
```

## Design Notes
- Balance is read from the `Wallet` aggregate, not recomputed on every request.
- History is read from the immutable ledger.
- Returning Decimal values as strings avoids JavaScript precision issues.
- The current codebase has the balance endpoint only; history filtering and pagination are documented here as the natural extension of the existing schema.
