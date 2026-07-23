
# Prompt 071: Backup & Recovery Procedures

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Backup and recovery procedures for PostgreSQL, application configuration, replication, restore testing, and target recovery objectives.

## Backup Strategy
### PostgreSQL
- Enable **automated RDS snapshots daily**.
- Enable **WAL archiving** and point-in-time recovery.
- Take **manual pre-release snapshots** before schema or infrastructure changes.
- Encrypt all backups at rest.

### Retention Policy
| Backup Type | Retention |
| --- | --- |
| Daily automated backups | 7 days |
| Weekly backups | 4 weeks |
| Monthly backups | 12 months |

### Cross-Region Protection
- Replicate automated backups or snapshots to a secondary AWS region.
- Store recovery runbooks with region-specific endpoints and IAM instructions.

## Application State Backup
Beyond PostgreSQL, back up:
- infrastructure state (Terraform remote state with versioning)
- deployment manifests and configuration baselines
- secret metadata references (not plaintext secrets)
- observability dashboards and alert definitions
- CI/CD workflow definitions

## Restore Procedures (Point-in-Time Recovery)
1. Declare incident and freeze deployments.
2. Identify desired recovery timestamp.
3. Restore RDS from PITR to a new instance.
4. Validate schema version and sample records.
5. Update application `DATABASE_URL` to restored instance in staging-like validation first.
6. Run smoke tests for auth, wallet balance, requests, loans.
7. Cut production traffic to restored database after approval.
8. Monitor reconciliation and audit integrity.

## Recovery Targets
- **RTO:** 4 hours
- **RPO:** 1 hour

## Backup Verification Tests
- Monthly restore drill to isolated environment.
- Quarterly point-in-time recovery rehearsal.
- Validate representative entities: user, wallet, ledger entry, request, approval, loan, surety, audit log.
- Reconcile ledger balances after restore.

## Roles & Responsibilities
| Role | Responsibility |
| --- | --- |
| On-call engineer | initiate recovery workflow and communications |
| DBA / platform engineer | restore database and validate health |
| Product owner / ops lead | approve cutover and business reconciliation |
| Security lead | verify integrity and incident classification |

## Post-Recovery Validation
- API health endpoint returns 200.
- Auth login works with known test account.
- Wallet balances match pre-incident reconciliation sample.
- Audit logging resumes successfully.
- Monitoring and backups re-enabled on restored instance.
