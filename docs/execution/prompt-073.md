
# Prompt 073: UAT Test Plan

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
User acceptance testing plan with objectives, scope, environments, mapped user stories, module-specific test cases, defect handling, and sign-off criteria.

## Test Objectives
- Validate that member and admin workflows meet business expectations.
- Confirm balances, loan states, approvals, and surety handling behave correctly.
- Prove operational readiness for controlled go-live.

## Scope
### In Scope
- Authentication and authorization
- Wallet balance, deposit, withdrawal, transfer-governance behavior
- Loan creation, disbursement, repayment
- Surety pledge and release
- Request submission and approval/rejection
- Audit and operational visibility for key flows

### Out of Scope
- Native mobile UI
- SMS notifications
- Third-party payment integrations
- Non-functional deep load testing (handled separately)

## Test Environments
| Environment | Purpose |
| --- | --- |
| UAT | Business process validation with production-like configuration |
| Staging | Final technical verification before go-live |

## User Stories Mapped to Test Cases
| User Story | Test Case IDs |
| --- | --- |
| As a member, I can register and log in securely | AUTH-01, AUTH-02 |
| As an admin, I can fund a member wallet | WAL-01 |
| As a member, I can withdraw only available funds | WAL-02, WAL-03 |
| As a member, I can request a loan | LOAN-01 |
| As a member surety, I can lock funds as collateral | SUR-01 |
| As an admin, I can disburse only sufficiently secured loans | LOAN-02, LOAN-03 |
| As a borrower, I can repay a loan and trigger surety release | LOAN-04, SUR-02 |
| As an admin, I can approve or reject governed requests | APP-01, APP-02, APP-03 |

## Test Cases by Module
### Auth
| ID | Scenario | Expected Result |
| --- | --- | --- |
| AUTH-01 | Register with valid email + password | User created and wallet provisioned |
| AUTH-02 | Login with valid credentials | Access and refresh tokens returned |
| AUTH-03 | Login with invalid password | 401 Unauthorized |

### Wallet
| ID | Scenario | Expected Result |
| --- | --- | --- |
| WAL-01 | Admin deposits funds into member wallet | Available balance increases; audit recorded |
| WAL-02 | Member withdraws within available balance | Withdrawal succeeds; ledger entry created |
| WAL-03 | Member attempts over-withdrawal | Request rejected; balance unchanged |
| WAL-04 | Concurrent withdrawal attempts | Only safe amount is debited once per atomic rule |

### Loans
| ID | Scenario | Expected Result |
| --- | --- | --- |
| LOAN-01 | Create loan for borrower | Loan created with outstanding = amount |
| LOAN-02 | Disburse without enough surety | Disbursement blocked |
| LOAN-03 | Disburse with enough surety | Borrower wallet credited; loan marked disbursed |
| LOAN-04 | Repay in full | Outstanding reaches zero; `repaidAt` set; surety released |

### Approvals
| ID | Scenario | Expected Result |
| --- | --- | --- |
| APP-01 | Create request and receive first approval | Request remains PENDING |
| APP-02 | Reach approval threshold | Request executes once and moves to EXECUTED |
| APP-03 | Proposer attempts self-approval | Request denied |
| APP-04 | Admin rejects request | Request moves to REJECTED |

### Surety
| ID | Scenario | Expected Result |
| --- | --- | --- |
| SUR-01 | Member pledges surety | Available decreases, locked increases, surety record created |
| SUR-02 | Admin or repayment releases surety | Locked decreases, available increases, release recorded |

## Acceptance Criteria per Feature
- **Auth:** secure login works; invalid credentials are blocked.
- **Wallet:** all balance mutations are reflected correctly and auditable.
- **Loans:** disbursement requires adequate surety; repayment updates outstanding accurately.
- **Approvals:** threshold logic, self-approval prevention, and rejection behavior all work.
- **Surety:** pledge and release mutate balances correctly.

## Defect Management Process
1. Log defects with severity, steps, evidence, and impacted user story.
2. Triage daily during UAT.
3. Retest fixes in UAT after deployment.
4. Close only after tester confirmation and regression check.

## Sign-Off Criteria
- All critical and high-severity defects closed or explicitly accepted.
- Core user stories pass end-to-end.
- Product owner, operations lead, and engineering lead approve go-live readiness.
