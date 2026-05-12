# System Architecture

## High-Level
- Frontend: React SPA for member/admin workflows.
- Backend: Modular Express API with strict workflow and RBAC middleware.
- Shared Contracts: Shared enums/types for status, roles, transaction classes.
- Database: PostgreSQL with append-only ledger + audit design.

## Architectural Principles
- Command model for financial mutations via request objects.
- Event/audit orientation for traceability.
- Idempotent write endpoints for retry safety.
- Transaction boundaries around approval and execution operations.
- Policy-driven approval configuration in settings.

## Sensitive Action Lifecycle
1. `PROPOSED`: request created.
2. `REVIEWED`: at least one authorized review.
3. `APPROVED`: threshold reached (excluding proposer).
4. `EXECUTED`: ledger entries committed atomically.
5. `LOGGED`: audit record persisted.

## Security Baseline
- RBAC guard on privileged endpoints.
- No self-approval rule in approvals domain service.
- Idempotency key concept middleware.
- Append-only ledger and immutable audit records.
