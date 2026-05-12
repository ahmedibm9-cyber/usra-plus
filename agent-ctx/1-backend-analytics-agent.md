# Task 1 - Backend Analytics Agent

## Summary
Created backend API routes for the Super Admin analytics system that query real Supabase data (privacy-safe aggregates only), plus a Demo Mode banner component and admin data hooks.

## Files Created
- `/src/app/api/admin/analytics/route.ts` - Supabase service role queries for aggregate metrics across 6 tables
- `/src/app/api/admin/users/route.ts` - Profiles table with pagination, privacy-safe fields only
- `/src/app/api/admin/families/route.ts` - Families table with aggregate metrics and activity scores
- `/src/components/admin/demo-mode-banner.tsx` - Dismissible amber banner for demo mode indication
- `/src/hooks/use-admin-data.ts` - Custom React hooks (useAnalyticsData, useAdminUsers, useAdminFamilies)

## Files Modified
- `/src/components/admin/admin-layout.tsx` - Integrated analytics data source, dynamic Live/Demo badge, DemoModeBanner
- `/src/components/admin/pages/admin-support.tsx` - Fixed pre-existing lint error (render-time mutation)

## Key Decisions
- All API routes use Supabase service role key for admin-level queries
- Graceful degradation: returns demo data with `source: "demo"` flag when tables don't exist
- Privacy-first: only aggregate counts and safe metadata, never personal content
- Activity score algorithm: tasks (50%) + members (30%) + recency (20%)
- Hooks use AbortController for cleanup and handle errors by falling back to demo
