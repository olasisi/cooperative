
# Prompt 070: Logging Strategy & Structured Logging

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Structured logging strategy for HTTP access, application events, audit evidence, error handling, retention, and PII masking.

## Logging Objectives
- Provide actionable incident diagnostics.
- Preserve auditability for privileged operations.
- Support performance analysis with request correlation.
- Prevent leakage of secrets and unnecessary PII.

## Log Levels
| Level | Use |
| --- | --- |
| ERROR | Unhandled exceptions, failed financial writes, downstream outages |
| WARN | Policy violations, retry conditions, abnormal but recoverable events |
| INFO | Normal business events, request lifecycle milestones, deployment state |
| DEBUG | Deep diagnostics for non-production or temporary troubleshooting |

## Standard Log Fields
| Field | Description |
| --- | --- |
| `timestamp` | ISO-8601 event time |
| `level` | ERROR/WARN/INFO/DEBUG |
| `service` | `cooperative-api` |
| `environment` | dev/staging/production |
| `requestId` | per-request correlation ID |
| `traceId` | distributed tracing correlation key |
| `userId` | authenticated actor when available |
| `role` | caller role |
| `action` | business action or route intent |
| `httpMethod` | request method |
| `path` | normalized route |
| `statusCode` | HTTP response status |
| `durationMs` | request duration |
| `outcome` | success/failure |
| `errorCode` | internal classification |

## Morgan HTTP Access Logs
- Use **Morgan** middleware for access logging.
- Route Morgan output into `winston` so access logs share JSON formatting and request IDs.
- Exclude noisy health checks from INFO in production or sample them.

## Application Event Logs
Important events to log at INFO/WARN:
- user registration and login outcomes
- wallet deposit, withdrawal, lock, unlock
- request creation, approval, rejection, execution
- loan creation, disbursement, repayment completion
- surety pledge and release
- configuration changes to approval threshold or admin privilege

## Error Logging Strategy
### Development
- Include stack traces.
- Log raw validation errors and SQL/ORM details where safe.
- Enable DEBUG selectively.

### Production
- Sanitize error output sent to clients.
- Log internal stack traces only to secure server logs.
- Remove secrets, tokens, and raw password values.
- Classify errors into validation, auth, authorization, business-rule, dependency, and system failures.

## Example Structured Log
```json
{
  "timestamp": "2026-07-22T12:00:00Z",
  "level": "INFO",
  "service": "cooperative-api",
  "requestId": "7f2d5c6b-0f28-4b0d-9645-b7c8e5f64218",
  "userId": "a3d0b62b-1e7d-4fd9-a48d-5f871e0c4f20",
  "action": "WALLET_DEPOSIT",
  "path": "/api/wallets/deposit",
  "statusCode": 200,
  "durationMs": 43,
  "outcome": "success"
}
```

## Log Retention Policy
| Log Type | Retention |
| --- | --- |
| Access logs | 30 days hot, 90 days warm |
| Application logs | 30 days hot, 180 days archive |
| Audit/security logs | 365 days minimum |
| Debug logs | 7-14 days, non-production only |

## PII Masking Rules
- Mask passwords, JWTs, refresh tokens, database URLs, and secret headers completely.
- Partially mask email addresses and phone numbers when full value is not essential.
- Never log full bank/payment references if they become regulated identifiers later.
- Redact `Authorization`, `Cookie`, and `Set-Cookie` headers.
- Hash or tokenize user identifiers in exported analytics where direct identity is not needed.
