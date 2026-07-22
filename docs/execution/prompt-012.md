# Prompt 012: Error Handling & Status Code Standards

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Defines the error contract, status mapping, middleware behavior, and distinction between operational and programming errors.

## Error Handling Goals
- predictable client behavior,
- minimal leakage of internals,
- strong observability,
- correct HTTP semantics,
- safe failure under financial operations.

## Standard Error Response Format
Recommended envelope:
```json
{
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Insufficient available balance",
    "details": {},
    "requestId": "req_trace_id"
  }
}
```

Current implementation returns `{ "error": "message" }`. This should evolve to the structured format above while maintaining backward compatibility where necessary.

## Error Categories

### Validation Errors
Client sent missing, malformed, or unsupported input.
- HTTP: `400 Bad Request`
- Examples: missing amount, invalid action, missing password.

### Authentication Errors
Client is not authenticated or token is invalid.
- HTTP: `401 Unauthorized`
- Examples: missing bearer token, expired JWT.

### Authorization Errors
Client is authenticated but not permitted.
- HTTP: `403 Forbidden`
- Examples: member hitting admin endpoint, proposer approving own request.

### Not Found Errors
Target resource does not exist or is outside tenant scope.
- HTTP: `404 Not Found`
- Examples: unknown loan, missing wallet.

### Conflict Errors
Request collides with existing unique state.
- HTTP: `409 Conflict`
- Examples: duplicate email, duplicate phone, duplicate idempotency reference.

### Business Rule Errors
Input is syntactically correct but violates domain rules.
- HTTP: `400` or `422`
- Examples: insufficient surety, request not pending, loan already disbursed.

### Infrastructure Errors
Unexpected DB/network/runtime failure.
- HTTP: `500 Internal Server Error`
- Examples: Prisma outage, serialization failure not handled cleanly.

## Status Code Mapping
- `400` → validation/domain precondition failures
- `401` → invalid credentials/token
- `403` → role or ownership violation
- `404` → missing resource
- `409` → uniqueness/idempotency conflict
- `422` → optional richer semantic validation category
- `500` → unexpected server exceptions

## Middleware Design

### Route Layer
Routes should:
- validate minimal required fields,
- call service modules,
- `next(err)` for failures.

### Service Layer
Services should throw rich errors with:
- `status`
- `code`
- human-readable message
- optional machine-readable details

### Global Error Handler
Responsibilities:
- log unexpected errors,
- normalize response shape,
- honor explicit `err.status` / `err.code`,
- hide stack traces in production,
- attach trace or correlation id where available.

## Operational vs Programming Errors

### Operational Errors
Expected failures arising from real usage.
Examples:
- invalid token,
- insufficient funds,
- duplicate approval,
- missing request.

These should be handled gracefully and returned with explicit status codes.

### Programming Errors
Bugs or broken assumptions.
Examples:
- undefined variables,
- schema mismatch,
- impossible state transitions,
- null dereference.

These should:
- log at error severity,
- return generic `500`,
- trigger investigation.

## Financial Failure Rules
- If money movement fails mid-flow, transaction must roll back.
- Do not return success if only audit logging failed silently for a critical path; future hardening should include transactionally consistent audit behavior for the highest-risk operations.
- Distinguish duplicate retry success from genuine failure where idempotency applies.

## Recommended Error Codes
- `INVALID_CREDENTIALS`
- `TOKEN_INVALID`
- `TOKEN_EXPIRED`
- `FORBIDDEN`
- `PROPOSER_CANNOT_APPROVE_OWN_REQUEST`
- `REQUEST_NOT_PENDING`
- `DUPLICATE_APPROVAL`
- `INSUFFICIENT_FUNDS`
- `INSUFFICIENT_SURETY`
- `LOAN_ALREADY_DISBURSED`
- `WALLET_NOT_FOUND`
- `IDEMPOTENCY_CONFLICT`
- `INTERNAL_ERROR`

## Testing Requirements
- assert exact status codes for common failures,
- ensure protected routes return `401` without token,
- ensure authorization failures return `403`,
- ensure domain conflicts return non-500 statuses,
- ensure unexpected exceptions are normalized.
