
# Prompt 074: Performance Testing Strategy

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Performance test strategy defining goals, scenarios, tooling, bottleneck analysis, pooling and caching considerations, and reporting expectations.

## Performance Goals
- **API latency:** p95 under **200 ms** for read-heavy endpoints.
- **Throughput:** sustain **500 requests/second** at target scale.
- **Write latency:** p95 under **500 ms** for transactional endpoints.

## Tooling
- Preferred load tools: **k6** or **Artillery**.
- Use production-like staging environment with representative database size and connection settings.

## Test Scenarios
| Scenario | Description |
| --- | --- |
| Login spike | Burst of authentication requests after shift start or payroll event |
| Concurrent deposits | High-volume admin deposits across multiple members |
| Approval storm | Multiple admins approving many requests concurrently |
| Loan disbursement batch | Admins disburse many secured loans in a short window |
| Repayment window | Members repay loans during collection campaign |

## Baseline Measurement Plan
1. Measure single-user latency for each critical endpoint.
2. Ramp gradually from 50 rps to 500 rps.
3. Capture p50/p95/p99 latency, error rate, CPU, memory, DB utilization, and lock waits.
4. Record saturation point and degradation pattern.

## Bottleneck Identification Approach
- Use tracing to isolate slow middleware, Prisma calls, or network dependencies.
- Inspect PostgreSQL for slow queries, lock contention, and connection exhaustion.
- Compare read vs write endpoint behavior under identical concurrency.
- Validate that approval and wallet atomic updates remain correct under stress.

## DB Connection Pooling Optimization
- Tune Prisma connection pool per replica/task size.
- Consider PgBouncer or RDS Proxy when replica count increases.
- Avoid connection storms during autoscaling events.
- Track queue wait time and connection timeout rates.

## Caching Strategy
- Introduce **Redis** for non-transactional, short-lived data such as settings, session-adjacent metadata, and configuration lookups.
- Do **not** cache wallet balances, loan outstanding, or approval state unless cache invalidation is strongly controlled.

## Results Reporting
Each test run should include:
- environment description
- dataset size
- scenario profile and concurrency
- latency percentiles
- throughput achieved
- error breakdown
- top bottlenecks and remediation recommendations
- pass/fail against target SLOs
