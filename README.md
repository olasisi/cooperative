# Cooperative Society Web Application

A production-ready cooperative society management platform built with Next.js 14, TypeScript, Prisma ORM, and Paystack.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL (Railway) |
| ORM | Prisma |
| Auth | NextAuth.js v5 (JWT sessions) |
| Styling | Tailwind CSS + shadcn/ui |
| Payments | Paystack |
| Validation | Zod + React Hook Form |
| Deployment | Vercel (frontend) + Railway (database) |

## Features

- **Authentication & RBAC** – Secure login, registration, role-based access (MEMBER / ADMIN / SUPER_ADMIN)
- **Member Dashboard** – Wallet overview, recent transactions, quick actions
- **Admin Dashboard** – Society-wide stats, member management, approval queue
- **Wallets** – Available / locked balance separation; Paystack-powered deposits
- **Loan System** – Requests, surety, approval workflow, disbursement, repayments
- **Withdrawal Requests** – Member-initiated, admin-approved withdrawals
- **Monthly Dues** – Per-member dues deduction with approval workflow
- **Surety System** – Funds locked against loan guarantees; released on repayment
- **Approval Engine** – `PROPOSED → REVIEWED → APPROVED → EXECUTED` for all sensitive operations
- **Audit Logs** – Immutable, searchable log of every action
- **Notifications** – In-app notification feed
- **Settings** – Configurable thresholds (loan limits, surety ratio, min membership, approval counts)

## Business Rules

| Rule | Default |
|---|---|
| Admin cannot approve own request | Enforced |
| Min approvals for sensitive actions | 2 (configurable) |
| Max loan = multiplier × balance | 2× (configurable) |
| Surety coverage | 2× loan amount (configurable) |
| Locked funds cannot be withdrawn | Enforced |
| Large withdrawal approval threshold | ₦50,000 (configurable) |
| Min membership before loan | 3 months (configurable) |
| Duplicate active loans | Blocked (configurable) |

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Paystack account (test keys are fine for dev)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env

# 3. Fill in .env (see Environment Variables section below)

# 4. Create and migrate the database
npx prisma migrate dev --name init

# 5. Seed with default admin + sample member
npm run db:seed

# 6. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Default credentials after seeding:**
| Role | Email | Password |
|---|---|---|
| Admin | admin@cooperative.com | Admin@1234 |
| Member | john.doe@example.com | Member@1234 |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/cooperative?sslmode=require"

# NextAuth – generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-secret-key-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"   # change to your production URL in prod

# Paystack (https://dashboard.paystack.com/#/settings/developers)
PAYSTACK_SECRET_KEY="sk_test_..."
PAYSTACK_PUBLIC_KEY="pk_test_..."
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="pk_test_..."

# Optional
NEXT_PUBLIC_APP_NAME="Cooperative Society"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Deployment Guide

### 1 · Deploy the Database to Railway

1. Go to [https://railway.app](https://railway.app) and create a new project.
2. Click **+ New Service → Database → PostgreSQL**.
3. Once the database provisions, click it and go to the **Connect** tab.
4. Copy the **DATABASE_URL** (Postgres connection string) – you will need it in steps 2 and 3.

---

### 2 · Deploy the Backend / App to Railway

> The Next.js app handles both frontend and API. You can run the whole app on Railway **or** split: Railway for the API/DB and Vercel for the frontend. See step 3 for Vercel.

**Railway deployment:**

1. In your Railway project, click **+ New Service → GitHub Repo**.
2. Select the `olasisi/cooperative` repository.
3. Railway auto-detects the `railway.json` configuration:
   - Build command: `npm run build`
   - Start command: `npm start`
4. Go to the service **Variables** tab and add every variable from the **Environment Variables** section above.
   - Set `NEXTAUTH_URL` to your Railway public URL (e.g., `https://cooperative.up.railway.app`).
   - Set `DATABASE_URL` to the connection string from step 1.
5. Click **Deploy**. Railway builds and starts the app.
6. After the first deploy, open the Railway shell or a one-off command and run migrations + seed:
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

---

### 3 · Deploy the Frontend to Vercel

> Use this approach if you want the public-facing Next.js frontend on Vercel's global CDN and keep the database on Railway.

1. Go to [https://vercel.com](https://vercel.com) → **Add New Project** → Import `olasisi/cooperative`.
2. Vercel detects Next.js automatically (the `vercel.json` file is already included).
3. In the **Environment Variables** step, add every variable from the **Environment Variables** section:
   - `DATABASE_URL` → your Railway PostgreSQL URL (from step 1)
   - `NEXTAUTH_SECRET` → your secret
   - `NEXTAUTH_URL` → `https://your-app.vercel.app` (the URL Vercel assigns)
   - `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
4. Click **Deploy**. Vercel builds and publishes the site.
5. After deploy, run migrations from a local terminal pointing at the production DB:
   ```bash
   DATABASE_URL="<railway-postgres-url>" npx prisma migrate deploy
   DATABASE_URL="<railway-postgres-url>" npm run db:seed
   ```

---

### 4 · Connect Paystack

1. Log in to [https://dashboard.paystack.com](https://dashboard.paystack.com).
2. Go to **Settings → API Keys & Webhooks**.
3. Copy your **Secret Key** (`sk_live_...` for prod, `sk_test_...` for test) and **Public Key**.
4. Paste them into your deployment environment variables:
   - `PAYSTACK_SECRET_KEY` = secret key
   - `PAYSTACK_PUBLIC_KEY` = public key
   - `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` = public key (same value, needed client-side)
5. In the **Webhooks** section, add your webhook URL:
   ```
   https://your-app-url/api/paystack/webhook
   ```
6. Set the webhook event to **charge.success** (and optionally **transfer.success**, **transfer.failed**).
7. Copy the **Webhook Secret** if Paystack provides one and store it as `PAYSTACK_WEBHOOK_SECRET` (optional but recommended for signature verification).

---

### 5 · Run Migrations

**Development:**
```bash
npx prisma migrate dev --name init
```

**Production (first deploy):**
```bash
npx prisma migrate deploy
```

**Seed default admin account:**
```bash
npm run db:seed
```

---

### 6 · Verify the Deployment

After deploying, verify each layer:

```bash
# 1. Check the app loads
curl -I https://your-app-url/

# 2. Check API health
curl https://your-app-url/api/auth/providers

# 3. Log in as admin (browser)
#    Navigate to /login
#    Use: admin@cooperative.com / Admin@1234

# 4. Check database connection
#    Admin → Settings page should load cooperative settings

# 5. Test Paystack
#    Member Wallet → Deposit → use test card 4084084084084081 (CVV: 408, Exp: 01/25)

# 6. Verify webhook
#    Complete a test deposit; check Transaction ledger in member wallet
```

**Expected results:**
- `/login` → login form renders
- Admin dashboard shows member count and financial summary
- Member can deposit via Paystack test card
- Transaction appears in member wallet after payment
- Admin can approve loan requests

---

## Architecture Notes

- **Single Next.js app** handles both UI and API routes for simplicity and edge-function performance.
- **Prisma transactions** (`prisma.$transaction`) ensure atomicity for all financial operations.
- **Locked balance** is tracked separately; `availableBalance = totalBalance − lockedBalance` computed at query time.
- **ApprovalAction** table is an immutable append-only log of every approval event.
- **AuditLog** table records all actor actions with IP and user-agent for compliance.
- **Settings** table allows runtime configuration (loan limits, approval thresholds, surety ratios) without redeployment.

## Future Extensions

- Email / SMS notifications via SendGrid or Twilio
- Multi-factor authentication
- Bulk import for existing members
- Automated monthly dues scheduling (cron job via Railway)
- PDF receipt generation
- Mobile app via React Native
