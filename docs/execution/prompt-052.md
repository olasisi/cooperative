# Prompt 052: Surety Test Suite

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Defined the surety-focused test coverage needed around pledge and release behavior. The suite validates wallet locking, release rules, double-release prevention, and linkage between loans and sureties.

## Core Test Cases
1. pledge surety moves amount from `available` to `locked`;
2. release surety moves amount from `locked` to `available`;
3. releasing an already released surety fails;
4. pledge fails when available balance is insufficient;
5. surety row references the target loan id.

## Example Pledge Test
```js
const before = await wallet.getBalance(pledger.id);
const surety = await pledgeSurety({ initiatorId: pledger.id, loanId: loan.id, userId: pledger.id, amount: '1500' });
const after = await wallet.getBalance(pledger.id);

expect(surety.loanId).toBe(loan.id);
expect(Number(after.locked)).toBe(Number(before.locked) + 1500);
expect(Number(after.available)).toBe(Number(before.available) - 1500);
```

## Example Release Test
```js
const released = await releaseSurety({ initiatorId: admin.id, suretyId: surety.id });
const after = await wallet.getBalance(pledger.id);
const row = await prisma.surety.findUnique({ where: { id: surety.id } });

expect(row.releasedAt).toBeTruthy();
expect(Number(after.locked)).toBe(0);
```

## Negative Cases
```js
await expect(releaseSurety({ initiatorId: admin.id, suretyId: surety.id })).rejects.toThrow(/already released/);
await expect(pledgeSurety({ initiatorId: pledger.id, loanId: loan.id, userId: pledger.id, amount: '999999' })).rejects.toThrow(/Insufficient available balance/);
```

## Ledger / Audit Expectations
- pledge writes `SURETY_PLEDGE` financial trail;
- release writes `SURETY_UNLOCK`/`SURETY_RELEASE` trail;
- audit events include `SURETY_PLEDGED` and `SURETY_RELEASED`.

## Relationship Validation
Each surety must remain bound to a specific `loanId` and `userId`, enabling aggregation during loan disbursement and release-on-repayment.
