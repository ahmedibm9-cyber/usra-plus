# Task 10-a: Fix Admin Analytics Pages — Use Real Prisma/SQLite Data

## Agent: Analytics Fixer
## Status: COMPLETED

## Summary
All 5 admin analytics section pages now use REAL data from the local Prisma/SQLite database instead of fake/demo data from Supabase stubs.

## What Was Wrong
- All admin API routes used `getSupabaseAdmin()` which returns `null` when Supabase env vars aren't set
- This caused all analytics pages to show either empty data or fake demo data
- The app was designed for local auth (Prisma/SQLite) but the admin APIs were only written for Supabase

## Files Modified

### API Routes (5 files — complete rewrites from Supabase to Prisma):
1. `src/app/api/admin/overview/route.ts` — Real user counts, sessions, growth time series, regional/language distribution
2. `src/app/api/admin/users/route.ts` — Real user listing from Prisma with pagination
3. `src/app/api/admin/families/route.ts` — Proper empty state (no Family model in Prisma schema)
4. `src/app/api/admin/features/route.ts` — Real user/session metrics, feature tracking unavailable flag
5. `src/app/api/admin/analytics/route.ts` — Real aggregate data from Prisma

### Frontend Pages (3 files):
1. `src/components/admin/pages/admin-overview.tsx` — Real data from API, pre-launch states, no fake metrics
2. `src/components/admin/pages/admin-activity.tsx` — Removed ALL fake demo generators, shows real data or pre-launch state
3. `src/components/admin/pages/admin-features.tsx` — Pre-launch state, feature tracking unavailable messaging

### Type Definitions (1 file):
1. `src/hooks/use-admin-data.ts` — Updated types for new API response structures

## Key Decisions
- Always return `source: 'live'` since the SQLite DB is always connected
- Added `preLaunch` flag to clearly indicate "no data yet" vs "connected but empty"
- Feature tracking fields (tasks, groceries, chat, etc.) return `null` since Prisma models don't exist
- Families return empty array with explanatory message
- Platform Health now shows real DB stats instead of hardcoded fake percentages

## Lint Results
- 0 errors, only pre-existing warnings in unrelated files
- Dev server running without compilation errors
