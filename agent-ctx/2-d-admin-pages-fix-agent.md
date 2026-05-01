# Task 2-d: Admin Pages Fix Agent

## Task
Remove hardcoded mock data from Admin Support and Admin Settings pages, add API-backed data fetching and empty states.

## Files Changed
1. `src/app/api/admin/support/route.ts` - NEW: API route for support data
2. `src/components/admin/pages/admin-support.tsx` - REWRITTEN: Removed all mock data, added API fetching + empty states
3. `src/components/admin/pages/admin-settings.tsx` - MODIFIED: Removed DEMO_ADMIN_USERS, made admin users data-driven

## Key Decisions
- Support page fetches from `/api/admin/support?section=all` on mount
- API returns empty data structures when no records exist (not 404)
- Settings page initializes adminUsers from the logged-in admin user via useAdminAuthStore
- Added AdminAccessUser interface separate from AdminUser type (simpler, includes status field)
- handleAddAdmin now actually adds users to adminUsers state array
- Zustand store data (featureFlags, planConfigs, announcements) in Settings is NOT mock data - it's operational data managed by the admin

## Status
- All changes complete
- Lint passes clean
- Dev server HTTP 200
