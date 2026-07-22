# Prompt 006: Wallet & Ledger Architecture (Double-Entry Bookkeeping)

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Describes wallet balance handling, immutable ledger entry design, atomic money movement rules, concurrency protection, and idempotency via unique references.

## Architectural Goal
Wallets provide fast access to a member’s current balances, while ledger entries preserve permanent financial history. The system must favor correctness over convenience: no direct balance edits, no hidden side effects, and no duplicate postings.

## Wallet Model
A wallet represents operational balance state for a single user.

### Fields
- `userId` – wallet owner
- `available` – spendable balance
- `locked` – reserved balance backing surety or controlled holds
- `createdAt`

### Derived Meanings
- `available + locked` approximates total wallet-controlled funds.
- `available` is reduced by withdrawal, transfers out, and surety pledges.
- `locked` increases with surety pledge and decreases with surety release.

## Ledger Entry Design
Each financial event writes one or more immutable ledger rows.

### Required Fields
- `reference` – stable business id for idempotency
- `type` – event class such as `DEPOSIT`, `WITHDRAW`, `EXECUTION_DEBIT`
- `amount`
- `currency`
- `debitUserId`
- `creditUserId`
- `beforeBalance`
- `afterBalance`
- `createdAt`

### Unique Constraint
```text
UNIQUE(reference, type)
```
This prevents duplicate posting of the same event class for the same business reference.

## Double-Entry Principles
For transfers between users, write paired entries:
- one debit entry for the sender,
- one credit entry for the recipient.

Example:
- `EXECUTION_DEBIT` with `debitUserId=from`, `creditUserId=to`
- `EXECUTION_CREDIT` with `debitUserId=from`, `creditUserId=to`

Single-sided events such as external deposit or withdrawal may still use one ledger row when the external counterparty is off-ledger, but the business meaning must be explicit in `type`.

## Supported Money Operations
- deposit
- withdraw
- transfer execution
- lock funds
- unlock funds
- loan disbursement
- loan repayment
- surety release

## Atomic Operation Rules
All balance changes must occur inside one transactional boundary per business action.

### Deposit
1. Increment `Wallet.available`.
2. Write ledger entry.
3. Write audit log.

### Withdraw
1. Atomically decrement only if `available >= amount`.
2. Write ledger entry.
3. Write audit log.

### Transfer
1. Atomically debit source wallet.
2. Atomically credit destination wallet.
3. Write paired ledger entries.
4. Mark request executed.
5. Write audit log.

### Lock / Unlock
1. Move funds between `available` and `locked` in one SQL update.
2. Write ledger entry.
3. Write audit log.

## Concurrency Guards
- Use conditional SQL updates for insufficient-funds protection.
- Use transactions for multi-wallet operations.
- Use row-level locks when a workflow may be executed concurrently.
- Never read a balance and then write a derived value outside a protective SQL predicate or lock.

## Idempotency Rules
- Every operation must accept or generate a business reference.
- Retrying with the same reference must not produce duplicate ledger rows.
- Duplicate insert conflict on `(reference, type)` should be treated as already processed where safe.
- Request execution should first check for existing ledger rows tied to the request id.

## Ledger Writing Standards
- `beforeBalance` and `afterBalance` must reflect the impacted side of the wallet.
- Amounts must be persisted as strings/decimals, never floating-point JS numbers.
- Currency defaults to `NGN` unless multi-currency support is introduced.
- Ledger types should come from a finite enum in future schema hardening.

## Recommended Ledger Types
- `DEPOSIT`
- `WITHDRAW`
- `LOCK`
- `UNLOCK`
- `EXECUTION_DEBIT`
- `EXECUTION_CREDIT`
- `LOAN_DISBURSE`
- `LOAN_REPAY`
- `SURETY_PLEDGE`
- `SURETY_RELEASE`

## Wallet Integrity Invariants
- `available >= 0`
- `locked >= 0`
- no operation may violate both wallet and ledger consistency
- every wallet mutation must have an attributable ledger and audit reason

## Query Patterns
- Current balance: read wallet row.
- User statement: `LedgerEntry` where `debitUserId = userId OR creditUserId = userId` ordered by `createdAt DESC`.
- Request trace: `LedgerEntry` where `reference = requestId`.
- Duplicate detection: `LedgerEntry` by `(reference, type)`.

## Recommended Hardening
- Wrap deposit in transaction with audit insert.
- Add check constraints for non-negative balances.
- Add ledger enum type.
- Add `cooperativeId` to wallets and ledger entries.
- Add source/event linkage columns if richer posting sets are needed.
