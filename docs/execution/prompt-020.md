# Prompt 020: JWT Authentication (Access + Refresh Tokens)

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Authentication uses JWT access and refresh tokens. Access tokens carry `sub` and `role` and default to 15 minutes. Refresh tokens carry `sub` only and default to 30 days.

## Token Signers
```js
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '30d';

function signAccess(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
}
function signRefresh(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}
```

## Effective Defaults
- Access token expiry: `15m`
- Refresh token expiry: `30d`
- Access payload: `{ sub, role }`
- Refresh payload: `{ sub }`

## Login Flow
```js
async function login({ email, password }) {
  if (!email || !password) throw Object.assign(new Error('email and password required'), { status: 400 });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const accessToken = signAccess(user);
  const refreshToken = signRefresh(user);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, isSuper: user.isSuper }
  };
}
```

## HTTP Endpoint
- `POST /api/auth/login`
- Request body: `{ "email": "...", "password": "..." }`
- Response body:
```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "user": {
    "id": "uuid",
    "email": "member@example.com",
    "fullName": "Member Name",
    "role": "MEMBER",
    "isSuper": false
  }
}
```

## Token Verification Middleware
```js
async function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

## Required Environment Variables
- `JWT_SECRET` for access tokens
- `JWT_REFRESH_SECRET` for refresh tokens

Optional overrides:
- `JWT_ACCESS_EXPIRES`
- `JWT_REFRESH_EXPIRES`

## Notes
- Refresh token issuance exists, but refresh/rotation/revocation endpoints are not yet implemented in the checked-in routes.
- Middleware verifies access tokens only; refresh tokens are currently intended for future session renewal flows.
