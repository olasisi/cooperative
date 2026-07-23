# Prompt 045: Input Validation Layer

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Documented the input-validation approach used across the codebase. Validation is currently performed inside route handlers and modules using explicit checks and status-tagged errors.

## Current Validation Style
The platform uses in-module and in-route checks instead of a centralized schema library.

```js
if (!borrowerId || !amount) {
  return res.status(400).json({ error: 'borrowerId and amount required' });
}

if (!password || !(email || phone)) {
  throw Object.assign(new Error('email/phone and password required'), { status: 400 });
}
```

## Required Checks
Validation should cover:
- required fields present;
- correct primitive types;
- `amount > 0`;
- UUID-like ids not empty;
- email format;
- phone format;
- enum-like values such as approval action.

## Money Validation
All financial operations should reject zero or negative amounts.

```js
function assertPositiveAmount(amount) {
  if (amount === undefined || amount === null || Number(amount) <= 0) {
    throw Object.assign(new Error('amount must be greater than 0'), { status: 400 });
  }
}
```

## Basic Format Validation
```js
const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const phoneOk = /^\+?[0-9]{10,15}$/.test(phone);
if (email && !emailOk) throw Object.assign(new Error('invalid email format'), { status: 400 });
if (phone && !phoneOk) throw Object.assign(new Error('invalid phone format'), { status: 400 });
```

## Error Signaling
Validation failures should throw or return with status `400`.

```json
{ "error": "amount must be greater than 0" }
```

## Migration Path
A future migration to Zod or Joi can centralize schemas without changing business services.

```js
// future shape
const schema = z.object({
  amount: z.coerce.number().positive(),
  userId: z.string().uuid(),
});
```

## Recommended Structure
- lightweight guards in routers for presence checks;
- business-rule validation in modules;
- shared helper functions for repeated primitives.
