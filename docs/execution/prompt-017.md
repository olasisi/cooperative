# Prompt 017: Prisma Schema Design (Complete Data Model)

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
The platform uses a PostgreSQL-backed Prisma schema centered on users, one-to-one wallets, immutable ledger entries, approval-governed requests, loans, sureties, audit logs, and settings.

## Full Prisma Schema
```prisma
// prisma/schema.prisma
// Core schema for cooperative MVP

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  MEMBER
  ADMIN
}

enum RequestStatus {
  PENDING
  APPROVED
  REJECTED
  EXECUTED
}

model User {
  id               String    @id @default(uuid())
  email            String?   @unique
  phone            String?   @unique
  fullName         String
  password         String
  role             Role      @default(MEMBER)
  isSuper          Boolean   @default(false)
  membershipStart  DateTime?
  createdAt        DateTime  @default(now())
  wallet           Wallet?
  requestsProposed Request[] @relation("proposer")
  approvals        Approval[]
}

model Wallet {
  id         String   @id @default(uuid())
  userId     String   @unique
  user       User     @relation(fields: [userId], references: [id])
  available  Decimal  @default(0)
  locked     Decimal  @default(0)
  createdAt  DateTime @default(now())
}

model LedgerEntry {
  id            String   @id @default(uuid())
  reference     String
  type          String
  amount        Decimal
  currency      String   @default("NGN")
  debitUserId   String?
  creditUserId  String?
  beforeBalance Decimal
  afterBalance  Decimal
  createdAt     DateTime @default(now())

  @@unique([reference, type], name: "unique_reference_type")
}

model Request {
  id            String        @id @default(uuid())
  cooperativeId String?
  type          String
  metadata      Json?
  proposerId    String
  proposer      User          @relation("proposer", fields: [proposerId], references: [id])
  status        RequestStatus @default(PENDING)
  executed      Boolean       @default(false)
  approvals     Approval[]
  createdAt     DateTime      @default(now())
  executedAt    DateTime?
}

model Approval {
  id         String   @id @default(uuid())
  requestId  String
  request    Request  @relation(fields: [requestId], references: [id])
  approverId String
  approver   User     @relation(fields: [approverId], references: [id])
  note       String?
  createdAt  DateTime @default(now())
}

model Loan {
  id          String   @id @default(uuid())
  borrowerId  String
  borrower    User     @relation(fields: [borrowerId], references: [id])
  amount      Decimal
  outstanding Decimal
  disbursedAt DateTime?
  repaidAt    DateTime?
  createdAt   DateTime @default(now())
}

model Surety {
  id         String   @id @default(uuid())
  loanId     String
  userId     String
  amount     Decimal
  lockedAt   DateTime @default(now())
  releasedAt DateTime?
}

model AuditLog {
  id          String   @id @default(uuid())
  actionType  String
  initiatorId String?
  details     Json
  createdAt   DateTime @default(now())
}

model Setting {
  id         String   @id @default(uuid())
  key        String   @unique
  value      String
  createdAt  DateTime @default(now())
}
```

## Model Breakdown
### User
- `email` and `phone` are individually unique and nullable, allowing registration with either identifier.
- `password` stores the bcrypt hash, never the raw password.
- `role` is the coarse-grained authorization flag.
- `isSuper` is a super-admin override used by middleware.
- `wallet` is a one-to-one relation through `Wallet.userId`.
- `requestsProposed` and `approvals` support the governance workflow.

### Wallet
- One wallet per member through `userId @unique`.
- `available` is spendable balance.
- `locked` is collateral / reserved balance.
- Decimal columns avoid float rounding for money.

### LedgerEntry
- Stores immutable money movement records.
- `reference` links entries to a business event (request id, loan id, manual reference).
- `type` classifies the movement.
- `debitUserId` / `creditUserId` allow single-sided or paired bookkeeping.
- `beforeBalance` and `afterBalance` snapshot the affected wallet's available balance.
- `@@unique([reference, type])` is a key idempotency control.

### Request and Approval
- `Request.status` is the approval lifecycle state.
- `executed` and `executedAt` separate approval from actual execution.
- `Approval` records each approver's vote and note.

### Loan and Surety
- `Loan.outstanding` tracks remaining principal.
- `disbursedAt` and `repaidAt` mark lifecycle milestones.
- `Surety` records pledged collateral and release timing.

### AuditLog and Setting
- `AuditLog.details` captures flexible JSON metadata per business action.
- `Setting` is a generic key/value table currently used for approval thresholds.

## Relation and Constraint Design
- User-to-wallet is one-to-one.
- User-to-request is one-to-many via `proposer`.
- Request-to-approval is one-to-many.
- Approval-to-user is many-to-one.
- Loan-to-user is many-to-one for borrowers.
- Unique email, unique phone, unique wallet ownership, and unique ledger reference/type enforce business integrity at the database level.

## Design Decisions
1. **UUID primary keys** keep IDs globally unique without central sequencing.
2. **Decimal balances** are safer for financial values than floating-point types.
3. **Soft lifecycle markers** (`executedAt`, `releasedAt`, `repaidAt`) preserve history instead of deleting rows.
4. **Super-admin override** is modeled as `isSuper` rather than a separate `SUPER` enum member.
5. **Flexible JSON** in `metadata` and `details` keeps request and audit payloads extensible.

## Alignment Notes
- The runtime request module currently writes `title`, `description`, and `amount`, but those fields are not present in the checked-in schema snapshot. Keep schema and module code aligned in the next migration.
- Surety currently stores `loanId` and `userId` as raw IDs without Prisma relations. That keeps the schema small, but relations can be added later for richer query ergonomics.
