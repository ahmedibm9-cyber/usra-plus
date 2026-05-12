# Task 2-a: System Route Fix Agent

## Task
Fix /api/admin/system route to use Supabase REST API as primary data source

## Work Completed

### Modified Files
- `/home/z/my-project/src/app/api/admin/system/route.ts`
- `/home/z/my-project/worklog.md` (appended work log)

### Changes Made

1. **Added Supabase REST API as primary data source** in GET handler:
   - Imported `getSupabaseAdmin` from `@/lib/supabase/admin`
   - Imported `getDatabaseProvider` from `@/lib/db`
   - Added `safeCount()` helper (returns -1 on failure)
   - Added `getTableCountViaSupabase()` helper for Supabase REST API counts
   - Created `SUPABASE_TABLE_MAP` mapping all 18 Prisma models to Supabase table names

2. **GET handler flow**:
   - Try Supabase REST API first for table counts
   - If ALL Supabase counts fail, fall back to Prisma with individual safeCount wrappers
   - Feature flags: Try `supabase.from('feature_flags').select('*')`, fallback to Prisma
   - System settings: Try `supabase.from('system_settings').select('*')`, fallback to Prisma
   - Backups: Wrapped in try/catch, returns empty array on failure
   - If both fail entirely, returns graceful empty data (NOT 500)

3. **POST handler**: Left completely unchanged

4. **Helper functions**:
   - `getPrismaTableCounts()` - individual safeCount for each table
   - `getPrismaFeatureFlags()` - try/catch returning empty array on failure
   - `getPrismaSystemSettings()` - try/catch returning empty array on failure
   - `getTableCounts()` - updated to use safeCount (used by POST actions)

5. **Other improvements**:
   - `isPostgreSQL()` now uses `getDatabaseProvider()` instead of raw env check
   - Feature flags data from Supabase handles both snake_case and camelCase column names
   - Zero new lint errors introduced

## Verification
- `bun run lint` shows no new errors in the modified file
- Dev server running on port 3000
