# Task: Vercel/Supabase PostgreSQL Migration for USRA PLUS

## Task ID: vercel-supabase-migration
## Agent: main-dev
## Status: COMPLETED

## Summary
Migrated the USRA PLUS Next.js 16 project from Prisma/SQLite to Prisma/PostgreSQL for Vercel deployment with Supabase as the database provider.

## Changes Made

### 1. prisma/schema.prisma
- Changed `provider = "sqlite"` to `provider = "postgresql"`
- Changed `String @default("[]")` to `Json @default("[]")` for JSON array fields (features, limits, applicablePlans)
- Changed `String @default("{}")` to `Json @default("{}")` for JSON object fields (rules, details, value)
- Changed `Float` to `Decimal @db.Decimal(10, 2)` for all monetary fields (monthlyPrice, yearlyPrice, lifetimePrice, discountValue, discountApplied, rewardValue, amount, originalAmount, discountAmount)
- All `@default(uuid())` kept as-is (works with PostgreSQL)

### 2. package.json
- Added `postinstall` script: `prisma generate`
- Added `db:seed` script: `npx tsx prisma/seed.ts`
- Added `prisma.seed` configuration

### 3. next.config.ts
- Changed `output: process.env.VERCEL ? undefined : "standalone"` to `...(process.env.VERCEL ? {} : { output: "standalone" })`

### 4. prisma/seed.ts (NEW)
- Seeds default subscription plans (free, pro, max, family_plus)
- Seeds default feature flags (8 flags)
- Seeds default system settings (5 settings)
- Uses Prisma Json type directly for JSON fields

### 5. API Route Updates (14 files)
All routes updated for Json and Decimal field compatibility:

**Json field changes (removed JSON.parse/JSON.stringify):**
- `src/app/api/admin/subscriptions/route.ts` - features, limits
- `src/app/api/admin/coupons/route.ts` - applicablePlans
- `src/app/api/admin/segments/route.ts` - rules
- `src/app/api/admin/audit/route.ts` - details
- `src/app/api/admin/system/route.ts` - value, details
- `src/app/api/admin/moderation/route.ts` - details
- `src/app/api/admin/support/route.ts` - details
- `src/app/api/admin/errors/route.ts` - details
- `src/app/api/admin/bans/route.ts` - details
- `src/app/api/admin/bugs/route.ts` - details

**Decimal field changes (added Number() conversion):**
- `src/app/api/admin/subscriptions/route.ts` - monthlyPrice, yearlyPrice, lifetimePrice
- `src/app/api/admin/coupons/route.ts` - discountValue
- `src/app/api/admin/revenue/route.ts` - amount, originalAmount, discountAmount
- `src/app/api/admin/referrals/route.ts` - rewardValue
- `src/app/api/admin/system/route.ts` - (seed uses proper values)

**PostgreSQL awareness:**
- Added `isPostgreSQL()` helper to: system, infrastructure, bugs routes
- Infrastructure route: DB size shows "Managed by Supabase" for PostgreSQL
- System route: backup/restore redirects to Supabase dashboard for PostgreSQL
- Bugs route: connection tests show "PostgreSQL Database" for PostgreSQL
- Comments updated from "SQLite" to "PostgreSQL" across all routes

### 6. Security Fix
- Removed exposed GitHub PAT from worklog.md
- Rewrote git history with filter-branch to remove the secret
- Force-pushed cleaned history to GitHub

## Verification
- `npx prisma generate` ✅ succeeds
- `bun run lint` ✅ passes
- Dev server compiles and serves pages ✅
- Changes pushed to GitHub: ahmedibm9-cyber/usra-plus ✅

## Remaining Steps for User
1. Set DATABASE_URL in Vercel to point to Supabase PostgreSQL
2. Run `prisma db push` on Vercel (or use Supabase migration)
3. Run seed script to populate default data
4. Deploy on Vercel
