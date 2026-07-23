# Prompt 016: Testing Strategy & Quality Gates

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Defines the testing strategy, preferred emphasis on integration tests, isolation practices, PostgreSQL test setup expectations, Jest execution mode, and quality gates for release readiness.

## Testing Philosophy
This platform is finance- and workflow-heavy. The highest value tests are integration tests that exercise real database behavior, transactions, concurrency, and state transitions.

## Test Pyramid
- **Integration tests (primary):** wallet, approvals, loans, surety, auth, audit.
- **Unit tests (selective):** pure helpers, validators, token utilities.
- **End-to-end tests (later):** critical API flows from HTTP boundary through persistence.

## Why Integration Over Pure Unit Tests
Critical business risks live in:
- SQL predicates,
- Prisma transactions,
- concurrent execution behavior,
- unique constraints,
- cross-module workflow orchestration.

These cannot be validated adequately by isolated mocks alone.

## Existing Coverage Areas
The repository already includes tests for:
- wallet operations,
- approval workflow,
- approval concurrency,
- loan lifecycle.

These should remain the foundation and expand to auth, surety-specific edges, audit assertions, and tenant isolation.

## Test Isolation Rules
- Use a dedicated PostgreSQL test database.
- Do not share production or development data.
- Clean up created rows reliably.
- Prefer `beforeEach` or deterministic fixture setup for strong isolation.
- Where full cleanup per test is expensive, use per-suite isolated fixtures plus targeted teardown.

## Recommended Cleanup Strategy
Preferred order for cleanup in tenant-integrated flows:
1. approvals
2. sureties
3. requests
4. loans
5. ledger entries
6. audit logs
7. wallets
8. users
9. settings created by tests

## PostgreSQL Test Instance
Tests should run against a real PostgreSQL instance because the system depends on:
- decimal arithmetic,
- transaction behavior,
- row locking,
- `RETURNING`,
- unique constraints.

SQLite or in-memory substitutes are not acceptable for concurrency or ledger correctness tests.

## Jest Configuration
Recommended Jest settings:
- Node environment
- integration test timeout higher than unit default
- explicit setup file for DB environment
- serial execution for DB-contention-sensitive suites

Example direction:
```json
{
  "testEnvironment": "node",
  "testTimeout": 30000,
  "maxWorkers": 1
}
```

## `runInBand` Guidance
Use `jest --runInBand` in CI for integration suites that share database state or depend on transaction timing. This reduces flaky failures in concurrency-sensitive workflows.

## Required Test Categories

### Wallet
- deposit success
- withdraw success
- insufficient funds rejection
- lock/unlock behavior
- concurrent withdrawal double-spend prevention

### Approvals
- proposer cannot self-approve
- threshold enforcement
- rejection finality
- rollback on failed execution
- concurrent approvals execute once

### Loans
- create loan
- disbursement blocked without sufficient surety
- successful disbursement with surety
- partial repayment
- full repayment
- surety release on completion
- insufficient repayment funds rejection

### Auth
- register creates wallet
- duplicate email/phone rejection
- login success/failure
- refresh token flow
- protected route access control

### Multi-Tenancy
- tenant data isolation
- admin scoped to own cooperative
- cross-tenant request execution blocked

### Audit / Ledger
- audit row creation on sensitive actions
- immutable ledger insert behavior
- idempotent duplicate reference handling

## Coverage Requirements
Suggested baseline:
- 80%+ line coverage on service modules
- 100% coverage for critical concurrency/idempotency branches where feasible
- mandatory integration coverage for all money-moving flows

Coverage numbers are secondary to risk coverage; no financial workflow should ship untested because the global percentage looks healthy.

## Quality Gates
A change is release-ready only if:
- all relevant tests pass,
- no flaky concurrency tests are ignored,
- migration and schema changes are validated on PostgreSQL,
- audit and ledger side effects are asserted for critical flows,
- secrets are not exposed in fixtures,
- tenant scoping is preserved.

## CI Recommendations
- provision isolated test database,
- run migrations before tests,
- run Jest in serial for integration suites,
- collect coverage artifacts,
- fail build on test failures or schema drift.
