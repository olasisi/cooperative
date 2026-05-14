# Database Schema Design

## Core Tables
- `cooperatives`
- `users`
- `wallets`
- `wallet_ledger_entries`
- `requests`
- `approvals`
- `loans`
- `sureties`
- `audit_logs`
- `notifications`
- `settings`
- `sessions`
- `otp_records`
- `devices`

## Design Notes
- Wallet balances are derived from `wallet_ledger_entries`, never manually edited.
- `requests.idempotency_key` enforces request deduplication.
- `approvals` has unique `(request_id, reviewer_user_id)` to prevent duplicate votes.
- `immutable` flags on ledger and audit emphasize append-only records.
- Timestamps exist on all records for traceability.

See `apps/backend/src/db/schema.sql` for starter SQL DDL.
