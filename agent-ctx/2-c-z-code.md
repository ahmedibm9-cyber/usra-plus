---
Task ID: 2-c
Agent: z-code
Task: Fix admin-features and admin-infrastructure pages - remove mock data, make data-driven with API routes, enhance visual uniqueness

Work Log:
- Read current admin-features.tsx (743 lines) and admin-infrastructure.tsx (767 lines) to understand structure
- Read existing API routes (analytics, users) to understand project patterns for Supabase integration
- Read Prisma schema, types/admin.ts, and supabase server.ts for context
- Created API route `/api/admin/features/route.ts` - fetches from Supabase tables (tasks, grocery_items, chat_messages, calendar_events, family_invites) with aggregate counts, daily averages, completion rates
- Created API route `/api/admin/infrastructure/route.ts` - fetches from Supabase for table row counts, recent activity (24h), active connections, user growth rate
- Rewrote admin-features.tsx:
  - Removed all hardcoded mock data: FEATURES (16 rows), FUNNEL_STEPS, UPGRADE_PROMPTS, ADOPTION_OVER_TIME, TOP_STATS
  - Added `useEffect` + `fetchData` to call `/api/admin/features`
  - Added loading state with Loader2 spinner
  - Added empty state with FlaskConical icon and "No Feature Data Yet" message
  - Kept all unique visual components: Sparkline, MiniBarBg, CircularProgress, FeatureCard, VerticalFunnel, AdoptionChart
  - Made all components data-driven: TopStats from API data, FeatureRows built from API response, FunnelSteps derived from table counts, Quick Insights calculated from actual feature data
  - Added data source indicator badge (Live / No Data) in page header
- Rewrote admin-infrastructure.tsx:
  - Removed all hardcoded mock data: UPTIME_DAYS, DB_SIZE_DATA, STORAGE_DATA, API_REQUEST_DATA, ERROR_LOGS, SECURITY_EVENTS
  - Added `useEffect` + `fetchData` to call `/api/admin/infrastructure`
  - Added loading state with terminal-style "$ usra-infra --connect" animation
  - Added empty state with WifiOff icon and terminal-style retry button
  - Kept terminal aesthetic: BlinkingCursor, TerminalBlockHeader, TerminalBlock, TerminalHeader typing animation
  - Added new components: TableRowCounts (bar chart per table), RecentActivityTerminal (ASCII bar chart), LiveConnectionIndicator, GrowthMetric
  - Added live clock updating every second for terminal feel
  - Replaced recharts (LineChart, AreaChart, BarChart) with terminal-native visualizations (ASCII bars, inline bars)
  - Made security dashboard data-driven (shows 0 threats when no data, clean state)
  - Performance metrics now show real data from API
- Ran ESLint on all changed files - no errors
- Checked dev server log - no compilation errors

Stage Summary:
- Both pages now fetch data from Supabase via API routes instead of using hardcoded mock arrays
- Both show clear empty states when no data is available
- Features page retained its Product Intelligence Lab aesthetic (sparklines, circular progress, vertical funnel, card-based feature list)
- Infrastructure page doubled down on terminal aesthetic (live clock, ASCII bar charts, terminal blocks, typing animation, connection indicator)
- Pages are now visually MORE distinct: Features uses amber/orange cards with sparklines/charts, Infrastructure uses dark terminal blocks with ASCII art and monospace
- No hardcoded mock/placeholder data remains in either component
