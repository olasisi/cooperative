# Module Breakdown / Implementation Roadmap

## Phase 1 - Starter (Current)
- Monorepo scaffold with backend/frontend/contracts/docs.
- Shared enums and core financial workflow states.
- Backend modules + health endpoint.
- Frontend route shell + workflow badges.
- Starter SQL schema.

## Phase 2 - Core Implementation
- JWT + refresh + OTP auth flows.
- Request creation/review/approval/execute APIs.
- DB migrations and repositories.
- Atomic execution service writing ledger + audit.

## Phase 3 - Operations & Fraud Controls
- Rule engine for thresholds by action type.
- Anomaly detection hooks.
- Device/session risk scoring.
- Notification orchestration.

## Phase 4 - Reporting & Compliance
- Cooperative statements and loan performance reports.
- Audit export and regulator-ready logs.
- Admin policy UI for thresholds and controls.
