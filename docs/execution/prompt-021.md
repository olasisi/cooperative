# Prompt 021: Role-Based Access Control (RBAC)

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
RBAC is implemented with a `Role` enum of `MEMBER` and `ADMIN`, plus an `isSuper` boolean override that acts as super-admin capability.

## Roles as Implemented
### MEMBER
Default role assigned during registration.

### ADMIN
Privileged operational role used on approval, deposit, loan disbursement, and some surety flows.

### SUPER capability
There is no `SUPER` enum value in the Prisma schema. Instead, super privileges are represented by:
```prisma
role    Role    @default(MEMBER)
isSuper Boolean @default(false)
```

A user with `isSuper = true` bypasses strict role matching in middleware.

## Middleware Pattern
```js
function ensureRole(role) {
  return function (req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role !== role && !req.user.isSuper) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}
```

## Effective `isAdmin` / `isSuper` Behavior
The codebase does not currently export separate `isAdmin` or `isSuper` middleware. Instead:
- `ensureRole('ADMIN')` covers admin-only routes
- `req.user.isSuper` acts as the super override

If explicit wrappers are desired, they would simply delegate to this pattern.

## Protected Route Examples
### Admin-only
- `POST /api/wallets/deposit`
- `POST /api/wallets/unlock`
- `POST /api/approvals/:requestId`
- `POST /api/loans/:id/disburse`
- `POST /api/surety/release`

### Authenticated member routes
- `GET /api/wallets/balance`
- `POST /api/wallets/withdraw`
- `POST /api/requests`
- `POST /api/loans`
- `POST /api/loans/:id/repay`

## Seeded Super Admin Pattern
The seed module creates an admin with elevated override rights:
```js
const user = await prisma.user.create({
  data: {
    email,
    fullName: 'Dev Super Admin',
    password: hashed,
    role: 'ADMIN',
    isSuper: true,
    membershipStart: new Date(),
  },
});
```

## Design Notes
- The prompt topic mentions `MEMBER`, `ADMIN`, and `SUPER`; in this codebase, `SUPER` is modeled as `isSuper`, not a third enum case.
- Function-level role checks are mostly enforced at the route layer. Internal service methods generally trust that guarded routes called them.
