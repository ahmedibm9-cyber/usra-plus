# Task 6-7-8 — Supabase Persistence Agent

## Task
Add Supabase persistence to THREE features (Meal Plan, Chores, Milestones) that currently have ZERO database connection.

## Work Summary

### Feature 1: Meal Plan (Task 6)
- **Store**: `src/stores/meal-store.ts` — Added `supabaseAvailable` flag, `isTableNotFoundError()` helper, and 4 Supabase CRUD methods (`fetchFromSupabase`, `addMealToSupabase`, `updateMealInSupabase`, `removeMealFromSupabase`). Maps `meal_type`↔`mealType`, `meal_date`↔`date`, `assigned_to`↔`assignedTo`, `recipe_url`↔`recipeUrl`, `prep_time`↔`prepTime`, `created_by`↔`createdBy`, `created_at`↔`createdAt`.
- **Page**: `src/components/meal-plan/meal-plan-page.tsx` — Converted to selector-based subscriptions (9 selectors), added Supabase fetch useEffects, replaced direct mutations with Supabase-backed functions, changed IDs to `crypto.randomUUID()`.

### Feature 2: Chores (Task 7)
- **Store**: `src/stores/chore-store.ts` — Added `isLoading`, `supabaseAvailable` flags, `isTableNotFoundError()` helper, and 5 Supabase CRUD methods (`fetchFromSupabase`, `addChoreToSupabase`, `updateChoreInSupabase`, `removeChoreFromSupabase`, `logCompletionToSupabase`). Fetches both `chores` and `chore_logs` tables. Maps `assigned_to`↔`assignedTo`, `rotation_order`↔`rotationOrder`, `current_assignee_index`↔`currentAssigneeIndex`, etc.
- **Page**: `src/components/chores/chores-page.tsx` — Converted to selector-based subscriptions (9 selectors + AddChoreForm selectors), added Supabase fetch useEffects, replaced direct mutations with Supabase-backed functions, added `useAuthStore` for user context, handles pause/resume sync to Supabase.

### Feature 3: Milestones (Task 8)
- **Store**: `src/stores/milestone-store.ts` — Added `supabaseAvailable` flag, `isTableNotFoundError()` helper, and 4 Supabase CRUD methods (`fetchFromSupabase`, `addMilestoneToSupabase`, `updateMilestoneInSupabase`, `removeMilestoneFromSupabase`). Fetches with `profiles` join for `personName`. Maps `milestone_date`↔`date`, `person_id`↔`personId`, `is_recurring`↔`isRecurring`, `notify_days_before`↔`notifyDaysBefore`.
- **Page**: `src/components/milestones/milestones-page.tsx` — Converted to selector-based subscriptions (6 selectors), added Supabase fetch useEffects, replaced direct mutations with Supabase-backed functions, added `useAuthStore` for user context.

## Pattern Followed
Same pattern as `budget-store.ts`:
1. Keep existing local state/actions as local cache
2. Add Supabase methods that do optimistic local update then try Supabase
3. Catch PGRST205 errors and fall back to local-only mode
4. Pages use selector-based subscriptions and useEffect for initial fetch
5. Use `crypto.randomUUID()` for new record IDs

## Verification
- `bun run lint` — 0 errors, 0 warnings
- Dev server running normally (HTTP 200)
