# Cooperative Society Web Application

A production-ready cooperative society management platform built with Next.js 14, TypeScript, Prisma, and Paystack.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js v5
- **Styling**: Tailwind CSS + shadcn/ui components
- **Payments**: Paystack
- **Validation**: Zod + React Hook Form

## Features

- Member registration & authentication
- Wallet management with Paystack deposits
- Loan requests with surety system
- Dues payments
- Withdrawal requests
- Admin approval workflow (PROPOSED → APPROVED → EXECUTED)
- Admin dashboard with reports
- Configurable cooperative settings

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Paystack account

### Setup

1. Clone and install dependencies:
   ```bash
   npm install
   ```

2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

3. Configure `.env` with your values:
   - `DATABASE_URL`: PostgreSQL connection string
   - `NEXTAUTH_SECRET`: Random secret (use `openssl rand -base64 32`)
   - `NEXTAUTH_URL`: Your app URL (e.g., `http://localhost:3000`)
   - `PAYSTACK_SECRET_KEY`: Your Paystack secret key
   - `PAYSTACK_PUBLIC_KEY`: Your Paystack public key

4. Run database migrations:
   ```bash
   npx prisma migrate dev --name init
   ```

5. Seed the database:
   ```bash
   npm run db:seed
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

## Default Credentials

After seeding:
- **Admin**: `admin@cooperative.com` / `Admin@1234`
- **Member**: `john.doe@example.com` / `Member@1234`

## Business Rules

- Members must have been active for a configurable minimum period before loan eligibility
- Loan amount cannot exceed `maxLoanMultiplier × member balance`
- Surety must have `suretyMultiplier × loan amount` as available balance
- Surety cannot be the borrower themselves
- All financial operations require admin approval
- Admin cannot approve their own requests

## Deployment

### Railway / Vercel
Configuration files are included (`railway.json`, `vercel.json`).

Set all required environment variables in your deployment platform.

Run migrations in production:
```bash
npx prisma migrate deploy
```
