---
Task ID: 2
Agent: full-stack-developer (seed + API routes)
Task: Create database seed script and all admin API routes

Work Log:
- Read existing Prisma schema, package.json, .env, and project structure
- Created comprehensive seed script at `/home/z/my-project/prisma/seed.ts` with:
  - 20 users (3 admin, 1 super_admin, 12 parents, 5 children, 1 inactive)
  - 28 devices linked to appropriate users
  - 120 activity logs across categories (auth, app, web, system, alert) and severities over 30 days
  - 14 subscriptions (mix of free, basic, premium, enterprise plans)
  - 6 SystemHealth entries (5 operational, 1 degraded for storage)
  - 10 BugReports with varying severities and statuses
  - 22 SystemSettings across categories (general, security, notifications, limits, api)
  - 5 PlatformStats entries for the past week
- Added `"db:seed": "bun prisma/seed.ts"` to package.json scripts
- Created 6 admin API route files:
  - `/api/admin/health` — GET: detects DB provider, checks connectivity, returns service health
  - `/api/admin/stats` — GET: returns user/device/alert/revenue stats, plan distribution, activity breakdown
  - `/api/admin/activity` — GET: paginated activity logs with filtering by category/severity/search
  - `/api/admin/infrastructure` — GET: system health, DB provider info, uptime/response time stats
  - `/api/admin/bugs` — GET: bug reports with filtering and statistics by severity/status
  - `/api/admin/settings` — GET: settings grouped by category; PUT: update setting by key
- Ran `bun run db:push` and `bun run db:seed` successfully
- Verified all 6 API endpoints return correct data via curl
- Ran `bun run lint` — no errors

Stage Summary:
- Seed script: `/home/z/my-project/prisma/seed.ts` (populates 8 tables with realistic data)
- API routes: 6 route files in `/home/z/my-project/src/app/api/admin/`
- All routes use `import { db } from '@/lib/db'` for Prisma
- All routes have proper try/catch error handling with NextResponse status codes
- Database provider detection correctly identifies SQLite from `DATABASE_URL` pattern
- Package.json updated with `db:seed` script
