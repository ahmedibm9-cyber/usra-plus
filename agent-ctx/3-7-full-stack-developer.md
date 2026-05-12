# Task 3-7: Fix Admin Dashboard Issues

## Agent: full-stack-developer (admin fixes)

## Summary of Changes

### 1. Database Provider Detection Fix (`src/lib/db.ts`)
- Updated `getDatabaseProvider()` to check `DATABASE_PROVIDER` env var FIRST, then fall back to `DATABASE_URL` pattern detection
- This fixes the core issue where production (using PostgreSQL/Supabase) was incorrectly detected as SQLite

### 2. API Routes Fixed
- `bugs/route.ts`: Changed `isPostgreSQL()` to use `getDatabaseProvider()` from `@/lib/db`
- `health/route.ts`: Changed `detectDatabaseProvider()` to use shared `getDatabaseProvider()`
- New `db-info/route.ts`: API endpoint returning provider info for frontend consumption

### 3. Frontend Components Fixed
- `admin-activity.tsx`: Removed "Pre-Launch Mode", "Connected to local SQLite", hardcoded "SQLite" badge; now uses dynamic db provider info
- `admin-infrastructure.tsx`: Added React error boundary to catch rendering crashes
- `admin-overview.tsx`: Removed hardcoded "SQLite" badge, "Pre-launch" text; now uses dynamic db provider
- `admin-revenue.tsx`: Replaced "Pre-Launch" with "No Data" / "No Revenue Data Yet"
- `admin-moderation.tsx`: Replaced "Pre-Launch" badge with "No Data"
- `admin-features.tsx`: Replaced "Pre-Launch" badge with "No Data"

### 4. Lint Results
- 59 problems (56 errors, 3 warnings) — all pre-existing
- Fixed 1 existing error (mapFeedType variable declaration order)
- No new errors introduced

### Files Modified
1. `src/lib/db.ts` - getDatabaseProvider() now checks DATABASE_PROVIDER first
2. `src/app/api/admin/bugs/route.ts` - uses shared getDatabaseProvider()
3. `src/app/api/admin/health/route.ts` - uses shared getDatabaseProvider()
4. `src/app/api/admin/db-info/route.ts` - NEW: API endpoint for frontend db provider info
5. `src/components/admin/pages/admin-activity.tsx` - dynamic db provider, no "Pre-Launch"
6. `src/components/admin/pages/admin-infrastructure.tsx` - error boundary added
7. `src/components/admin/pages/admin-overview.tsx` - dynamic db provider, no "Pre-Launch"
8. `src/components/admin/pages/admin-revenue.tsx` - no "Pre-Launch"
9. `src/components/admin/pages/admin-moderation.tsx` - no "Pre-Launch"
10. `src/components/admin/pages/admin-features.tsx` - no "Pre-Launch"
