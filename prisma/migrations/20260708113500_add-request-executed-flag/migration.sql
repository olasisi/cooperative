-- Prisma Migrate SQL migration
-- Name: add-request-executed-flag

-- Add executed boolean to Request (default false)
ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS "executed" boolean NOT NULL DEFAULT false;

-- Create unique index on LedgerEntry(reference, type) to support idempotent execution
CREATE UNIQUE INDEX IF NOT EXISTS "unique_reference_type" ON "LedgerEntry" ("reference", "type");
