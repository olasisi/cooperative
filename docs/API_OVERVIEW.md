# API Overview (Starter)

## Health
- `GET /health`

## Modules (Scaffold Endpoints)
- `GET /auth`
- `GET /users` (admin role required)
- `GET /wallets`
- `GET /loans`
- `GET /approvals`
- `GET /audit`
- `GET /settings`

## Planned Command Endpoints
- `POST /requests` create sensitive financial request (`PROPOSED`)
- `POST /requests/:id/review`
- `POST /requests/:id/approve`
- `POST /requests/:id/execute`
- `GET /requests/:id/audit-trail`

## Security and Integrity
- RBAC via role guard.
- Idempotency via `x-idempotency-key`.
- Approval threshold from settings/env.
- No self-approval policy enforced in approval service.
