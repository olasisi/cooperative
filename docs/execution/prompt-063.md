
# Prompt 063: CI/CD Workflow (GitHub Actions)

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
GitHub Actions CI workflow for Node.js 20 + PostgreSQL-backed Prisma tests, plus a staging-to-production CD promotion design.

## CI Workflow File
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: cooperative_test
          POSTGRES_USER: cooperative
          POSTGRES_PASSWORD: cooperative
        ports:
          - 5432:5432
        options: >-
          --health-cmd="pg_isready -U cooperative -d cooperative_test"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=10

    env:
      NODE_ENV: test
      PORT: 3000
      DATABASE_URL: ******localhost:5432/cooperative_test?schema=public
      JWT_SECRET: test-jwt-secret
      JWT_REFRESH_SECRET: test-jwt-refresh-secret
      JWT_ACCESS_EXPIRES: 15m
      JWT_REFRESH_EXPIRES: 30d

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm install

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Push Prisma schema to test database
        run: npx prisma db push --skip-generate

      - name: Run test suite
        id: run-tests
        shell: bash
        run: |
          set +e
          npm test 2>&1 | tee test-results.log
          status=${PIPESTATUS[0]}
          echo "exit_code=$status" >> "$GITHUB_OUTPUT"
          exit 0

      - name: Publish test summary
        if: always()
        shell: bash
        run: |
          echo "## Test Results" >> "$GITHUB_STEP_SUMMARY"
          if [ "${{ steps.run-tests.outputs.exit_code }}" = "0" ]; then
            echo "- Status: PASS" >> "$GITHUB_STEP_SUMMARY"
          else
            echo "- Status: FAIL" >> "$GITHUB_STEP_SUMMARY"
          fi
          echo "- Database: PostgreSQL 16 service container" >> "$GITHUB_STEP_SUMMARY"
          echo "- Prisma schema push: completed before tests" >> "$GITHUB_STEP_SUMMARY"

      - name: Upload test log artifact
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-log
          path: test-results.log

      - name: Fail workflow if tests failed
        if: steps.run-tests.outputs.exit_code != '0'
        run: exit 1
```

## CI Pipeline Notes
- The workflow runs on both **push** and **pull request** events targeting `main`.
- PostgreSQL runs as a service container so Prisma and tests execute against a real database.
- `prisma db push` is used for MVP speed; a migration-based flow should replace it for controlled production promotion.
- Test logs are uploaded as artifacts and summarized in the GitHub Actions job summary.

## CD Pipeline Design (Staging → Production Promotion)
### Staging Deployment
1. Trigger on merge to `main` after CI success.
2. Build and tag immutable container image.
3. Push image to registry (ECR/GHCR).
4. Deploy automatically to **staging**.
5. Run smoke tests:
   - `/` health endpoint
   - auth login smoke
   - database connectivity
   - representative wallet read
6. Require environment protection approval before promotion.

### Production Promotion
1. Promote the exact staging-validated image digest to production.
2. Apply database migration plan or verified schema reconciliation.
3. Roll out using blue/green or rolling deployment.
4. Verify key SLO indicators for 15-30 minutes.
5. Announce release completion to operations and stakeholders.

### Recommended Workflow Topology
| Workflow | Purpose |
| --- | --- |
| `ci.yml` | Build confidence on every push/PR |
| `deploy-staging.yml` | Auto-deploy after CI on `main` |
| `promote-production.yml` | Manual approval gate using tested image digest |

## Production Safeguards
- Required reviewers on production environment.
- Secrets stored in GitHub Environments or cloud secret manager.
- Automated rollback if smoke tests or canary error budget fails.
- Dependency, SAST, and container scans should block promotion when severity threshold is exceeded.
