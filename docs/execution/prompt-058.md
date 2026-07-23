
# Prompt 058: Product Requirements Document (PRD)

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Production-ready PRD for the cooperative society management platform covering business context, users, scope, success criteria, and MVP constraints.

## Executive Summary
The cooperative society management platform digitizes core financial and governance processes for savings groups and staff cooperatives. The MVP provides secure member onboarding, JWT-based authentication, wallet and ledger operations, loan origination and repayment, surety pledge and release, multi-admin approvals for sensitive actions, and a complete audit trail. The product is designed to reduce manual reconciliation, eliminate opaque approval handling, and give administrators a governed operational workflow suitable for regulated financial operations.

## Problem Statement
Most cooperatives still operate through spreadsheets, paper approvals, and fragmented messaging channels. This creates five critical risks:

1. **Weak financial control**: deposits, withdrawals, and transfers are difficult to reconcile consistently.
2. **Opaque loan governance**: surety coverage, disbursement readiness, and repayment status are not visible in real time.
3. **Approval bottlenecks**: high-risk operations depend on ad hoc verbal or chat approvals with little traceability.
4. **Poor accountability**: audit evidence for who initiated, approved, rejected, or executed a transaction is often incomplete.
5. **Operational scalability limits**: manual workflows break down as membership, transaction volume, and admin concurrency increase.

The platform solves these issues by centralizing cooperative operations in a controlled backend with deterministic business rules, immutable audit records, and role-based access.

## Goals & Success Metrics
| Goal | Description | Success Metric |
| --- | --- | --- |
| Operational digitization | Replace manual handling of wallet, loan, surety, and approval workflows | 100% of member financial operations captured in system ledger |
| Faster approvals | Standardize multi-admin authorization for sensitive actions | 90% of requests resolved within 4 business hours |
| Accurate balances | Maintain dependable available vs locked wallet positions | 0 unreconciled balance mismatches in monthly close |
| Safer loan processing | Ensure disbursement occurs only when surety threshold is satisfied | 100% of disbursed loans have sufficient pledged surety |
| Audit readiness | Preserve full evidence trail for regulated review | 100% of privileged actions produce audit events |
| Member experience | Provide predictable access to balances and loan state | 95% of member self-service calls succeed without admin intervention |

### KPI Baselines for Go-Live
- Monthly active members using wallet features: **>70% of enrolled members**
- Failed privileged request execution rate: **<1% excluding policy rejections**
- Approval race-condition defects in production: **0**
- Loan repayment posting latency: **<1 minute end-to-end**

## User Personas
### Member
- Uses the platform to register, log in, review wallet balances, request loans, repay loans, and act as a surety.
- Needs predictable balances, quick response times, and confidence that funds cannot be double-spent.
- Permissions: self-service wallet access, loan requests, repayments, surety pledge, request submission.

### Admin
- Manages deposits, approves or rejects requests, disburses loans, releases sureties, and oversees member operations.
- Needs guardrails that prevent self-approval, duplicate approval, and unsafe execution.
- Permissions: privileged wallet operations, request review, loan disbursement, operational reporting.

### Super Admin
- A privileged admin represented in the MVP by `role=ADMIN` plus `isSuper=true`.
- Needs ability to override role checks, manage settings such as approval thresholds, and support incident response.
- Permissions: all admin actions plus elevated configuration and governance authority.

## Functional Requirements
### 1. Authentication & Identity
- Members and admins shall register with email or phone plus password.
- Passwords shall be hashed before persistence.
- Users shall authenticate using JWT access and refresh tokens.
- Role checks shall protect admin-only operations.
- Super admins shall bypass standard admin restrictions where explicitly permitted.

### 2. Wallet & Ledger Management
- Each registered user shall have exactly one wallet.
- Wallets shall track **available** and **locked** balances separately.
- Admins shall deposit funds into member wallets.
- Members shall withdraw from available balance only.
- Transfers requiring governance approval shall execute through request + approval workflow.
- Every balance mutation shall create ledger evidence with reference, type, amount, and before/after balances.

### 3. Loan Management
- Members or admins shall be able to create loan records for borrowers.
- Loans shall start with `outstanding = amount`.
- Loans shall not be disbursed until active surety coverage is at least the loan amount.
- Admin-only disbursement shall credit the borrower wallet and record a loan disbursement ledger entry.
- Repayments shall reduce outstanding balance and set `repaidAt` when fully settled.

### 4. Surety Management
- Members shall be able to pledge surety against a loan by locking funds.
- Surety pledge shall reduce available balance and increase locked balance atomically.
- Sureties shall be releasable by admins or by automated release after full loan repayment.
- Released sureties shall return locked funds to available balance and update the surety record.

### 5. Multi-Admin Approval Workflow
- Sensitive requests shall be created in `PENDING` state.
- The proposer shall not be allowed to approve or reject their own request.
- Each admin shall approve a request at most once.
- A configurable approval threshold (default: 2) shall control execution eligibility.
- When threshold is met, execution shall occur once even under concurrent approvals.
- Rejection shall immediately set the request to `REJECTED`.

### 6. Audit Trail
- The platform shall write audit events for registration-adjacent privileged actions, wallet operations, request lifecycle changes, loan events, and surety events.
- Audit records shall include action type, initiator, timestamp, and structured details payload.
- Audit data shall be queryable for operations, incident review, and compliance reporting.

## Non-Functional Requirements
| Category | Requirement |
| --- | --- |
| Security | JWT auth, hashed passwords, role-based authorization, secret management in environment variables, complete audit coverage |
| Availability | **99.9% monthly uptime** for production API excluding planned maintenance windows |
| Performance | **<200 ms p95** for standard read operations and **<500 ms p95** for write operations under normal load |
| Concurrency | Approval execution and wallet debits must be safe under concurrent requests and prevent double spending |
| Data Integrity | All financial mutations must be atomic and recoverable through ledger plus audit evidence |
| Observability | Structured logs, metrics, tracing, and alerting must be available before go-live |
| Scalability | Service must scale horizontally for stateless API workloads and vertically or via read replicas for database growth |
| Maintainability | Prisma schema remains authoritative for persistence contracts; APIs are documented via OpenAPI |

## Out of Scope
- Native mobile applications for iOS or Android.
- SMS notification workflows in the MVP.
- External payment gateway settlement.
- Member KYC document processing.
- Accounting exports to third-party ERP systems.
- Advanced collections, penalties, and interest accrual engines.

## Assumptions & Constraints
### Assumptions
- PostgreSQL is the system of record.
- JWT secrets and database credentials are managed securely outside source control.
- Cooperative operations are NGN-denominated for MVP.
- Administrators are trained on approval governance before production cutover.
- Existing test suite remains green and is executed in CI.

### Constraints
- Current backend is Express.js with Prisma ORM and PostgreSQL.
- MVP keeps the system API-only; no web frontend is assumed in this artifact.
- Current authorization model uses `role` plus `isSuper` rather than a dedicated `SUPER_ADMIN` enum.
- Availability and response-time targets depend on production-grade hosting, monitoring, and database sizing.
- Redis-backed caching/session optimization is optional for MVP but planned for scale.

## Release Readiness Definition
The MVP is considered ready for controlled launch when:
- all automated tests pass,
- OpenAPI, runbook, security, and recovery artifacts are approved,
- production secrets are configured,
- monitoring and alerting are active,
- approval threshold and admin assignments are verified,
- backup and rollback procedures are rehearsed.
