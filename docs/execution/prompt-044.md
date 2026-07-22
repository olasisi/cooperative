# Prompt 044: Error Handler Middleware

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Documented the centralized Express error handler used to normalize API failures. The pattern supports status-code fallbacks, consistent JSON responses, and Prisma-specific conflict handling.

## Current Middleware

```js
function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
}
```

## Response Format
All operational failures should return a single, consistent shape:

```json
{ "error": "Human-readable message" }
```

## Error Classification
### Operational Errors
Expected problems caused by user input or business rules:
- insufficient balance
- invalid credentials
- duplicate email/phone
- request not found
- surety already released

These should carry an explicit `err.status`.

### Programming Errors
Unexpected defects:
- undefined access
- broken assumptions
- failed data parsing
- internal library exceptions

These fall back to `500` and should be logged aggressively.

## Prisma Error Handling
Recommended enhancement for unique conflicts:

```js
const { Prisma } = require('@prisma/client');

function errorHandler(err, req, res, next) {
  console.error(err);

  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return res.status(409).json({ error: 'Resource already exists' });
  }

  const status = err.status || 500;
  return res.status(status).json({ error: err.message || 'Internal Server Error' });
}
```

## Placement
The middleware must be the last `app.use()` registration so all route errors bubble into it.

```mermaid
flowchart LR
  A[Route handler] -->|throw / next(err)| B[errorHandler]
  B --> C[{error: message}]
```

## Implementation Notes
- Preserve simple responses for clients.
- Keep stack traces in server logs, not API payloads.
- Add environment-based detail exposure only if debugging demands it.
