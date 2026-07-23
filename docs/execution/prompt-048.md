# Prompt 048: Wallet Test Suite

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Documented the wallet module tests that verify deposits, withdrawals, fund locking/unlocking, and concurrency protection. The suite uses direct module calls against Prisma-backed state.

## Covered File
`tests/wallet.test.js`

## Covered Behaviors
- deposit increases `Wallet.available`;
- withdraw decreases available balance;
- transfer debits one wallet and credits another wallet;
- withdrawing beyond balance fails;
- lock moves value from available to locked;
- locked funds cannot be double-spent;
- concurrent withdrawals produce only one winner.

## Setup / Teardown Pattern
Each suite creates a dedicated user and upserts a wallet in `beforeAll`, then deletes related ledger rows, wallet rows, and the user in `afterAll`.

```js
beforeAll(async () => {
  testUser = await prisma.user.create({ data: { ... } });
  await prisma.wallet.upsert({
    where: { userId: testUser.id },
    update: {},
    create: { userId: testUser.id, available: '0', locked: '0' },
  });
});
```

## Key Assertions
```js
const res = await wallet.deposit({ initiatorId: testUser.id, userId: testUser.id, amount: '1000', reference: 'test-deposit' });
expect(Number(res.available)).toBeGreaterThanOrEqual(1000);

await expect(wallet.withdraw({ initiatorId: testUser.id, userId: testUser.id, amount: large })).rejects.toThrow();
```

## Transfer Coverage
Transfer validation should assert paired balance movement between payer and recipient. In the current codebase, transfer execution is exercised through the approvals flow, which creates `EXECUTION_DEBIT` and `EXECUTION_CREDIT` ledger rows after threshold approval.

```js
const payerBal = await wallet.getBalance(payer.id);
const recipientBal = await wallet.getBalance(recipient.id);
expect(Number(payerBal.available)).toBe(2000);
expect(Number(recipientBal.available)).toBe(1000);
```

## Ledger Verification
The suite currently validates balance effects directly. Recommended expansion: assert ledger rows exist with expected types and references.

```js
const ledgers = await prisma.ledgerEntry.findMany({ where: { OR: [{ debitUserId: testUser.id }, { creditUserId: testUser.id }] } });
expect(ledgers.length).toBeGreaterThan(0);
```

## Error Cases
- insufficient balance on withdraw;
- attempting to withdraw funds already moved to `locked`;
- concurrent double-spend prevention.

## Concurrency Pattern
```js
const results = await Promise.allSettled([
  wallet.withdraw({ initiatorId: testUser.id, userId: testUser.id, amount: '800', reference: 'concurrent-1' }),
  wallet.withdraw({ initiatorId: testUser.id, userId: testUser.id, amount: '800', reference: 'concurrent-2' }),
]);
expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
```

## Reliability Notes
- tests talk to a real database;
- each test accumulates state, so unique references help trace failures;
- teardown should always disconnect Prisma.
