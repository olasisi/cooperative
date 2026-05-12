# Cooperative Starter Platform

Starter monorepo for a secure cooperative society management platform with approval-driven financial workflows.

## Core Principles

- Sensitive financial actions follow `PROPOSED -> REVIEWED -> APPROVED -> EXECUTED -> LOGGED`
- No direct balance editing (ledger-first wallet model)
- Immutable financial and audit records after approval/execution
- Multi-admin approval with configurable threshold
- RBAC and fraud-prevention-first design

## Monorepo Structure

- `apps/backend` - Express + TypeScript backend scaffolding
- `apps/frontend` - React + TypeScript frontend scaffolding
- `packages/contracts` - shared enums and DTO contracts
- `docs` - PRD, architecture, schema, API, roadmap

## Quick Start

```bash
npm install
npm run build
npm run dev
```

Backend health endpoint: `GET http://localhost:4000/health`

## Notes

This repository is a starter scaffold, not a full production implementation. It emphasizes architecture, contracts, schema, and secure financial workflow foundations.
