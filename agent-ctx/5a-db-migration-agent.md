# Task 5a — DB Migration Agent

## Task
Create additional database tables for 4 features (budget/expenses, meal plans, chores, milestones) that had no Supabase persistence.

## Files Created
- `supabase/additional-tables.sql` — Full migration SQL with 6 tables, 23 RLS policies, 24 indexes, 5 triggers, 6 realtime publication additions
- `scripts/run-migration.ts` — Migration execution script (supports direct PG connection and Management API)
- `src/app/api/migrate/route.ts` — GET endpoint for verifying table existence

## Tables Added (6 total)
1. **budget_months** — Monthly budget categories per family (UNIQUE on family_id + month)
2. **expenses** — Individual expense tracking (9 category types, links to budget_months)
3. **meal_plans** — Daily meal planning with recipes (4 meal types, assigned_to UUID[], ingredients TEXT[])
4. **chores** — Chore definitions with rotation support (4 frequencies, difficulty levels, pause flag)
5. **chore_logs** — Completion logs for chores (CASCADE delete with chore)
6. **milestones** — Family milestone tracking (5 types, recurring flag, notify_days_before)

## Key Design Decisions
- RLS policies follow existing pattern: family members can view/create/update; owner/admin or creator can delete
- chore_logs RLS uses a JOIN through chores→family_members (since chore_logs has no direct family_id)
- All tables use gen_random_uuid() for PKs, same as existing tables
- updated_at triggers reuse existing update_updated_at() function
- Realtime publications added for all 6 tables (same pattern as chat_messages, tasks, etc.)
- expenses.currency defaults to 'SAR' (Saudi Riyal) matching the app's target market

## Migration Execution Status
- ⚠️ Automatic execution FAILED — database password and personal access token unavailable
- Migration SQL is ready for manual execution via Supabase SQL Editor
- Verification available at GET /api/migrate

## Dependencies on Previous Work
- References public.families(id) — exists in complete-migration.sql
- References public.profiles(id) — exists in complete-migration.sql
- References public.family_members — used in RLS policies
- Uses update_updated_at() function — created in complete-migration.sql
- Uses supabase_realtime publication — created in complete-migration.sql

## How to Execute Migration (Manual)
1. Go to https://supabase.com/dashboard/project/nyiioesczbsgccyosveq/sql
2. Copy contents of supabase/additional-tables.sql
3. Paste into SQL Editor and click Run
4. Verify: curl http://localhost:3000/api/migrate

## How to Execute Migration (Automated)
1. Add SUPABASE_DB_PASSWORD to .env (get from Supabase Dashboard > Settings > Database)
2. Run: bun run scripts/run-migration.ts
