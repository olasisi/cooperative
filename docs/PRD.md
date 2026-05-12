# Product Requirements Document (PRD)

## Product
Cooperative Society Management Platform (starter).

## Objective
Provide a secure, approval-driven financial operations platform for cooperative societies with strict transaction integrity, strong auditability, and RBAC.

## Non-Negotiable Rules
1. Sensitive financial actions must follow: `PROPOSED -> REVIEWED -> APPROVED -> EXECUTED -> LOGGED`.
2. No direct wallet balance editing.
3. Financial and audit records are immutable after approval/execution.
4. Multi-admin approval threshold is configurable.
5. No self-approval for sensitive requests.
6. Fraud prevention and transaction integrity are top priority.

## Primary Roles
- Member
- Admin
- Super Admin
- Auditor

## Key Modules
- Auth and session security
- User/cooperative management
- Wallet and immutable ledger
- Loan and surety management
- Request + approvals workflow
- Audit logs
- Notifications
- Settings and policy controls

## Success Criteria for Starter
- Modular codebase scaffolded for frontend/backend/shared contracts.
- Foundational schema and docs for production implementation.
- API + module boundaries clearly defined.
