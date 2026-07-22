
# Prompt 059: High-Level Design (HLD)

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
High-level design for the cooperative platform covering architecture, components, key flows, dependencies, and scale strategy.

## System Architecture Overview
The platform is a stateless Express.js API deployed behind an API ingress layer and backed by PostgreSQL through Prisma ORM. Authentication is JWT-based. Business domains are separated into modules for auth, wallets, loans, surety, requests, approvals, and audit logging. The design favors atomic financial writes, row-level concurrency protection for sensitive execution paths, and operational simplicity for MVP.

### Architecture Principles
- **Stateless API tier** for horizontal scale.
- **Single source of truth** in PostgreSQL.
- **Business-rule enforcement in service modules**.
- **Immutable financial evidence** through ledger + audit logs.
- **Least privilege** via role-based access control.

## Component Diagram
```mermaid
flowchart LR
    Client[Client Applications / Admin Portal] --> APIGW[API Gateway / Ingress]
    APIGW --> API[Express.js Application]
    API --> AUTH[Auth Module]
    API --> WALLET[Wallet Module]
    API --> LOANS[Loan Module]
    API --> SURETY[Surety Module]
    API --> APPROVALS[Approval Module]
    API --> AUDIT[Audit Module]
    API --> PRISMA[Prisma ORM]
    PRISMA --> DB[(PostgreSQL)]
```

## Major Components
| Component | Responsibility |
| --- | --- |
| Client | Sends authenticated API requests for member and admin actions |
| API Gateway | TLS termination, rate limiting, WAF policy, routing, observability enrichment |
| Express App | REST API host, request validation, auth middleware, domain orchestration |
| Prisma ORM | Data access abstraction, transactions, raw SQL for atomic balance updates |
| PostgreSQL | System of record for users, wallets, ledger, requests, approvals, loans, sureties, audit logs, settings |
| Monitoring Stack | Metrics, logs, tracing, alerts |

## Key Design Decisions
1. **JWT for authentication**
   - Keeps API tier stateless.
   - Simplifies scale-out and zero-downtime deployment.
2. **PostgreSQL as transactional core**
   - Strong consistency is required for balances, approvals, and loan state.
3. **Prisma + targeted raw SQL**
   - Prisma provides maintainability; raw SQL is used where atomic `UPDATE ... RETURNING` or `FOR UPDATE` locking is essential.
4. **Double-entry style ledger evidence**
   - Every financial mutation is traceable via reference, type, before balance, and after balance.
5. **Threshold-based approvals**
   - Sensitive actions are executed only after configurable admin consensus.
6. **Audit trail on privileged events**
   - Security and operational review depend on structured audit records.

## Data Flow Diagrams
### Deposit Flow
```mermaid
sequenceDiagram
    participant Admin
    participant API as Express API
    participant Wallet as Wallet Module
    participant DB as PostgreSQL
    participant Audit as Audit Log

    Admin->>API: POST /api/wallets/deposit
    API->>Wallet: validate role and payload
    Wallet->>DB: update Wallet.available += amount
    Wallet->>DB: insert LedgerEntry(DEPOSIT)
    Wallet->>Audit: record WALLET_DEPOSIT
    Wallet-->>API: updated balances
    API-->>Admin: 200 OK
```

### Loan Lifecycle Flow
```mermaid
sequenceDiagram
    participant Member
    participant Admin
    participant API as Express API
    participant Loan as Loan Module
    participant Surety as Surety Module
    participant DB as PostgreSQL

    Member->>API: POST /api/loans
    API->>Loan: create loan(outstanding = amount)
    Loan->>DB: insert Loan
    Member->>API: POST /api/sureties/pledge
    API->>Surety: lock pledged funds
    Surety->>DB: update Wallet + insert Surety + LedgerEntry
    Admin->>API: POST /api/loans/{id}/disburse
    API->>Loan: verify pledged sum >= loan amount
    Loan->>DB: transaction(credit wallet, insert ledger, mark disbursed)
    Member->>API: POST /api/loans/{id}/repay
    API->>Loan: debit borrower wallet and reduce outstanding
    Loan->>DB: if outstanding <= 0 release sureties
```

### Approval Flow
```mermaid
sequenceDiagram
    participant Proposer
    participant Admin1
    participant Admin2
    participant API as Express API
    participant Approval as Approval Module
    participant DB as PostgreSQL

    Proposer->>API: POST /api/requests
    API->>DB: insert Request(status=PENDING)
    Admin1->>API: POST /api/approvals/{requestId}/approve
    API->>Approval: create Approval #1
    Approval->>DB: count approvals = 1
    Approval-->>API: request remains PENDING
    Admin2->>API: POST /api/approvals/{requestId}/approve
    API->>Approval: create Approval #2
    Approval->>DB: SELECT Request FOR UPDATE
    Approval->>DB: re-count approvals inside transaction
    Approval->>DB: execute single winning action
    Approval->>DB: mark Request EXECUTED
```

## External Dependencies
| Dependency | Usage |
| --- | --- |
| PostgreSQL | Primary transactional datastore |
| Node.js 20 runtime | Application execution environment |
| Prisma Client | ORM and transaction boundary |
| JSON Web Tokens | Access and refresh token handling |
| bcrypt | Password hashing |
| GitHub Actions | CI/CD orchestration |
| AWS / Kubernetes platform | Production deployment targets |
| Prometheus / Grafana / CloudWatch / ELK | Observability |

## Scalability Approach
### API Tier
- Run multiple stateless API replicas behind a load balancer.
- Use HPA/ECS autoscaling based on CPU, memory, and request latency.
- Enforce idempotency and concurrency safety at the database layer to avoid cross-node race conditions.

### Database Tier
- Start with a single PostgreSQL primary for MVP.
- Add read replicas for analytics and reporting workloads.
- Tune connection pools and use PgBouncer/RDS Proxy when concurrent connection growth becomes material.

### Future Enhancements
- Introduce Redis for short-lived caching and configuration reads.
- Move long-running reporting and notifications to async workers.
- Separate audit and analytics pipelines from transactional workloads.

## Availability & Resilience Considerations
- Multi-AZ database deployment for production.
- Rolling or blue/green API deployments.
- Daily backups and PITR enabled.
- Health checks at load balancer, orchestration, and app layers.
- Alerting on error rate, latency, saturation, and replication lag.
