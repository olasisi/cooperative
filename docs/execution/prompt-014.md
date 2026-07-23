# Prompt 014: Concurrency Safety & Idempotency Rules

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Defines the concurrency-control model, row-level locking strategy, atomic SQL patterns, unique constraints, and idempotent execution rules for financial workflows.

## Objective
Financial correctness must hold even when the same action is retried, two admins approve simultaneously, or multiple wallet operations race. The system must guarantee no double-spend and no duplicate execution.

## Concurrency Hazards
- two withdrawals racing on the same wallet,
- concurrent approvals attempting to execute the same request twice,
- repeated HTTP retries after timeout,
- duplicate surety release,
- double loan disbursement.

## Row-Level Locking
Use `SELECT ... FOR UPDATE` when one workflow needs exclusive control over a row before state transition.

### Primary Use Case
Request execution after threshold approval:
```sql
SELECT * FROM "Request" WHERE id = $1 FOR UPDATE;
```

This guarantees a single transaction wins the right to evaluate final request state and execute side effects.

## Atomic SQL Updates
Use single-statement guarded updates for wallet mutations.

### Withdraw
```sql
UPDATE "Wallet"
SET "available" = "available" - $amount
WHERE "userId" = $userId
  AND "available" >= $amount
RETURNING *;
```

### Lock Funds
```sql
UPDATE "Wallet"
SET "available" = "available" - $amount,
    "locked" = "locked" + $amount
WHERE "userId" = $userId
  AND "available" >= $amount
RETURNING *;
```

### Unlock Funds
```sql
UPDATE "Wallet"
SET "locked" = "locked" - $amount,
    "available" = "available" + $amount
WHERE "userId" = $userId
  AND "locked" >= $amount
RETURNING *;
```

These patterns prevent read-modify-write race conditions.

## Idempotency via Unique Constraints
The ledger enforces:
```text
UNIQUE(reference, type)
```

This means:
- the same business reference cannot post the same event type twice,
- retries can safely detect prior completion,
- duplicate execution attempts become conflict signals instead of double side effects.

## Re-Entrancy Guards
For governed request execution:
- check request `status`,
- check request `executed`,
- check for existing ledger entries by request reference,
- rely on unique ledger constraint as final safety net.

## Idempotency Patterns

### Client-Supplied Reference
For deposit/withdraw/transfer-like operations, accept a stable `reference` from the caller or generated workflow.

### Request-Scoped Execution
Use `request.id` as the reference for all execution ledger rows tied to that request.

### Duplicate Insert Handling
If ledger insert throws a unique-constraint violation for the same `reference,type`:
- treat as already processed if preceding steps are known safe,
- mark workflow complete if necessary,
- do not repeat side effects.

## Transaction Rules
Use transactions whenever an action spans multiple writes:
- wallet + ledger + audit,
- loan + wallet + surety,
- request + approvals + execution.

## Safe Retry Semantics
A client retry after timeout should produce one of these outcomes:
- success with newly completed result,
- success indicating already processed state,
- deterministic conflict if input changed under same reference.

It must never produce duplicated money movement.

## Recommended Database Constraints
- `UNIQUE(reference, type)` on `LedgerEntry`
- `UNIQUE(requestId, approverId)` on `Approval`
- `CHECK(available >= 0)` on `Wallet`
- `CHECK(locked >= 0)` on `Wallet`
- optional explicit loan state constraints

## Testing Requirements
Must include concurrency-focused integration tests for:
- dual withdrawal on same wallet,
- 3 concurrent approvals racing to execute once,
- duplicate loan disbursement attempt,
- duplicate surety release attempt,
- replay of same reference causing no duplicate ledger rows.
