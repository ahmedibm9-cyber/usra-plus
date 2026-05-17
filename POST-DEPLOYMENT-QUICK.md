# USRA PLUS - Quick Post-Deployment Guide

## No External Payment Processors

USRA PLUS uses **built-in subscription management** — no Stripe, RevenueCat, or external payment services required. Subscriptions are managed directly through the database and admin dashboard.

---

## Step 1: Verify Deployment

```bash
chmod +x verify-deployment.sh
./verify-deployment.sh your-domain.com
```

---

## Step 2: Set Up Database

1. Go to [app.supabase.com](https://app.supabase.com) → Your Project → **SQL Editor**
2. Run each file from `supabase/` folder in order:
   - `migration.sql`
   - `additional-tables.sql`
   - `add-missing-tables.sql`
   - `complete-fix-migration.sql`
   - `business-control-migration.sql`
   - `final-migration.sql`
   - `fix-policies.sql`
   - `fix-partial-migration.sql`
   - `rls-and-indexes-migration.sql`

3. Run admin setup:
   - Open `scripts/setup-admin.sql`
   - Replace `your-email@example.com` with your email
   - Run it

---

## Step 3: Run Prisma

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

---

## Step 4: Access Admin Dashboard

1. Go to your app login page
2. **Click the USRA PLUS logo 7 times rapidly**
3. Enter admin password
4. Manage subscriptions directly from admin dashboard

---

## Step 5: Manage Subscriptions

All subscription management is done through the **Admin Dashboard**:

- **View all users and their plans**
- **Manually upgrade/downgrade users**
- **Create subscription OTP codes**
- **View revenue and analytics**
- **Set feature flags**

No external payment processor needed.

---

## Required Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis token |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `RESEND_API_KEY` | No | Email service (optional) |
| `SENTRY_DSN` | No | Error monitoring (optional) |

---

## That's It!

No Stripe, no RevenueCat, no external payment services. Everything is built-in.
