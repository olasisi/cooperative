# Prompt 053: Auth Test Suite

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Defined the authentication and authorization test coverage for registration, login, token issuance, duplicate detection, and role-protected access.

## Target Behaviors
- register creates both `User` and `Wallet`;
- login returns access and refresh tokens;
- duplicate email/phone returns `409`;
- wrong password returns `401`;
- token validation populates `req.user`;
- admin-only routes reject member tokens.

## Register Coverage
`src/modules/auth.js` already creates a wallet as part of registration.

```js
const user = await auth.register({ email, phone, fullName, password });
const wallet = await prisma.wallet.findUnique({ where: { userId: user.id } });
expect(wallet).toBeTruthy();
```

## Login Coverage
```js
const result = await auth.login({ email, password });
expect(result).toHaveProperty('accessToken');
expect(result).toHaveProperty('refreshToken');
expect(result.user.role).toBe('MEMBER');
```

## Duplicate Rejection
```js
await expect(auth.register({ email: existing.email, fullName: 'Dup', password: 'pass' }))
  .rejects.toMatchObject({ status: 409 });
```

## Wrong Password
```js
await expect(auth.login({ email, password: 'wrong-pass' }))
  .rejects.toMatchObject({ status: 401 });
```

## Middleware Validation
- missing bearer token -> `401`;
- invalid token -> `401`;
- member hitting admin route -> `403`.

## Role-Based Access Matrix
| Route | Member | Admin | Super Admin |
|---|---:|---:|---:|
| `/api/auth/*` | ✅ | ✅ | ✅ |
| `/api/wallets/deposit` | ❌ | ✅ | ✅ |
| `/api/approvals/:requestId` | ❌ | ✅ | ✅ |
| `/api/sureties/release` | ❌ | ✅ | ✅ |

## Token Notes
Access tokens use `JWT_SECRET`; refresh tokens use `JWT_REFRESH_SECRET`. Tests should validate signatures with the correct secret and assert the presence of `sub` and `role` claims.
