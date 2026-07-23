# Prompt 011: API Design Principles & REST Conventions

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Defines REST conventions, endpoint grouping, HTTP semantics, payload standards, and pagination/filtering rules for the cooperative platform API.

## API Design Goals
- predictable URLs,
- standard HTTP status usage,
- explicit resource ownership,
- easy client integration,
- safe expression of governed operations.

## Base Path
```text
/api
```

## Resource Groups
- `/api/auth`
- `/api/wallets`
- `/api/loans`
- `/api/sureties`
- `/api/requests`
- `/api/approvals`

## URL Patterns

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`

### Wallets
- `GET /api/wallets/balance`
- `POST /api/wallets/deposit`
- `POST /api/wallets/withdraw`
- `POST /api/wallets/lock`
- `POST /api/wallets/unlock`

### Loans
- `POST /api/loans`
- `GET /api/loans`
- `GET /api/loans/:id`
- `POST /api/loans/:id/disburse`
- `POST /api/loans/:id/repay`

### Sureties
Preferred plural form:
- `POST /api/sureties/pledge`
- `POST /api/sureties/release`

Current code uses singular route prefix `/api/surety`; documentation should standardize on plural while preserving backward compatibility during migration.

### Requests
- `POST /api/requests`
- `GET /api/requests`
- `GET /api/requests/:id`

### Approvals
- `POST /api/approvals/:requestId`

## HTTP Method Semantics
- `GET` – read-only retrieval
- `POST` – create resource or trigger controlled action
- future `PATCH` – partial metadata updates on mutable administrative resources only
- avoid `PUT` for financial resources unless full replacement semantics are truly supported
- never use `DELETE` for immutable financial or audit records

## Request Format
- `Content-Type: application/json`
- Authorization header for protected routes:
```text
Authorization: ******
```
- Money amounts transmitted as strings to preserve decimal precision.

## Response Format
Success payloads should be JSON objects, not mixed primitives.

### Recommended Success Envelope
```json
{
  "data": {},
  "meta": {}
}
```

Current implementation often returns raw objects; future standardization should move toward the envelope above without breaking clients abruptly.

## Status Code Standards
- `200 OK` – successful retrieval/action
- `201 Created` – successful creation
- `400 Bad Request` – validation or state input error
- `401 Unauthorized` – missing/invalid auth
- `403 Forbidden` – authenticated but not allowed
- `404 Not Found` – resource absent or hidden by scope
- `409 Conflict` – duplicate identity or idempotency conflict
- `422 Unprocessable Entity` – semantic validation failure when adopted
- `500 Internal Server Error` – unexpected server fault

## Pagination Rules
List endpoints should support:
- `limit` (default 50, max 100)
- `cursor` or `page`
- optional `sort`

Recommended response:
```json
{
  "data": [],
  "meta": {
    "limit": 50,
    "nextCursor": null,
    "count": 50
  }
}
```

## Filtering Rules
Examples:
- `GET /api/requests?status=PENDING`
- `GET /api/loans?borrowerId=...`
- `GET /api/audit?actionType=REQUEST_EXECUTED&from=...&to=...`

All filters must be tenant-scoped and validated.

## Idempotency Guidance
For non-GET operations that may be retried, prefer either:
- explicit body `reference`, or
- `Idempotency-Key` header mapped to business reference.

## Example Payloads

### Register
```json
{
  "email": "member@example.com",
  "fullName": "Jane Doe",
  "password": "strong-password"
}
```

### Login Response
```json
{
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "user": {
      "id": "user_1",
      "role": "MEMBER"
    }
  }
}
```

### Approval Action
```json
{
  "action": "approve",
  "note": "Threshold approval granted"
}
```

## API Design Rules
- Use nouns for resources.
- Use sub-actions only when they represent domain commands (`disburse`, `repay`).
- Keep error responses consistent.
- Avoid leaking stack traces.
- Prefer plural route names for collections.
- Document deprecated endpoints before removal.
