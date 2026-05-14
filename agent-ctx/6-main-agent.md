---
Task ID: 6
Agent: Main Agent
Task: Upgrade super-admin dashboard with real metrics, system health, and diagnostics. Clean up dead code and optimize the codebase.

Work Log:
- Read existing admin pages (admin-overview.tsx, admin-bug-detection.tsx, admin-settings.tsx), stores (admin-store.ts, bug-detection-store.ts), hooks (use-admin-data.ts), and API routes (overview, error-log, system, api-health, performance)
- Created new API endpoint `/api/admin/system-health/route.ts`:
  - GET: Returns real-time system health (server status, active connections, error rate, avg response time)
  - GET: Feature health checks (Auth, Realtime, Database, Storage) with actual connectivity tests
  - GET: Demo account management stats (demo user/family counts, can seed/clear flags)
  - GET: Failed page diagnostics (URLs that failed, error frequency chart data)
  - GET: Layout diagnostics (theme mode, RTL status, sidebar state, viewport dimensions)
  - GET: Realtime subscription monitor (active channel count, channel names, connection status)
  - GET: Real vs Demo metrics (separates real users from demo accounts)
  - POST: Actions for seed_demo, clear_demo, clear_cache
- Enhanced `admin-overview.tsx`:
  - Added SystemHealthPanel: shows server status (online/offline), active connections, error rate (24h), avg response time
  - Added FeatureHealthPanel: shows Auth/Realtime/Database/Storage health with ✅/❌ indicators and response times
  - Added DemoManagementPanel: seed demo data button, clear demo data button, demo user/family counts
  - Added FailedPageDiagnosticsPanel: list of failed pages with frequency, error frequency bar chart (24h)
  - Added LayoutDiagnosticsPanel: theme mode, RTL status, sidebar state, viewport size
  - Added RealtimeMonitorPanel: active channel count, channel names, connection status
  - Added RealMetricsBanner: warns when demo user percentage is high, separates real vs demo user counts
  - All data fetched from real /api/admin/system-health endpoint
  - Layout diagnostics auto-updated from client-side (window resize, class/dir mutations)
- Enhanced `admin-bug-detection.tsx`:
  - Added server-side error fetching from /api/admin/error-log API
  - Combined client + server errors into unified view with deduplication
  - Added severity breakdown bar (visual bar showing critical/error/warning/info counts)
  - Added console error frequency chart (24h bar chart using recharts)
  - Added page load failures section (grouped by URL with occurrence counts)
  - Added "Dismiss All" button to bulk-dismiss active errors
  - Error stats now include dismissed count
  - All error rows show expandable details with stack trace, URL, location, browser info
  - Resolve/Escalate/Dismiss actions per error
- Enhanced `admin-settings.tsx`:
  - Added new "System Config" tab (Tab 1):
    - System Configuration: switches for Enable Registration, Google OAuth, Demo Mode, Rate Limiting; number inputs for Max Upload Size, Session Timeout
    - Save Configuration button that persists to database via /api/admin/system
  - Cache Management section: Clear Cache button (calls /api/admin/system-health POST clear_cache), Sync Feature Flags button
  - Maintenance Mode Settings section: switch toggle for maintenance mode with ACTIVE/OFF status chip
  - Adjusted all tab indices to account for new tab
- Codebase cleanup:
  - Verified no `import * from '@mui/material'` barrel imports exist (none found)
  - Verified no `import * from '@mui/icons-material'` imports exist (none found)
  - Fixed `ErrorOutlined` import in admin-content.tsx (not valid in MUI v9, changed to `Error`)
- Lint passes cleanly (0 errors, 0 warnings)

Stage Summary:
- Created /api/admin/system-health API endpoint with real health diagnostics
- Admin Overview: 6 new diagnostic panels (System Health, Feature Health, Demo Management, Failed Page Diagnostics, Layout Diagnostics, Realtime Monitor) + Real vs Demo metrics banner
- Admin Bug Detection: Server-side error integration, severity breakdown, error frequency chart, page load failures, dismiss all
- Admin Settings: New System Config tab with feature flags, cache management, maintenance mode toggle
- Codebase cleanup: Fixed ErrorOutlined MUI v9 compatibility, verified no wildcard MUI imports
- All lint checks pass (0 errors, 0 warnings)
