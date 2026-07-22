# Prompt 010: Multi-Tenancy & Tenant Isolation Strategy

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Defines tenant isolation for cooperative-scoped data, required `cooperativeId` propagation, and authorization scoping for members and admins.

## Goal
A single platform instance may serve multiple cooperative societies. Tenant isolation ensures one cooperative cannot access another cooperative’s identities, wallets, loans, requests, approvals, settings, or audit trail.

## Tenant Model
- A tenant represents one cooperative society.
- Each authenticated user belongs to exactly one cooperative in normal operation.
- All cooperative-scoped records must carry `cooperativeId`.

## Required `cooperativeId` Coverage
`cooperativeId` should exist on all tenant-scoped models:
- `User`
- `Wallet`
- `LedgerEntry`
- `Request`
- `Approval` (or derive from request while still indexing for queries)
- `Loan`
- `Surety`
- `AuditLog`
- `Setting`

## Data Isolation Rules
- Every query must include tenant scope, directly or indirectly.
- Every create operation must set `cooperativeId` from authenticated context, not user-supplied input alone.
- Every update/delete-equivalent business action must confirm tenant ownership before mutation.
- Background jobs must carry tenant context explicitly.
- Reports must aggregate only within tenant boundary unless run by super-admin tooling.

## Admin Scoping
An `ADMIN` is powerful only inside their cooperative.

Admins may:
- approve requests from their tenant,
- deposit into wallets in their tenant,
- disburse loans within tenant,
- release sureties within tenant.

Admins may not:
- read or mutate another tenant’s data,
- approve cross-tenant requests,
- create ledger entries against another tenant’s wallets.

## Member Scoping
A `MEMBER` may:
- view own wallet and loans,
- propose requests in own tenant,
- repay own loans,
- pledge surety according to tenant policy.

A member may not:
- access another member’s private financial records unless explicitly allowed by role and policy,
- act across cooperative boundaries.

## Super-Admin Scoping
A super-admin is outside normal tenant constraints only for platform governance. Their cross-tenant actions must:
- require explicit route segregation,
- be heavily audited,
- avoid day-to-day financial operations.

## Request Scoping
The current schema already includes `cooperativeId` on `Request`. This field must become a mandatory anchor for governance workflows:
- all approvals must inherit or validate against the request’s tenant,
- execution must only touch wallets and users from the same tenant,
- request metadata must not reference cross-tenant user ids.

## Middleware Strategy
Add tenant middleware after authentication:
1. derive `cooperativeId` from authenticated user,
2. attach to `req.tenant`,
3. enforce that path/body/query identifiers resolve within tenant scope,
4. apply automatic Prisma where-clause scoping in service layer.

## Database Strategy
- Add not-null `cooperativeId` to tenant-scoped tables.
- Backfill existing records before enforcing non-null constraints.
- Add composite indexes such as `(cooperativeId, createdAt)`.
- Add unique constraints scoped by tenant where appropriate, e.g. `(cooperativeId, key)` for settings.

## Query Examples

### Member wallet lookup
```text
find Wallet where userId = req.user.id and cooperativeId = req.user.cooperativeId
```

### Admin request list
```text
find Request where cooperativeId = req.user.cooperativeId order by createdAt desc
```

### Request execution guard
```text
ensure request.cooperativeId == payer.cooperativeId == recipient.cooperativeId == approver.cooperativeId
```

## Testing Requirements
Must cover:
- member cannot fetch another tenant’s data,
- admin cannot approve another tenant’s request,
- request cannot execute across tenants,
- tenant-scoped settings do not leak globally,
- audit and ledger queries are tenant-filtered.
