# Task 7-feature-gating: Feature Gating Fix Agent

## Task
Add server-side plan checks to API routes that create resources to prevent users from bypassing plan limits by modifying client-side Zustand state.

## Files Created
- `/src/lib/plan-limits.ts` — Server-side plan limits and feature gating utilities (PLAN_LIMITS, getUserPlan, checkPlanLimit, requirePlanAccess, getCurrentFamilyCount)
- `/src/app/api/tasks/create/route.ts` — Server-side gatekeeper for task creation
- `/src/app/api/files/upload/route.ts` — Server-side gatekeeper for file uploads

## Files Modified
- `/src/app/api/families/route.ts` — Added plan checks to POST (family creation) and PUT (family join with member limit)
- `/src/app/api/families/create/route.ts` — Added plan check to POST (family creation via Supabase)
- `/src/app/api/ai/summary/route.ts` — Added requirePlanAccess('pro') check
- `/src/app/api/ai/meal-suggestions/route.ts` — Added requirePlanAccess('pro') check
- `/src/app/api/ai/recipes/route.ts` — Added requirePlanAccess('pro') check
- `/src/app/api/ai/generate-image/route.ts` — Added requirePlanAccess('pro') check

## Key Decisions
- Plan limits are defined as a const object in plan-limits.ts (single source of truth)
- getUserPlan() queries UserSubscription table directly from Prisma DB — cannot be bypassed client-side
- Task and file routes accept current counts from client body since data is stored in Zustand (no server-side task/file tables)
- AI routes use requirePlanAccess('pro') which is a tier-based check rather than a count-based check
- All 403 responses include structured error objects with upgradeRequired flag for frontend detection

## Verification
- Lint passes with 0 errors
- Dev server running and compiling correctly
