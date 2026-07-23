
# Prompt 067: Security Hardening Checklist

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Comprehensive security hardening checklist for authentication, validation, transport security, secrets, auditing, and dependency hygiene.

## Security Hardening Checklist
| Area | Control | Status to Verify |
| --- | --- | --- |
| Authentication | Rotate `JWT_SECRET` and `JWT_REFRESH_SECRET` on a defined cadence and after incidents | ☐ |
| Authentication | Keep access token TTL short (recommended 15 minutes) | ☐ |
| Authentication | Refresh tokens stored and transmitted securely, with revocation plan | ☐ |
| Authentication | Enforce strong password policy and bcrypt hashing | ☐ |
| Authorization | Admin-only routes protected by role middleware; super-admin override reviewed | ☐ |
| Input Validation | Validate and sanitize all body, query, and path inputs before module execution | ☐ |
| Input Validation | Reject malformed UUIDs, invalid decimals, negative amounts, and unsupported enums | ☐ |
| Injection Prevention | Use Prisma parameterized queries and tagged SQL templates only | ☐ |
| Injection Prevention | Ban string-concatenated SQL and unsafe raw queries | ☐ |
| Rate Limiting | Limit auth endpoints to **5 requests/minute per IP/user** | ☐ |
| Rate Limiting | Limit general API to **100 requests/minute per token/IP** | ☐ |
| CORS | Allow only approved origins and methods; no wildcard on production credentials | ☐ |
| Headers | Enable Helmet.js with CSP, HSTS, frameguard, noSniff, and referrer policy | ☐ |
| Transport | Enforce HTTPS-only traffic and redirect HTTP to HTTPS | ☐ |
| Cookies/Tokens | Never expose secrets or tokens in logs, URLs, or client-visible debug output | ☐ |
| Secrets | Store all credentials in environment variables or secret manager; never in code | ☐ |
| Audit Logging | Verify all privileged actions create audit entries with actor, action, timestamp, details | ☐ |
| Wallet Safety | Confirm atomic debit/lock/unlock paths prevent double-spend under concurrency | ☐ |
| Approval Safety | Confirm proposer cannot self-approve and duplicate approvals are blocked | ☐ |
| Dependency Security | Run `npm audit`, Dependabot, and advisory scans on every change window | ☐ |
| Container Security | Use minimal base images, patch regularly, and run container scans | ☐ |
| Observability | Alert on login abuse, repeated 401/403, error spikes, and suspicious admin activity | ☐ |
| Data Protection | Mask PII in logs and enforce least-privilege database/network policies | ☐ |

## Mandatory Pre-Go-Live Controls
1. JWT secrets created in secret manager with emergency rotation playbook.
2. Express middleware stack includes validation, rate limiting, CORS, and Helmet.
3. Production TLS certificate installed and verified.
4. Audit trail tested end-to-end for deposit, withdrawal, request approval, rejection, disbursement, repayment, and surety release.
5. Dependency vulnerability backlog contains **no open critical issues**.
6. Access to production database and secrets restricted by IAM/RBAC.

## Verification Evidence
- Security review sign-off.
- CI scan artifacts.
- Penetration or targeted abuse-test notes.
- Screenshots or exports of WAF/rate-limit configuration.
- Sample audit records for each privileged flow.
