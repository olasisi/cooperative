# Prompt 009: Audit Trail & Traceability Framework

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Defines immutable audit logging, action taxonomy, traceability rules, and recommended query patterns for operational and compliance visibility.

## Purpose
The audit framework records who did what, to which business object, with what payload, and when. It complements but does not replace the financial ledger. The ledger explains money movement; the audit log explains user and system behavior.

## AuditLog Model
Core fields:
- `id`
- `actionType`
- `initiatorId`
- `details` (structured JSON)
- `createdAt`
- target: `cooperativeId`, `requestId`, correlation id if needed

## Required Action Types
The following actions must be supported and consistently named:
- `WALLET_DEPOSIT`
- `WALLET_WITHDRAW`
- `TRANSFER`
- `LOAN_CREATED`
- `LOAN_DISBURSED`
- `LOAN_REPAID`
- `SURETY_PLEDGED`
- `SURETY_RELEASED`
- `REQUEST_APPROVED`
- `REQUEST_REJECTED`
- `REQUEST_EXECUTED`

Recommended supporting actions:
- `REQUEST_CREATED`
- `REQUEST_THRESHOLD_MET`
- `REQUEST_EXECUTION_SKIPPED`
- `REQUEST_EXECUTION_IDEMPOTENT`
- `AUTH_LOGIN_SUCCESS`
- `AUTH_LOGIN_FAILURE`
- `CONFIG_CHANGED`

## Audit Event Requirements
Every audit event should include enough context in `details` to answer:
- what domain object changed?
- what amount was involved?
- who else was affected?
- what reference or request linked the action?
- why did the system accept or reject the action?

Example details payload:
```json
{
  "requestId": "req_123",
  "loanId": null,
  "userId": "user_abc",
  "amount": "1000",
  "reference": "req_123",
  "note": "threshold reached"
}
```

## Immutability Guarantees
- Audit rows are append-only.
- No update/delete API exists for audit logs.
- Corrections are represented by new audit entries describing the correction.
- System clock and database timestamps should be trusted and standardized in UTC.

## Traceability Chain
A complete financial trail should allow navigation across:
- authenticated actor → `User`
- governed action → `Request`
- admin decisions → `Approval`
- financial effect → `LedgerEntry`
- business obligation → `Loan` / `Surety`
- operational evidence → `AuditLog`

## Query Patterns

### By Actor
Find all actions initiated by a specific admin or member:
```text
where initiatorId = :userId
order by createdAt desc
```

### By Request
Trace full lifecycle of a governed request:
```text
where details.requestId = :requestId
order by createdAt asc
```

### By Loan
Inspect all events involving a loan:
```text
where details.loanId = :loanId
order by createdAt asc
```

### By Action Type
Review all sensitive operations of a class:
```text
where actionType in ('REQUEST_EXECUTED', 'LOAN_DISBURSED')
```

### By Time Window
Support operational incident review:
```text
where createdAt between :start and :end
```

## Recommended Indexing
- index on `actionType`
- index on `initiatorId`
- index on `createdAt`
- if tenant-aware, composite index on `(cooperativeId, createdAt)`
- for frequent JSON lookups, extract selected foreign keys into first-class columns or add JSONB indexes

## Logging Design Rules
- Use structured JSON only; do not store free-form blobs alone.
- Avoid storing secrets, tokens, or plaintext passwords.
- Include business identifiers instead of dumping full object snapshots when unnecessary.
- Keep `details` deterministic enough for automated querying.

## Operational Uses
- dispute resolution,
- fraud review,
- concurrency anomaly diagnosis,
- admin oversight,
- external audit preparation,
- reconciliation support.

## Testing Expectations
Integration tests should assert that sensitive actions create audit rows with expected `actionType` and core identifiers.
