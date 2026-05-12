---
Task ID: 2-a
Agent: Admin Pages Refactor Agent
Task: Remove mock data from Admin Overview and Subscriptions pages, make data-driven with Supabase

Work Log:
- Read existing admin-overview.tsx and admin-subscriptions.tsx to understand hardcoded mock data patterns
- Read existing API routes and hooks to understand the data fetching architecture
- Created /src/app/api/admin/overview/route.ts: Fetches overview data from Supabase, returns empty data with source='demo' when not connected
- Created /src/app/api/admin/subscriptions/route.ts: Fetches subscription data from Supabase, returns empty data with source='demo' when not connected
- Extended /src/hooks/use-admin-data.ts: Added useOverviewData and useSubscriptionData hooks with full TypeScript types
- Rewrote admin-overview.tsx: Removed ALL mock data, data-driven with empty states, command center layout
- Rewrote admin-subscriptions.tsx: Removed ALL mock data, data-driven with empty states, Stripe-like layout

Stage Summary:
- Both admin pages are fully data-driven with NO hardcoded mock/placeholder data
- API routes created with Supabase support and demo fallback returning empty arrays
- Empty states show "Waiting for data" messages when no database connection
- "Simulated" badge only shows when there IS simulated data being displayed
- All existing visual elements preserved (animated counter, sparkline, donut chart, terminal feed, pillar cards, cohort heatmap)
- ESLint: PASS
