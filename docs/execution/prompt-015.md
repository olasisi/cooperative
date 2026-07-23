# Prompt 015: Technology Stack Justification

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Explains the rationale for the current Node.js/Express, Prisma, PostgreSQL, bcrypt/JWT, and Jest-oriented stack, plus future evolution considerations.

## Node.js / Express Rationale
Node.js with Express is a pragmatic fit for the platform because it provides:
- fast startup and simple deployment,
- strong ecosystem support,
- straightforward JSON API development,
- good fit for I/O-bound web services,
- easy composition of middleware for auth, error handling, and request scoping.

Express also matches the current repository’s modular route/service structure and keeps implementation approachable for MVP delivery.

## Prisma ORM Rationale
Prisma is well-suited because it offers:
- typed schema modeling and migrations,
- clear relations across users, wallets, requests, loans, and audit logs,
- ergonomic CRUD for common operations,
- transaction support,
- ability to mix high-level ORM access with targeted raw SQL for concurrency-sensitive updates.

This hybrid capability is especially valuable in a financial system where guarded `UPDATE ... RETURNING` queries are sometimes preferable.

## PostgreSQL Choice
PostgreSQL is the right primary data store because it provides:
- transactional guarantees,
- row-level locking,
- strong concurrency control,
- robust decimal handling,
- JSON/JSONB support for metadata and audit details,
- reliable indexing and reporting features.

These are essential for immutable ledgering, approval serialization, and tenant-scoped analytics.

## bcrypt Rationale
bcrypt is appropriate for password storage because it is:
- battle-tested,
- intentionally slow against brute force,
- easy to operate in Node.js,
- already integrated in the codebase.

## JWT Rationale
JWT suits the API because it enables:
- stateless access authentication,
- short-lived access tokens,
- easy route protection via middleware,
- separation of access and refresh credentials.

JWT must still be complemented with database-backed user lookup and, over time, refresh-token revocation strategy.

## Jest Testing Rationale
The repository already contains Jest-style tests. Jest is appropriate because it provides:
- simple test authoring,
- async support,
- good CI compatibility,
- easy serial execution for DB-sensitive integration tests,
- familiar assertions for Node.js projects.

## Current Stack Strengths
- low operational complexity for MVP,
- good developer productivity,
- direct support for business-rule-heavy APIs,
- enough transactional power for cooperative finance workflows.

## Known Limitations / Tradeoffs
- Express is unopinionated; architectural discipline must come from project conventions.
- Prisma cannot replace all carefully crafted SQL in high-contention flows.
- Stateless JWT auth needs additional revocation design for mature security posture.
- Integration-heavy testing requires disciplined database isolation.

## Future Considerations
- Add migrations and stricter schema constraints as the domain stabilizes.
- Introduce explicit enums for ledger types and loan states.
- Add Redis/BullMQ for deferred workflows, notifications, or reconciliations when needed.
- Consider API validation libraries such as Zod or Joi for stronger input contracts.
- Consider observability tooling for traces and structured logs.
- Consider row-level security or repository-level tenant scoping helpers for deeper multi-tenancy enforcement.

## Decision Summary
The chosen stack is justified because it balances delivery speed, transactional safety, and maintainability while remaining flexible enough for future hardening into a production-grade cooperative finance platform.
