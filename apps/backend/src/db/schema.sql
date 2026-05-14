-- PostgreSQL starter schema for approval-driven cooperative platform

CREATE TABLE cooperatives (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY,
  cooperative_id UUID NOT NULL REFERENCES cooperatives(id),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE wallets (
  id UUID PRIMARY KEY,
  cooperative_id UUID NOT NULL REFERENCES cooperatives(id),
  user_id UUID NOT NULL REFERENCES users(id),
  currency TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, currency)
);

CREATE TABLE requests (
  id UUID PRIMARY KEY,
  cooperative_id UUID NOT NULL REFERENCES cooperatives(id),
  proposer_user_id UUID NOT NULL REFERENCES users(id),
  transaction_type TEXT NOT NULL,
  workflow_status TEXT NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  logged_at TIMESTAMPTZ
);

CREATE TABLE approvals (
  id UUID PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES requests(id),
  reviewer_user_id UUID NOT NULL REFERENCES users(id),
  decision TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(request_id, reviewer_user_id)
);

CREATE TABLE wallet_ledger_entries (
  id UUID PRIMARY KEY,
  cooperative_id UUID NOT NULL REFERENCES cooperatives(id),
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  request_id UUID NOT NULL REFERENCES requests(id),
  direction TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL,
  immutable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE loans (
  id UUID PRIMARY KEY,
  cooperative_id UUID NOT NULL REFERENCES cooperatives(id),
  user_id UUID NOT NULL REFERENCES users(id),
  request_id UUID NOT NULL UNIQUE REFERENCES requests(id),
  principal_minor BIGINT NOT NULL,
  interest_rate NUMERIC(5,2) NOT NULL,
  term_months INT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sureties (
  id UUID PRIMARY KEY,
  loan_id UUID NOT NULL REFERENCES loans(id),
  surety_user_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  cooperative_id UUID NOT NULL REFERENCES cooperatives(id),
  actor_user_id UUID REFERENCES users(id),
  request_id UUID REFERENCES requests(id),
  action TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  immutable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  channel TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE TABLE settings (
  id UUID PRIMARY KEY,
  cooperative_id UUID NOT NULL REFERENCES cooperatives(id),
  approval_threshold INT NOT NULL DEFAULT 2 CHECK (approval_threshold >= 1),
  allow_self_approval BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cooperative_id)
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  device_fingerprint TEXT,
  ip_address INET,
  user_agent TEXT,
  otp_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE otp_records (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE devices (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  trusted BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
