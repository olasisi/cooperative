# Prompt 001: Product Vision & Cooperative Governance Manifesto

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Defines the product vision, governance values, operational invariants, and stakeholder responsibilities for a cooperative society management platform built on immutable financial records and approval-driven execution.

## Product Vision Statement
Build a cooperative society management platform that makes member-owned finance transparent, rules-driven, auditable, and safe at scale. The platform must allow members and administrators to manage contributions, transfers, loans, sureties, and approvals without relying on informal spreadsheets, verbal authorizations, or manual balance edits.

The product exists to ensure that every material financial action is:
- proposed explicitly,
- authorized by the correct cooperative actors,
- executed atomically,
- recorded immutably, and
- traceable end-to-end.

## Governance Manifesto
1. **Money moves by rule, not by discretion.** Every transfer, withdrawal, loan disbursement, repayment, and surety movement must follow defined workflow rules.
2. **The ledger is the source of truth.** Wallet balances are derived operational state; ledger entries are historical truth.
3. **No silent changes.** All sensitive actions must leave an audit trail with actor, action type, payload, and timestamp.
4. **Approvals are first-class domain objects.** Cooperative governance is enforced in code, not merely documented in policy.
5. **Members are protected from unilateral action.** High-impact operations require threshold-based authorization.
6. **Execution must be safe under retries and concurrency.** A request may be observed many times but executed only once.
7. **Tenants must be isolated.** One cooperative must never read or mutate another cooperative's data.
8. **Operational simplicity must not weaken controls.** Administrative convenience never overrides immutability or traceability.

## Core Governance Principles

### Immutability
- Ledger entries are append-only.
- Audit logs are append-only.
- Executed requests are never reopened for mutation.
- Corrections are made by compensating entries, not destructive updates.

### Approval Lifecycle
- A governed action begins as a `Request`.
- A request remains `PENDING` until approval threshold is met or it is rejected.
- Threshold satisfaction may transition the request to `APPROVED` and immediately to `EXECUTED` when execution is eligible.
- Rejected requests are terminal.
- Executed requests are terminal and idempotent.

### No Direct Balance Edits
- Wallet balances must only change through domain services:
  - deposit,
  - withdraw,
  - transfer execution,
  - surety lock/release,
  - loan disbursement,
  - loan repayment.
- Direct SQL balance manipulation is forbidden outside controlled migration/repair procedures.

### Tenant Isolation
- All cooperative-scoped records must carry `cooperativeId`.
- Authorization checks must scope reads and writes to the authenticated user’s cooperative.
- Cross-tenant joins, reports, and admin actions are prohibited unless explicitly super-admin scoped.

### Atomic, Idempotent, Concurrency-Safe Operations
- Financial operations must complete fully or not at all.
- Retried requests must produce the same final state once a reference has already been consumed.
- Concurrent approval and execution attempts must resolve to a single winning execution path.

### Traceability
- Every financially relevant action must produce:
  - business request linkage,
  - ledger reference,
  - audit record,
  - actor identity,
  - timestamp,
  - tenant context.

## Cooperative Rules

### Membership Rules
- A member must have a unique identity within a cooperative.
- Each member has exactly one primary wallet.
- Membership start date is recorded and never backfilled silently.

### Administrative Rules
- Admins may perform privileged actions only within cooperative scope.
- An admin cannot approve or reject their own governed request.
- Super-admin capability exists only for platform governance and emergency support, not normal cooperative business.

### Financial Rules
- Every monetary movement must have a unique reference.
- Available balance cannot go below zero.
- Locked balance cannot go below zero.
- Surety locks reduce spendable funds but do not destroy ownership.
- Loan disbursement requires sufficient active surety coverage.
- Surety release occurs only when release conditions are satisfied.

### Request Governance Rules
- Requests must clearly identify intent, proposer, tenant, and execution metadata.
- Rejected requests cannot later execute.
- Executed requests cannot execute twice.
- Missing execution metadata must halt or safely skip execution with audit evidence.

## Stakeholder Definitions

### Member
A cooperative participant who owns a wallet, can propose requests, can borrow subject to policy, can pledge surety where allowed, and can view only their own tenant-scoped information.

### Admin
A cooperative officer who can approve or reject governed requests, seed deposits where policy allows, supervise wallet actions, and manage cooperative operations subject to threshold rules and auditability.

### Super Admin / Platform Operator
A platform-level operator with elevated capability used for tenant onboarding, break-glass support, configuration correction, and platform governance. In implementation, this may be represented by `isSuper=true` in addition to role-based checks.

### Borrower
A member acting in the context of a loan. Borrowers may create loan intents, receive disbursement after approval and surety satisfaction, and repay outstanding obligations.

### Surety Provider
A member who locks part of their wallet balance as collateral backing for a borrower’s loan. The provider retains ownership but loses immediate liquidity until release.

### Auditor / Compliance Officer
An internal or external reviewer who relies on immutable ledger and audit records to reconstruct what happened, who initiated it, who approved it, and when it executed.

## Non-Negotiable Product Invariants
- No ledger entry is edited or deleted.
- No executed request is re-executed.
- No approval threshold can be bypassed through direct endpoint access.
- No user can act outside tenant scope.
- No financial write occurs without an audit trail.
- No balance mutation occurs without a corresponding business reason and reference.

## Implementation Direction
These principles should drive service design, schema evolution, route protection, database constraints, operational runbooks, and test coverage. When implementation choices conflict with these principles, the principles win.
