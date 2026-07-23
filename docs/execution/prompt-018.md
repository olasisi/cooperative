# Prompt 018: Database Migration Strategy

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
The codebase is Prisma-on-PostgreSQL. The recommended strategy is migration-first in shared environments, `db push` only for disposable development databases, forward-fix rollbacks, and environment-aware seeding using the existing super-admin seed module.

## Current Baseline
- Provider: PostgreSQL (`prisma/schema.prisma`)
- Prisma CLI is available through `npm run prisma -- ...`
- The repository currently contains the schema file but no committed `prisma/migrations/` directory yet.
- Seed logic already exists in `src/modules/seed.js` for a development super admin.

## Prisma Migrate vs `db push`
### Use `prisma migrate` when
- changing schema in shared development, staging, or production
- you need audited SQL files in version control
- you need deterministic rollout order across environments

Recommended commands:
```bash
npm run prisma -- migrate dev --name add-wallet-ledger
npm run prisma -- migrate deploy
```

### Use `prisma db push` when
- working against a throwaway local database
- prototyping before formalizing the migration
- resetting test fixtures quickly

Recommended command:
```bash
npm run prisma -- db push
```

## Migration Naming Convention
Use short, action-based names that describe the business change:
- `init-core-schema`
- `add-request-governance-fields`
- `add-ledger-idempotency-constraint`
- `add-setting-approval-threshold`

That keeps generated migration folders readable and easy to map to releases.

## Rollback Strategy
Prisma does not provide automatic down-migrations as the primary workflow. For this codebase, use:
1. **Forward-fix first**: create a new migration correcting the bad change.
2. **Database restore** for severe production incidents: restore from managed snapshot/backup.
3. **`prisma migrate resolve` only for operational recovery**, not as a substitute for a real corrective migration.

Example pattern:
```bash
# mark an already-applied migration as resolved if needed
npm run prisma -- migrate resolve --applied 20260722120000_init_core_schema
```

## Seed Data Approach
The current seed pattern is environment-driven and intentionally narrow:
```js
async function seedSuperAdmin() {
  const email = process.env.DEV_ADMIN_EMAIL;
  const password = process.env.DEV_ADMIN_PASSWORD;
  if (!email || !password) return;
  // create admin + wallet
}
```

Recommended seed tiers:
- **Local/dev**: super admin from `DEV_ADMIN_EMAIL` and `DEV_ADMIN_PASSWORD`
- **Test**: ephemeral test data created inside test setup
- **Staging/production**: no broad demo data; only explicit bootstrap records

## Environment-Specific Database Management
### Local development
- use a personal Postgres database
- `migrate dev` during normal work
- `db push` only for disposable experiments

### CI / test
- provision isolated DB per run
- apply schema with `migrate deploy` if migrations exist, otherwise `db push`
- tests already create their own users, wallets, requests, loans, and sureties

### Staging / production
- commit migration SQL
- deploy with `migrate deploy`
- never run `migrate dev`
- keep `DATABASE_URL` environment-specific and secret-managed

## Recommended Workflow for This Repository
1. Update `prisma/schema.prisma`.
2. Generate a named migration locally.
3. Review generated SQL.
4. Commit both schema and migration folder.
5. Run `migrate deploy` in shared environments.
6. Run seed/bootstrap only where explicitly allowed.

## Schema Alignment Work
Because application modules currently assume some fields not visible in the schema snapshot (notably request title/description/amount), the next migration batch should formally reconcile those differences before further feature expansion.
