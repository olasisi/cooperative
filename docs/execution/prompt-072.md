
# Prompt 072: Operations Runbook

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Operations runbook covering health checks, restarts, common alerts, database maintenance, log analysis, escalation, on-call duties, and emergency response.

## Service Health Check Commands
```bash
# API root check
curl -fsS https://api.cooperative.example.com/

# Kubernetes deployment status
kubectl -n cooperative get deploy,pods,svc,ingress

# ECS service status
aws ecs describe-services --cluster cooperative-cluster --services cooperative-api

# RDS health
aws rds describe-db-instances --db-instance-identifier cooperative-mvp-db
```

## Restart Procedures
### Kubernetes
```bash
kubectl -n cooperative rollout restart deployment/cooperative-api
kubectl -n cooperative rollout status deployment/cooperative-api
```

### ECS Fargate
```bash
aws ecs update-service   --cluster cooperative-cluster   --service cooperative-api   --force-new-deployment
```

## Common Alerts and Remediation
| Alert | Likely Cause | Immediate Action |
| --- | --- | --- |
| High CPU | traffic spike, hot loop, expensive query | inspect pods/tasks, scale out, review slow traces |
| DB connection pool exhaustion | too many concurrent requests, leaked connections | inspect pool metrics, restart unhealthy replicas, reduce traffic if needed |
| High error rate | downstream DB issue, bad deploy, auth failure | check logs/traces, compare recent deploy, rollback if regression |
| Elevated latency | DB contention, network issue, saturation | inspect p95/p99, query locks, autoscaling status |
| Approval execution failures | insufficient funds, locking issue, bad metadata | inspect request/audit logs, verify business input, replay safely only if approved |

## Database Maintenance Procedures
- Apply schema changes during approved maintenance windows.
- Take pre-change snapshot before major migrations.
- Review slow query logs weekly.
- Vacuum/analyze policy is managed by RDS defaults unless custom tuning is required.
- Monitor storage growth, replication lag, and connection count.

## Log Analysis Guide
1. Start with request ID or trace ID from alert.
2. Query access logs for route, status, duration, and actor.
3. Inspect application logs for business event sequence.
4. Confirm audit entries for privileged actions.
5. Check database metrics for lock waits or saturation.

## Escalation Paths
| Severity | Escalate To | SLA |
| --- | --- | --- |
| P1 | On-call engineer, platform lead, product owner, security lead | Immediate |
| P2 | On-call engineer, service owner | Within 30 minutes |
| P3 | Service owner during business hours | Same day |

## On-Call Responsibilities
- Acknowledge alerts.
- Triage impact and severity.
- Stabilize service.
- Communicate status updates.
- Create incident record and timeline.
- Hand off follow-up actions after resolution.

## Emergency Procedures
### Rollback
- Halt active deployment.
- Revert to last known good image/task revision.
- Validate health, auth, wallet, and loan reads.

### Suspected Secret Exposure
- Rotate exposed secrets immediately.
- Invalidate affected tokens.
- Audit access logs and admin activity.
- Open security incident and preserve evidence.

### Database Failure
- Fail over if available.
- If corruption suspected, invoke restore procedure from backup runbook.
- Freeze write traffic until data integrity is confirmed.
