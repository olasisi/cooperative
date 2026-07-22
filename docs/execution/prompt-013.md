# Prompt 013: Configuration Management Strategy

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Defines required environment variables, `.env.example` expectations, validation rules, and secret-handling strategy.

## Configuration Goals
- deterministic startup,
- separation of code and secrets,
- safe local development,
- environment-specific overrides,
- early failure on invalid config.

## Required Environment Variables

### `DATABASE_URL`
PostgreSQL connection string used by Prisma.

### `JWT_SECRET`
Signing secret for 15-minute access tokens.

### `JWT_REFRESH_SECRET`
Signing secret for 30-day refresh tokens.

### `PORT`
HTTP server port; defaults to `3000` locally.

## Recommended Additional Variables
- `NODE_ENV`
- `JWT_ACCESS_EXPIRES` (default `15m`)
- `JWT_REFRESH_EXPIRES` (default `30d`)
- `LOG_LEVEL`
- `APP_BASE_URL`
- `REDIS_URL` if BullMQ/ioredis are activated

## `.env.example`
The repository should expose placeholders only, for example:

```env
DATABASE_URL=******localhost:5432/cooperative
JWT_SECRET=replace-with-long-random-secret
JWT_REFRESH_SECRET=replace-with-different-long-random-secret
PORT=3000
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d
NODE_ENV=development
```

## Validation Rules
Validate configuration at process startup before accepting traffic.

### Required Checks
- `DATABASE_URL` present and parseable
- `JWT_SECRET` present and sufficiently long
- `JWT_REFRESH_SECRET` present and different from `JWT_SECRET`
- `PORT` numeric and within valid range
- token expiry strings valid for JWT library

### Failure Policy
If required configuration is missing or invalid:
- log clear startup error,
- exit process with non-zero status,
- do not start the HTTP server in degraded mode.

## Secret Handling
- Never commit real `.env` values.
- Load secrets from environment or managed secret store.
- Use distinct secrets per environment.
- Rotate secrets through deployment workflow.
- Do not print secrets in logs or test output.

## Environment Separation

### Local
- developer-managed `.env`
- disposable credentials
- no production secrets

### Test
- isolated PostgreSQL database
- dedicated JWT secrets
- deterministic configuration for CI

### Staging
- production-like shape
- independently rotated secrets
- safe test data only

### Production
- managed secrets store preferred
- strict access control
- auditable rotation process

## Config Module Design
Create a dedicated config loader, for example `src/config/index.js`, which:
1. reads environment variables,
2. validates them,
3. exports normalized values,
4. becomes the single configuration source for the app.

## Example Config Object
```js
module.exports = {
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    accessSecret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '30d'
  }
};
```

## Operational Rules
- Do not allow runtime mutation of configuration from public API routes.
- Changes to cooperative policy settings stored in DB must still be audited.
- Keep infrastructure secrets separate from tenant/business settings.

## Testing Requirements
- boot should fail when secrets are missing,
- refresh secret must differ from access secret,
- `.env.example` must stay in sync with config loader,
- test environment must not hit production database.
