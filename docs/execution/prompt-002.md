# Prompt 002: Security-First Principles & Immutability Rules

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Specifies the platform’s security baseline, immutable-record policy, audit requirements, no-bypass rules, cryptographic expectations, and secrets handling standards.

## Security Objectives
The platform protects cooperative funds, governance decisions, and member identity data. Security controls must prioritize:
- prevention of unauthorized access,
- prevention of unauthorized financial mutation,
- detection of suspicious activity,
- forensic traceability,
- resilience under retries and concurrent requests.

## Security Requirements

### Authentication Security
- Passwords must be hashed with bcrypt using a cost factor appropriate for the deployment environment.
- Access tokens must be short-lived.
- Refresh tokens must be signed with a separate secret.
- Token verification must happen on every protected request.
- Invalid, expired, or malformed tokens must fail closed with `401 Unauthorized`.

### Authorization Security
- Every protected endpoint must require authentication middleware.
- Sensitive endpoints must require explicit role checks.
- A proposer must never approve or reject their own request.
- Privileged actions must also be tenant-scoped.
- Super-admin behavior must be explicit, audited, and rare.

### Data Security
- Use PostgreSQL parameterized queries or Prisma query binding exclusively.
- Never interpolate untrusted input into raw SQL strings.
- Limit personally identifiable information in logs.
- Avoid returning internal implementation details in error messages.

## Immutability Rules

### Ledger Immutability
- `LedgerEntry` records are append-only.
- Ledger entries must never be edited or deleted through application logic.
- Reversals must be represented by new compensating entries with a new reference and linked business context.
- Unique `(reference, type)` prevents duplicate posting of the same event class.

### Audit Immutability
- `AuditLog` records are append-only.
- Audit events must never be overwritten to “clean up” history.
- Additional context may be appended as new audit rows, not merged into old ones.

### Request Finality
- `REJECTED` requests are terminal.
- `EXECUTED` requests are terminal.
- Any retry path after execution must return the already-final outcome without causing side effects.

## Audit Trail Requirements
Every privileged or financial action must write an audit log row containing at minimum:
- `actionType`,
- `initiatorId` when known,
- structured `details`,
- creation timestamp,
- tenant identifier once tenant-wide isolation is implemented.

Required audited events include:
- login success/failure if implemented,
- user registration,
- wallet deposits,
- withdrawals,
- surety pledge/release,
- loan creation/disbursement/repayment,
- request creation/approval/rejection/execution,
- threshold changes,
- super-admin interventions.

## No-Bypass Rules
- No endpoint may mutate wallet balances directly without calling the wallet/loan/surety execution service.
- No admin UI or script may bypass approval thresholds by updating request status manually.
- No operator may “fix” incorrect balances by editing wallet columns without compensating ledger and audit records.
- No background worker may execute a request unless it first validates request state, approvals, idempotency, and tenant scope.
- No direct database access path should exist for day-to-day operations outside migration and break-glass procedures.

## Encryption Standards

### In Transit
- Enforce HTTPS/TLS 1.2+ in all non-local environments.
- Terminate TLS at a trusted proxy or application ingress.
- Reject plaintext credentials over public networks.

### At Rest
- Database storage must use managed disk encryption or equivalent volume encryption.
- Backups must be encrypted.
- Secret values must never be committed to source control.

### Password Storage
- Store only bcrypt hashes; never store plaintext or reversible encrypted passwords.
- Password reset flows, when added, must use one-time tokens with TTL.

### Token Signing
- `JWT_SECRET` and `JWT_REFRESH_SECRET` must be independent values.
- Rotate secrets through controlled deployment, not ad hoc runtime edits.

## Secret Management
- Load secrets from environment variables or managed secret stores.
- Maintain `.env.example` with placeholders only.
- Never print secrets in logs, tests, or exception payloads.
- Rotate secrets immediately after suspected exposure.
- Separate secrets by environment: local, test, staging, production.

## Break-Glass Procedure Requirements
If emergency repair is required:
1. Open an incident record.
2. Limit operator access by least privilege.
3. Snapshot affected rows.
4. Record all changes in an incident audit trail.
5. Prefer compensating ledger and audit entries over direct mutation.
6. Review and approve repair after action.

## Secure Development Rules
- Add tests for every high-risk financial path.
- Review raw SQL carefully for concurrency and authorization implications.
- Treat duplicate execution as a security issue, not just a correctness issue.
- Include audit assertions in integration tests for governed flows.
- Run dependency and secret scanning in CI before deployment.

## Security Acceptance Checklist
A feature is not production-ready unless it:
- authenticates callers correctly,
- enforces authorization correctly,
- preserves immutability,
- emits audit logs,
- is safe under retries,
- is safe under concurrent execution,
- avoids secret leakage,
- fails closed on invalid state.
