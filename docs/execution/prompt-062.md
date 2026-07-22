
# Prompt 062: Database Schema Documentation

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Detailed schema documentation for all Prisma models, enums, constraints, indexes, relationships, and representative PostgreSQL DDL.

## Schema Overview
The cooperative platform uses PostgreSQL with Prisma as the authoritative schema layer. The schema is optimized for transactional correctness, traceability, and simple operational control for the MVP.

## Enums
### `Role`
| Value | Meaning |
| --- | --- |
| MEMBER | Standard cooperative member |
| ADMIN | Administrative operator |

### `RequestStatus`
| Value | Meaning |
| --- | --- |
| PENDING | Awaiting approvals |
| APPROVED | Threshold met but not yet finalized in some flows |
| REJECTED | Rejected by admin action |
| EXECUTED | Action completed and immutable |

## Models
### 1. User
**Purpose:** Stores member and administrator identity, role, and authentication data.

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | String | PK, UUID default | Primary identity |
| email | String? | Unique, nullable | Either email or phone is expected in practice |
| phone | String? | Unique, nullable | Alternate login/identity handle |
| fullName | String | Required | Display name |
| password | String | Required | Hashed password |
| role | Role | Default MEMBER | Authorization scope |
| isSuper | Boolean | Default false | Super-admin elevation flag |
| membershipStart | DateTime? | Nullable | Membership start date |
| createdAt | DateTime | Default now() | Record creation time |

**Indexes/Constraints**
- Primary key on `id`
- Unique index on `email`
- Unique index on `phone`

**Relationships**
- One-to-one with `Wallet`
- One-to-many as proposer of `Request`
- One-to-many to `Approval`

**Design Rationale**
- `isSuper` allows elevated authority without introducing a third enum value.
- Optional `email` and `phone` support flexible onboarding patterns.

### 2. Wallet
**Purpose:** Tracks member funds using available and locked partitions.

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | String | PK, UUID default | Wallet identifier |
| userId | String | Unique, FK -> User.id | Enforces one wallet per user |
| available | Decimal | Default 0 | Spendable funds |
| locked | Decimal | Default 0 | Funds reserved for surety or governed use |
| createdAt | DateTime | Default now() | Record creation time |

**Indexes/Constraints**
- Unique index on `userId`
- Foreign key to `User(id)`

**Design Rationale**
- Separating `available` and `locked` reduces ambiguity for collateralized operations.

### 3. LedgerEntry
**Purpose:** Immutable evidence of money movement and balance changes.

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | String | PK, UUID default | Ledger identifier |
| reference | String | Required | Business correlation ID |
| type | String | Required | Event type e.g. DEPOSIT, LOAN_REPAY |
| amount | Decimal | Required | Transaction amount |
| currency | String | Default NGN | Currency code |
| debitUserId | String? | Nullable | Logical source user |
| creditUserId | String? | Nullable | Logical destination user |
| beforeBalance | Decimal | Required | Balance before event |
| afterBalance | Decimal | Required | Balance after event |
| createdAt | DateTime | Default now() | Event timestamp |

**Indexes/Constraints**
- Composite unique constraint `unique_reference_type(reference, type)`

**Design Rationale**
- Unique reference/type enables idempotent execution guards.
- Before/after balance snapshots simplify reconciliation and investigations.

### 4. Request
**Purpose:** Represents a controlled action that may require multiple approvals before execution.

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | String | PK, UUID default | Request identifier |
| cooperativeId | String? | Nullable | Reserved for multi-cooperative tenancy |
| type | String | Required | Request category |
| metadata | Json? | Nullable | Execution payload |
| proposerId | String | FK -> User.id | Request owner |
| proposer | User | Required relation | Prisma relation name `proposer` |
| status | RequestStatus | Default PENDING | Workflow state |
| executed | Boolean | Default false | Idempotency flag |
| approvals | Approval[] | Child relation | Approval history |
| createdAt | DateTime | Default now() | Creation time |
| executedAt | DateTime? | Nullable | Execution completion time |

**Indexes/Constraints**
- Primary key on `id`
- Foreign key to `User(id)` via `proposerId`

**Design Rationale**
- `metadata` keeps request execution extensible without proliferating specialized request tables in MVP.
- `executed` plus `executedAt` supports concurrency-safe single execution.

### 5. Approval
**Purpose:** Records each admin decision on a request.

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | String | PK, UUID default | Approval identifier |
| requestId | String | FK -> Request.id | Parent request |
| request | Request | Required relation | Prisma managed relation |
| approverId | String | FK -> User.id | Admin actor |
| approver | User | Required relation | Admin user |
| note | String? | Nullable | Free-text decision note |
| createdAt | DateTime | Default now() | Decision time |

**Indexes/Constraints**
- PK on `id`
- FK to `Request(id)`
- FK to `User(id)`

**Design Rationale**
- Approval uniqueness by approver is enforced in application logic and should be strengthened later with a DB unique index on `(requestId, approverId)`.

### 6. Loan
**Purpose:** Stores borrower obligations and lifecycle timestamps.

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | String | PK, UUID default | Loan identifier |
| borrowerId | String | FK -> User.id | Borrowing member |
| borrower | User | Required relation | Borrower relation |
| amount | Decimal | Required | Principal amount |
| outstanding | Decimal | Required | Remaining balance |
| disbursedAt | DateTime? | Nullable | When funds were released |
| repaidAt | DateTime? | Nullable | When obligation was closed |
| createdAt | DateTime | Default now() | Creation timestamp |

**Design Rationale**
- `outstanding` is denormalized for fast balance checks and repayment progression.

### 7. Surety
**Purpose:** Tracks collateral pledges against loans.

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | String | PK, UUID default | Surety record ID |
| loanId | String | Required | Logical FK to Loan.id |
| userId | String | Required | Logical FK to User.id |
| amount | Decimal | Required | Locked amount |
| lockedAt | DateTime | Default now() | Pledge time |
| releasedAt | DateTime? | Nullable | Release time |

**Design Rationale**
- MVP keeps surety relation lightweight and application-managed.
- A future iteration should add explicit relational FKs and coverage indexes.

### 8. AuditLog
**Purpose:** Stores structured, append-only security and operations evidence.

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | String | PK, UUID default | Audit event ID |
| actionType | String | Required | Action classifier |
| initiatorId | String? | Nullable | User who triggered the event |
| details | Json | Required | Structured payload |
| createdAt | DateTime | Default now() | Event time |

**Design Rationale**
- JSON payload keeps audit flexible while preserving high-value context.

### 9. Setting
**Purpose:** Stores runtime configuration such as approval threshold.

| Field | Type | Constraints | Notes |
| --- | --- | --- | --- |
| id | String | PK, UUID default | Setting identifier |
| key | String | Unique | Config name |
| value | String | Required | Config value |
| createdAt | DateTime | Default now() | Creation timestamp |

**Design Rationale**
- Simple key/value storage is enough for low-cardinality operational settings.

## CREATE TABLE Equivalents
```sql
CREATE TYPE "Role" AS ENUM ('MEMBER', 'ADMIN');
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED');

CREATE TABLE "User" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT UNIQUE,
  "phone" TEXT UNIQUE,
  "fullName" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'MEMBER',
  "isSuper" BOOLEAN NOT NULL DEFAULT FALSE,
  "membershipStart" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Wallet" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE RESTRICT,
  "available" NUMERIC(18,2) NOT NULL DEFAULT 0,
  "locked" NUMERIC(18,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "LedgerEntry" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "reference" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" NUMERIC(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "debitUserId" UUID,
  "creditUserId" UUID,
  "beforeBalance" NUMERIC(18,2) NOT NULL,
  "afterBalance" NUMERIC(18,2) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "unique_reference_type" UNIQUE ("reference", "type")
);

CREATE TABLE "Request" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "cooperativeId" TEXT,
  "type" TEXT NOT NULL,
  "metadata" JSONB,
  "proposerId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
  "executed" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "executedAt" TIMESTAMPTZ
);

CREATE TABLE "Approval" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "requestId" UUID NOT NULL REFERENCES "Request"("id") ON DELETE RESTRICT,
  "approverId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "note" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Loan" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "borrowerId" UUID NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "amount" NUMERIC(18,2) NOT NULL,
  "outstanding" NUMERIC(18,2) NOT NULL,
  "disbursedAt" TIMESTAMPTZ,
  "repaidAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Surety" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "loanId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "amount" NUMERIC(18,2) NOT NULL,
  "lockedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "releasedAt" TIMESTAMPTZ
);

CREATE TABLE "AuditLog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "actionType" TEXT NOT NULL,
  "initiatorId" UUID,
  "details" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Setting" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" TEXT NOT NULL UNIQUE,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## Recommended Future Hardening
- Add DB unique index on `Approval(requestId, approverId)`.
- Add explicit foreign keys for `Surety.loanId` and `Surety.userId`.
- Add indexes on `Request.status`, `Loan.borrowerId`, `AuditLog.createdAt`, and `LedgerEntry.reference` for scale.
- Add `updatedAt` columns for mutable entities if operational tooling needs them.
