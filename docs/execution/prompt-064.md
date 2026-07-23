
# Prompt 064: Docker & Docker Compose Setup

## Status
COMPLETED

## Completed At
2026-07-22T12:00:00Z

## Summary
Containerization artifacts for the Express/Prisma API, including a multi-stage Dockerfile, docker-compose stack, environment strategy, and health checks.

## Dockerfile
```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma
COPY src ./src
COPY tests ./tests
COPY package*.json ./
RUN npx prisma generate

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src
COPY --from=build /app/package*.json ./
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3   CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", "src/server.js"]
```

## docker-compose.yml
```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16
    container_name: cooperative-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: cooperative
      POSTGRES_USER: cooperative
      POSTGRES_PASSWORD: cooperative
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U cooperative -d cooperative']
      interval: 10s
      timeout: 5s
      retries: 10

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: cooperative-api
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - '3000:3000'
    env_file:
      - .env
    environment:
      PORT: 3000
      DATABASE_URL: ******postgres:5432/cooperative?schema=public
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      JWT_ACCESS_EXPIRES: ${JWT_ACCESS_EXPIRES:-15m}
      JWT_REFRESH_EXPIRES: ${JWT_REFRESH_EXPIRES:-30d}
      NODE_ENV: production
    healthcheck:
      test: ['CMD-SHELL', 'wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1']
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s

volumes:
  postgres_data:
```

## Environment Variable Handling
| Variable | Purpose | Secret? |
| --- | --- | --- |
| `PORT` | HTTP listen port | No |
| `DATABASE_URL` | Prisma/PostgreSQL connection string | Yes |
| `JWT_SECRET` | Access token signing secret | Yes |
| `JWT_REFRESH_SECRET` | Refresh token signing secret | Yes |
| `JWT_ACCESS_EXPIRES` | Access token TTL | No |
| `JWT_REFRESH_EXPIRES` | Refresh token TTL | No |
| `NODE_ENV` | Runtime environment | No |

### Recommended Practices
- Keep `.env` local-only and exclude it from version control.
- Use Docker secrets, AWS Secrets Manager, or Kubernetes secrets in shared environments.
- Generate Prisma client at build time and validate connectivity at container startup.

## Health Checks
- **Application health**: HTTP GET `/` returns `200 OK`.
- **Database health**: `pg_isready` against the containerized PostgreSQL instance.
- **Startup dependency ordering**: app waits for healthy PostgreSQL in Compose.

## Operational Notes
- For local development, mount source code only if live reload is needed.
- In production, use immutable images and inject secrets at runtime.
- Prefer managed PostgreSQL for non-local environments; Compose is intended for dev/integration only.
