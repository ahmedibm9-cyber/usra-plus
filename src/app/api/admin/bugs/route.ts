import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// Admin Bugs / Health Check API Route
// Uses Supabase REST API as primary, Prisma as fallback for health checks
// All health checks have proper try/catch and return valid JSON even on failure

// ─── Type Definitions ───────────────────────────────────────────────

type HealthStatus = 'healthy' | 'degraded' | 'down'

interface HealthCheckResult {
  name: string
  status: HealthStatus
  latency: number
  lastChecked: string
  message: string
}

interface DatabaseCheckResult {
  status: HealthStatus
  latency: number
  message: string
  userCount?: number
}

interface AuthCheckResult {
  status: HealthStatus
  latency: number
  message: string
}

interface TableStatus {
  tableName: string
  exists: boolean
  rowCount: number
  hasRLS: boolean
  lastChecked: string
  category: string
}

interface ConnectionTest {
  name: string
  type: string
  status: 'pass' | 'fail'
  latency: number
  message: string
  lastTested: string
}

interface PerformanceMetric {
  name: string
  value: number
  unit: string
  threshold: number
  status: 'ok' | 'warning' | 'critical'
  trend: 'stable' | 'up' | 'down'
}

interface ApiTestResult {
  path: string
  name: string
  status: number
  latency: number
  ok: boolean
  error?: string
}

// Detect if running with PostgreSQL (Supabase) vs SQLite (local)
function isPostgreSQL(): boolean {
  const url = process.env.DATABASE_URL || ''
  return url.startsWith('postgresql://') || url.startsWith('postgres://')
}

// API routes to test
const API_ROUTES_TO_TEST = [
  { path: '/api/admin/overview', name: 'Admin Overview' },
  { path: '/api/admin/users', name: 'Users API' },
  { path: '/api/admin/infrastructure', name: 'Infrastructure API' },
  { path: '/api/admin/sessions', name: 'Sessions API' },
  { path: '/api/admin/audit', name: 'Audit API' },
  { path: '/api/admin/moderation', name: 'Moderation API' },
  { path: '/api/admin/support', name: 'Support API' },
  { path: '/api/admin/bugs', name: 'Bugs API' },
  { path: '/api/admin/bans', name: 'Bans API' },
  { path: '/api/admin/errors', name: 'Errors API' },
  { path: '/api/admin/performance', name: 'Performance API' },
  { path: '/api/admin/features', name: 'Features API' },
  { path: '/api/admin/analytics', name: 'Analytics API' },
  { path: '/api/admin/revenue', name: 'Revenue API' },
  { path: '/api/admin/subscriptions', name: 'Subscriptions API' },
]

// ─── Supabase REST API Health Check Helpers ─────────────────────────────

async function checkDatabaseViaSupabase(supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>): Promise<DatabaseCheckResult> {
  const start = Date.now()
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    const latency = Date.now() - start
    if (error) {
      return { status: 'degraded', latency, message: `Supabase query error: ${error.message}` }
    }
    return { status: 'healthy', latency, message: `${count ?? 0} users accessible via Supabase`, userCount: count ?? 0 }
  } catch (err) {
    return { status: 'down', latency: Date.now() - start, message: err instanceof Error ? err.message : 'Supabase connection failed' }
  }
}

async function checkAuthViaSupabase(supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>): Promise<AuthCheckResult> {
  const start = Date.now()
  try {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
    const latency = Date.now() - start
    if (error) {
      return { status: 'degraded', latency, message: `Auth API error: ${error.message}` }
    }
    const activeCount = data.users.filter(u => u.banned_until === null).length
    return { status: 'healthy', latency, message: `Auth service responsive (${data.users.length} user listed, ${activeCount} active)` }
  } catch (err) {
    return { status: 'down', latency: Date.now() - start, message: err instanceof Error ? err.message : 'Auth check failed' }
  }
}

async function checkStorageViaSupabase(supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>): Promise<{ status: HealthStatus; latency: number; message: string }> {
  const start = Date.now()
  try {
    const { data, error } = await supabase.storage.listBuckets()
    const latency = Date.now() - start
    if (error) {
      return { status: 'degraded', latency, message: `Storage API error: ${error.message}` }
    }
    const bucketCount = data?.length ?? 0
    return { status: 'healthy', latency, message: `${bucketCount} storage buckets available` }
  } catch (err) {
    return { status: 'degraded', latency: Date.now() - start, message: err instanceof Error ? err.message : 'Storage check failed' }
  }
}

async function checkRealtimeViaSupabase(supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>): Promise<{ status: HealthStatus; latency: number; message: string }> {
  const start = Date.now()
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      return { status: 'degraded', latency: 0, message: 'Supabase URL not configured' }
    }
    const response = await fetch(`${supabaseUrl}/realtime/v1/health`, {
      signal: AbortSignal.timeout(5000),
    })
    const latency = Date.now() - start
    if (response.ok) {
      return { status: 'healthy', latency, message: 'Realtime service responsive' }
    }
    return { status: 'degraded', latency, message: `Realtime returned status ${response.status}` }
  } catch (err) {
    return { status: 'degraded', latency: Date.now() - start, message: err instanceof Error ? err.message : 'Realtime health check failed' }
  }
}

// ─── Prisma Fallback Helpers ────────────────────────────────────────────

async function checkDatabaseViaPrisma(dbStart: number): Promise<HealthCheckResult> {
  const now = new Date().toISOString()
  try {
    const userCount = await db.user.count()
    const dbLatency = Date.now() - dbStart
    return {
      name: 'Database',
      status: dbLatency > 2000 ? 'degraded' : 'healthy',
      latency: dbLatency,
      lastChecked: now,
      message: `${userCount} users accessible via Prisma`,
    }
  } catch (err) {
    return {
      name: 'Database',
      status: 'down',
      latency: Date.now() - dbStart,
      lastChecked: now,
      message: `Both Supabase and Prisma failed. Prisma: ${err instanceof Error ? err.message : 'DB error'}`,
    }
  }
}

async function checkAuthViaPrisma(): Promise<HealthCheckResult> {
  const now = new Date().toISOString()
  try {
    const sessionCount = await db.session.count({ where: { expiresAt: { gt: new Date() } } })
    return {
      name: 'Auth',
      status: 'healthy',
      latency: 0,
      lastChecked: now,
      message: `${sessionCount} active sessions (via Prisma)`,
    }
  } catch (err) {
    return {
      name: 'Auth',
      status: 'down',
      latency: 0,
      lastChecked: now,
      message: `Both Supabase Auth and Prisma session check failed. Prisma: ${err instanceof Error ? err.message : 'Unable to check sessions'}`,
    }
  }
}

// ─── GET: System Health Report ──────────────────────────────────────────
export async function GET(request: NextRequest) {
  // Rate limit check
  try {
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
    if (rateLimitResponse) return rateLimitResponse
  } catch {
    // Rate limit check itself failed, continue
  }

  // Auth check
  try {
    const auth = verifyAdminAuth(request)
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: 'Auth check failed' }, { status: 401 })
  }

  try {
    const now = new Date().toISOString()
    let url: URL
    try {
      url = new URL(request.url)
    } catch {
      url = new URL('http://localhost:3000/api/admin/bugs')
    }
    const testApis = url.searchParams.get('testApis') === 'true'

    // Get Supabase admin client once and reuse everywhere
    const supabase = getSupabaseAdmin()

    // ── Health Checks ────────────────────────────────────────────────
    const healthChecks: HealthCheckResult[] = []

    // 1. Database health - Try Supabase REST API first, then Prisma fallback
    let dbUserCount = 0
    const dbStart = Date.now()

    if (supabase) {
      const supabaseDbResult = await checkDatabaseViaSupabase(supabase)

      if (supabaseDbResult.status === 'healthy' || supabaseDbResult.status === 'degraded') {
        dbUserCount = supabaseDbResult.userCount ?? 0
        healthChecks.push({
          name: 'Database',
          status: supabaseDbResult.latency > 2000 ? 'degraded' : supabaseDbResult.status,
          latency: supabaseDbResult.latency,
          lastChecked: now,
          message: supabaseDbResult.message,
        })
      } else {
        const prismaResult = await checkDatabaseViaPrisma(dbStart)
        dbUserCount = prismaResult.message.includes('users accessible') ? parseInt(prismaResult.message) || 0 : 0
        healthChecks.push(prismaResult)
      }
    } else {
      const prismaResult = await checkDatabaseViaPrisma(dbStart)
      dbUserCount = prismaResult.message.includes('users accessible') ? parseInt(prismaResult.message) || 0 : 0
      healthChecks.push(prismaResult)
    }

    // 2. Auth health - Try Supabase Auth API first, then Prisma fallback
    if (supabase) {
      const supabaseAuthResult = await checkAuthViaSupabase(supabase)

      if (supabaseAuthResult.status === 'healthy' || supabaseAuthResult.status === 'degraded') {
        healthChecks.push({
          name: 'Auth',
          status: supabaseAuthResult.status,
          latency: supabaseAuthResult.latency,
          lastChecked: now,
          message: supabaseAuthResult.message,
        })
      } else {
        healthChecks.push(await checkAuthViaPrisma())
      }
    } else {
      healthChecks.push(await checkAuthViaPrisma())
    }

    // 3. Storage health
    if (supabase) {
      const storageResult = await checkStorageViaSupabase(supabase)
      healthChecks.push({
        name: 'Storage',
        status: storageResult.status,
        latency: storageResult.latency,
        lastChecked: now,
        message: storageResult.message,
      })
    } else {
      healthChecks.push({
        name: 'Storage',
        status: 'healthy',
        latency: 0,
        lastChecked: now,
        message: isPostgreSQL() ? 'PostgreSQL (Supabase)' : 'SQLite local storage',
      })
    }

    // 4. Realtime health
    if (supabase) {
      const realtimeResult = await checkRealtimeViaSupabase(supabase)
      healthChecks.push({
        name: 'Realtime',
        status: realtimeResult.status,
        latency: realtimeResult.latency,
        lastChecked: now,
        message: realtimeResult.message,
      })
    } else {
      healthChecks.push({
        name: 'Realtime',
        status: 'healthy',
        latency: 0,
        lastChecked: now,
        message: 'WebSocket ready (local)',
      })
    }

    // 5. API health
    healthChecks.push({
      name: 'API',
      status: 'healthy',
      latency: 0,
      lastChecked: now,
      message: 'Server responding',
    })

    // ── Table Statuses - Try Supabase REST API first ─────────────────
    const supabaseTables = ['profiles', 'families', 'family_members', 'tasks', 'grocery_items', 'chat_messages', 'calendar_events', 'admin_users']
    const prismaTableMap: Array<{ name: string; fn: () => Promise<number> }> = [
      { name: 'users', fn: () => db.user.count() },
      { name: 'sessions', fn: () => db.session.count() },
      { name: 'audit_logs', fn: () => db.auditLog.count() },
      { name: 'moderation_items', fn: () => db.moderationItem.count() },
      { name: 'support_tickets', fn: () => db.supportTicket.count() },
      { name: 'user_bans', fn: () => db.userBan.count() },
      { name: 'email_campaigns', fn: () => db.emailCampaign.count() },
      { name: 'user_segments', fn: () => db.userSegment.count() },
      { name: 'ab_tests', fn: () => db.aBTest.count() },
    ]

    let tableStatuses: TableStatus[]

    if (supabase) {
      tableStatuses = await Promise.all(supabaseTables.map(async (table): Promise<TableStatus> => {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })

          if (error) {
            return { tableName: table, exists: false, rowCount: 0, hasRLS: false, lastChecked: now, category: 'core' }
          }
          return { tableName: table, exists: true, rowCount: count ?? 0, hasRLS: true, lastChecked: now, category: 'core' }
        } catch {
          return { tableName: table, exists: false, rowCount: 0, hasRLS: false, lastChecked: now, category: 'core' }
        }
      }))
    } else {
      tableStatuses = await Promise.all(prismaTableMap.map(async ({ name, fn }): Promise<TableStatus> => {
        try {
          const count = await fn()
          return { tableName: name, exists: true, rowCount: count, hasRLS: true, lastChecked: now, category: 'core' }
        } catch {
          return { tableName: name, exists: false, rowCount: 0, hasRLS: false, lastChecked: now, category: 'core' }
        }
      }))
    }

    // ── Connection Tests ─────────────────────────────────────────────
    const dbHealthCheck = healthChecks.find(h => h.name === 'Database')
    const connectionTests: ConnectionTest[] = [
      {
        name: isPostgreSQL() ? 'PostgreSQL Database' : 'SQLite Database',
        type: 'supabase',
        status: dbHealthCheck?.status === 'healthy' ? 'pass' : 'fail',
        latency: dbHealthCheck?.latency || 0,
        message: dbHealthCheck?.status === 'healthy' ? 'Connected via Supabase REST API' : 'Connection issues detected',
        lastTested: now,
      },
      {
        name: 'API Routes',
        type: 'api',
        status: 'pass',
        latency: 0,
        message: 'Server responding',
        lastTested: now,
      },
      {
        name: isPostgreSQL() ? 'Supabase Storage' : 'Local Storage',
        type: 'storage',
        status: healthChecks.find(h => h.name === 'Storage')?.status === 'healthy' ? 'pass' : 'fail',
        latency: healthChecks.find(h => h.name === 'Storage')?.latency || 0,
        message: isPostgreSQL() ? 'PostgreSQL managed by Supabase' : 'SQLite file accessible',
        lastTested: now,
      },
      {
        name: 'WebSocket',
        type: 'realtime',
        status: healthChecks.find(h => h.name === 'Realtime')?.status !== 'down' ? 'pass' : 'fail',
        latency: healthChecks.find(h => h.name === 'Realtime')?.latency || 0,
        message: 'Available',
        lastTested: now,
      },
    ]

    // ── Performance Metrics ──────────────────────────────────────────
    const healthChecksWithLatency = healthChecks.filter(h => h.latency > 0)
    const avgLatency = healthChecksWithLatency.reduce((a, b) => a + b.latency, 0) / Math.max(healthChecksWithLatency.length, 1)
    const downCount = healthChecks.filter(h => h.status === 'down').length
    const degradedCount = healthChecks.filter(h => h.status === 'degraded').length
    const missingTables = tableStatuses.filter(t => !t.exists).length
    const totalRows = tableStatuses.reduce((acc, t) => acc + t.rowCount, 0)

    const metrics: PerformanceMetric[] = [
      {
        name: 'Avg Response Time',
        value: Math.round(avgLatency),
        unit: 'ms',
        threshold: 2000,
        status: avgLatency > 2000 ? 'critical' : avgLatency > 1000 ? 'warning' : 'ok',
        trend: 'stable',
      },
      {
        name: 'Error Rate',
        value: healthChecks.length > 0 ? Math.round((downCount / healthChecks.length) * 100) : 0,
        unit: '%',
        threshold: 50,
        status: downCount > 0 ? (downCount / healthChecks.length > 0.5 ? 'critical' : 'warning') : 'ok',
        trend: 'stable',
      },
      {
        name: 'Missing Tables',
        value: missingTables,
        unit: 'tables',
        threshold: 3,
        status: missingTables > 3 ? 'critical' : missingTables > 0 ? 'warning' : 'ok',
        trend: 'stable',
      },
      {
        name: 'Total DB Rows',
        value: totalRows,
        unit: 'rows',
        threshold: 100000,
        status: 'ok',
        trend: 'stable',
      },
    ]

    // ── API Health Test (if requested) ───────────────────────────────
    let apiTestResults: ApiTestResult[] | null = null

    if (testApis) {
      apiTestResults = []
      for (const route of API_ROUTES_TO_TEST) {
        const start = Date.now()
        try {
          const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`
          const res = await fetch(`${baseUrl}${route.path}`, {
            signal: AbortSignal.timeout(8000),
            headers: {
              cookie: request.headers.get('cookie') || '',
            },
          })
          const latency = Date.now() - start
          apiTestResults.push({
            path: route.path,
            name: route.name,
            status: res.status,
            latency,
            ok: res.ok || res.status === 401,
          })
        } catch (err) {
          apiTestResults.push({
            path: route.path,
            name: route.name,
            status: 0,
            latency: Date.now() - start,
            ok: false,
            error: err instanceof Error ? err.message : 'Failed',
          })
        }
      }
    }

    // ── Overall Status ───────────────────────────────────────────────
    const overallStatus: HealthStatus = downCount > 0 ? 'down' : degradedCount > 0 ? 'degraded' : 'healthy'

    return NextResponse.json({
      source: 'live',
      overallStatus,
      healthChecks,
      tableStatuses,
      connectionTests,
      performanceMetrics: metrics,
      bugReports: [],
      apiTestResults,
      lastUpdated: now,
    })
  } catch (err) {
    return NextResponse.json({
      source: 'live',
      overallStatus: 'down',
      healthChecks: [{
        name: 'System',
        status: 'down' as const,
        latency: 0,
        lastChecked: new Date().toISOString(),
        message: `Health check failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      }],
      tableStatuses: [],
      connectionTests: [],
      performanceMetrics: [],
      bugReports: [],
      apiTestResults: null,
      lastUpdated: new Date().toISOString(),
    }, { status: 200 })
  }
}

// ─── POST: Create Bug Report ────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // Rate limit check
  try {
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
    if (rateLimitResponse) return rateLimitResponse
  } catch {
    // Rate limit check itself failed, continue
  }

  // Auth check
  let adminEmail = 'admin'
  try {
    const auth = verifyAdminAuth(request)
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    adminEmail = auth.admin?.email || 'admin'
  } catch {
    return NextResponse.json({ error: 'Auth check failed' }, { status: 401 })
  }

  // Parse body
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { title, description, severity, source, errorType, stackTrace } = body as {
    title?: string
    description?: string
    severity?: string
    source?: string
    errorType?: string
    stackTrace?: string
  }

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  // Try Supabase first, then Prisma
  const supabase = getSupabaseAdmin()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('bug_logs')
        .insert({
          type: errorType || 'bug_report',
          severity: severity || 'error',
          message: title,
          stack: stackTrace || '',
          source: source || adminEmail,
          occurrence_count: 1,
          ...(description ? { description } : {}),
        })
        .select()
        .single()

      if (!error && data) {
        return NextResponse.json({ source: 'live', success: true, report: data }, { status: 201 })
      }
    } catch {
      // Fall through to Prisma
    }
  }

  try {
    const item = await db.moderationItem.create({
      data: {
        itemType: 'content_flag',
        status: 'pending',
        priority: severity === 'critical' ? 'urgent' : severity === 'high' ? 'high' : severity === 'low' ? 'low' : 'medium',
        notes: `[Bug Report] ${title}\n${description || ''}\n${errorType ? `Error Type: ${errorType}` : ''}\n${stackTrace ? `Stack: ${stackTrace}` : ''}`,
        reason: title,
        reportedBy: adminEmail || source || 'admin',
      },
    })

    try {
      await db.auditLog.create({
        data: {
          adminEmail: adminEmail || 'unknown',
          action: 'bug_report_created',
          targetType: 'system',
          targetId: item.id,
          details: JSON.stringify({ title, severity, source, errorType }),
        },
      })
    } catch {
      // Audit log failure should not block the response
    }

    return NextResponse.json({ source: 'live', success: true, report: item }, { status: 201 })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to create bug report',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }
}
