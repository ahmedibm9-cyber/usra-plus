import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { db, getDatabaseProvider } from '@/lib/db'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// ─── Helpers ─────────────────────────────────────────────────────────

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return {
    seconds,
    formatted: `${days}d ${hours}h ${minutes}m`,
    days,
    hours,
    minutes,
  }
}

async function safeCount(model: string): Promise<number> {
  try {
    return await (db as unknown as Record<string, { count: () => Promise<number> }>)[model]?.count() ?? -1
  } catch {
    return -1
  }
}

async function getTableCountViaSupabase(tableName: string): Promise<number> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return -1
  try {
    const { count, error } = await supabase.from(tableName).select('*', { count: 'exact', head: true })
    if (error) return -1
    return count ?? 0
  } catch {
    return -1
  }
}

// Map Prisma model names → Supabase table names
const SUPABASE_TABLE_MAP: Record<string, string> = {
  user: 'profiles',
  session: 'sessions',
  auditLog: 'audit_logs',
  moderationItem: 'moderation_items',
  supportTicket: 'support_tickets',
  userBan: 'user_bans',
  emailCampaign: 'email_campaigns',
  userSegment: 'user_segments',
  aBTest: 'ab_tests',
  family: 'families',
  familyMember: 'family_members',
  alert: 'alerts',
  activity: 'activities',
  notification: 'notifications',
  userSubscription: 'user_subscriptions',
  systemSetting: 'system_settings',
  featureFlag: 'feature_flags',
  bugLog: 'bug_logs',
}

// ─── GET Handler ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const dbProvider = getDatabaseProvider()
    const isPostgres = dbProvider === 'postgresql'
    const supabase = getSupabaseAdmin()

    // ─── Memory / OS Metrics ───────────────────────────────────────────
    const mem = process.memoryUsage()
    const heapUsedMB = mem.heapUsed / 1048576
    const heapTotalMB = mem.heapTotal / 1048576
    const rssMB = mem.rss / 1048576
    const externalMB = mem.external / 1048576
    const systemTotalMB = 4096 // Default estimate for serverless
    const systemUsedMB = rssMB
    const systemFreeMB = Math.max(0, systemTotalMB - systemUsedMB)
    const systemUsagePercent = (systemUsedMB / systemTotalMB) * 100
    const heapUsagePercent = heapTotalMB > 0 ? (heapUsedMB / heapTotalMB) * 100 : 0

    const memory = {
      heapUsedMB: Math.round(heapUsedMB * 10) / 10,
      heapTotalMB: Math.round(heapTotalMB * 10) / 10,
      rssMB: Math.round(rssMB * 10) / 10,
      externalMB: Math.round(externalMB * 10) / 10,
      systemTotalMB,
      systemFreeMB: Math.round(systemFreeMB),
      systemUsedMB: Math.round(systemUsedMB),
      systemUsagePercent: Math.round(systemUsagePercent * 10) / 10,
      heapUsagePercent: Math.round(heapUsagePercent * 10) / 10,
    }

    // ─── Uptime ────────────────────────────────────────────────────────
    const uptimeSeconds = process.uptime()
    const uptime = formatUptime(Math.floor(uptimeSeconds))

    // ─── Table Counts & Database Metrics ───────────────────────────────
    const prismaModels = ['user', 'session', 'auditLog', 'moderationItem', 'supportTicket',
      'userBan', 'emailCampaign', 'userSegment', 'aBTest', 'family', 'familyMember',
      'alert', 'activity', 'notification', 'userSubscription', 'systemSetting', 'featureFlag', 'bugLog']

    const tableCounts: Record<string, number> = {}
    let totalRows = 0
    let dbAvailable = false
    let dbSizeMB: number | string = '—'
    let availableTables = 0

    // Try Supabase REST API first
    if (supabase) {
      for (const model of prismaModels) {
        const supaTable = SUPABASE_TABLE_MAP[model] || model
        const count = await getTableCountViaSupabase(supaTable)
        if (count >= 0) {
          tableCounts[supaTable] = count
          totalRows += count
          dbAvailable = true
          availableTables++
        }
      }
    }

    // Fill in any missing counts from Prisma
    if (!dbAvailable) {
      for (const model of prismaModels) {
        const count = await safeCount(model)
        if (count >= 0) {
          const tableName = SUPABASE_TABLE_MAP[model] || model
          tableCounts[tableName] = count
          totalRows += count
          dbAvailable = true
          availableTables++
        }
      }
    }

    // Estimate DB size
    if (isPostgres && dbAvailable) {
      dbSizeMB = Math.round((totalRows * 0.002 + 5) * 100) / 100
    } else if (dbAvailable) {
      dbSizeMB = Math.round((totalRows * 0.001 + 0.5) * 100) / 100
    }

    const database = {
      sizeBytes: typeof dbSizeMB === 'number' ? dbSizeMB * 1048576 : 0,
      sizeMB: dbSizeMB,
      totalRows,
      tableCount: availableTables,
      available: dbAvailable,
      type: isPostgres ? 'PostgreSQL (Supabase)' : 'SQLite (Local)',
    }

    // ─── Active Connections / Sessions ─────────────────────────────────
    let activeConnections = 0
    if (supabase) {
      try {
        const { data: sessionsData } = await supabase
          .from('sessions')
          .select('user_id', { count: 'exact', head: false })
          .limit(1000)
        activeConnections = sessionsData?.length ?? 0
      } catch {
        // Fall through to Prisma
      }
    }
    if (activeConnections === 0) {
      activeConnections = await safeCount('session')
      if (activeConnections < 0) activeConnections = 0
    }

    // ─── Recent Activity (24h) ────────────────────────────────────────
    const recentActivity: Record<string, number> = {}
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString()

    if (supabase) {
      try {
        const { count: recentUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneDayAgo)
        if (recentUsers !== null) recentActivity['profiles'] = recentUsers

        const { count: recentSessions } = await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneDayAgo)
        if (recentSessions !== null) recentActivity['sessions'] = recentSessions

        const { count: recentFamilies } = await supabase
          .from('families')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneDayAgo)
        if (recentFamilies !== null) recentActivity['families'] = recentFamilies
      } catch {
        // Graceful degradation
      }
    }

    // If no Supabase data, try Prisma
    if (Object.keys(recentActivity).length === 0) {
      try {
        const recentUserCount = await db.user.count({
          where: { createdAt: { gte: new Date(oneDayAgo) } },
        }).catch(() => 0)
        if (recentUserCount > 0) recentActivity['profiles'] = recentUserCount

        const recentSessionCount = await db.session.count({
          where: { createdAt: { gte: new Date(oneDayAgo) } },
        }).catch(() => 0)
        if (recentSessionCount > 0) recentActivity['sessions'] = recentSessionCount
      } catch {
        // Graceful degradation
      }
    }

    const totalRecentActivity = Object.values(recentActivity).reduce((a, b) => a + b, 0)

    // ─── User Growth ──────────────────────────────────────────────────
    let userGrowth = { thisWeek: 0, lastWeek: 0, growthRate: 0 }
    const now = new Date()
    const thisWeekStart = new Date(now)
    thisWeekStart.setDate(now.getDate() - 7)
    const lastWeekStart = new Date(now)
    lastWeekStart.setDate(now.getDate() - 14)

    try {
      let thisWeekCount = 0
      let lastWeekCount = 0

      if (supabase) {
        const { count: tw } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', thisWeekStart.toISOString())
        thisWeekCount = tw ?? 0

        const { count: lw } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', lastWeekStart.toISOString())
          .lt('created_at', thisWeekStart.toISOString())
        lastWeekCount = lw ?? 0
      }

      if (thisWeekCount === 0 && lastWeekCount === 0) {
        thisWeekCount = await db.user.count({ where: { createdAt: { gte: thisWeekStart } } }).catch(() => 0)
        lastWeekCount = await db.user.count({
          where: { createdAt: { gte: lastWeekStart, lt: thisWeekStart } },
        }).catch(() => 0)
      }

      const growthRate = lastWeekCount > 0 ? ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100 : 0
      userGrowth = { thisWeek: thisWeekCount, lastWeek: lastWeekCount, growthRate: Math.round(growthRate * 10) / 10 }
    } catch {
      // Graceful degradation
    }

    // ─── Health Checks ────────────────────────────────────────────────
    const healthChecks: Array<{ name: string; status: string; latency: number; message: string }> = []

    // Database health
    const dbStart = Date.now()
    if (supabase) {
      try {
        const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
        const dbLatency = Date.now() - dbStart
        healthChecks.push({
          name: 'Database',
          status: error ? 'degraded' : 'healthy',
          latency: dbLatency,
          message: error ? error.message : `${count ?? 0} users, ${totalRows} total rows`,
        })
      } catch (err) {
        healthChecks.push({
          name: 'Database',
          status: 'down',
          latency: Date.now() - dbStart,
          message: err instanceof Error ? err.message : 'Connection failed',
        })
      }
    } else {
      try {
        await db.user.count()
        healthChecks.push({
          name: 'Database',
          status: 'healthy',
          latency: Date.now() - dbStart,
          message: `${dbProvider} connected`,
        })
      } catch (err) {
        healthChecks.push({
          name: 'Database',
          status: 'down',
          latency: Date.now() - dbStart,
          message: err instanceof Error ? err.message : 'Connection failed',
        })
      }
    }

    // Auth health
    const authStart = Date.now()
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
        healthChecks.push({
          name: 'Auth',
          status: error ? 'degraded' : 'healthy',
          latency: Date.now() - authStart,
          message: error ? error.message : `Auth responsive (${data.users.length} user listed)`,
        })
      } catch (err) {
        healthChecks.push({
          name: 'Auth',
          status: 'down',
          latency: Date.now() - authStart,
          message: err instanceof Error ? err.message : 'Auth check failed',
        })
      }
    } else {
      try {
        const sessionCount = await db.session.count({ where: { expiresAt: { gt: new Date() } } })
        healthChecks.push({
          name: 'Auth',
          status: 'healthy',
          latency: Date.now() - authStart,
          message: `${sessionCount} active sessions`,
        })
      } catch (err) {
        healthChecks.push({
          name: 'Auth',
          status: 'down',
          latency: Date.now() - authStart,
          message: err instanceof Error ? err.message : 'Auth check failed',
        })
      }
    }

    // Storage health
    const storageStart = Date.now()
    if (supabase) {
      try {
        const { data, error } = await supabase.storage.listBuckets()
        healthChecks.push({
          name: 'Storage',
          status: error ? 'degraded' : 'healthy',
          latency: Date.now() - storageStart,
          message: error ? error.message : `${data?.length ?? 0} buckets`,
        })
      } catch (err) {
        healthChecks.push({
          name: 'Storage',
          status: 'degraded',
          latency: Date.now() - storageStart,
          message: 'Storage may not be publicly accessible',
        })
      }
    } else {
      healthChecks.push({
        name: 'Storage',
        status: 'healthy',
        latency: 0,
        message: 'Local filesystem',
      })
    }

    // API Routes health
    healthChecks.push({
      name: 'API',
      status: 'healthy' as const,
      latency: 0,
      message: 'Routes responding',
    })

    return NextResponse.json({
      data: {
        memory,
        uptime,
        database,
        tableCounts,
        activeConnections,
        recentActivity,
        totalRecentActivity,
        userGrowth,
        healthChecks,
      },
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Infrastructure API] Error:', errorMessage)

    // Return OS-level metrics even on failure
    const mem = process.memoryUsage()
    return NextResponse.json({
      error: `Failed to fetch infrastructure data: ${errorMessage}`,
      data: {
        memory: {
          heapUsedMB: Math.round((mem.heapUsed / 1048576) * 10) / 10,
          heapTotalMB: Math.round((mem.heapTotal / 1048576) * 10) / 10,
          rssMB: Math.round((mem.rss / 1048576) * 10) / 10,
          externalMB: Math.round((mem.external / 1048576) * 10) / 10,
          systemTotalMB: 4096,
          systemFreeMB: Math.round(Math.max(0, 4096 - mem.rss / 1048576)),
          systemUsedMB: Math.round(mem.rss / 1048576),
          systemUsagePercent: Math.round((mem.rss / 1048576 / 4096) * 1000) / 10,
          heapUsagePercent: Math.round((mem.heapUsed / mem.heapTotal) * 1000) / 10,
        },
        uptime: formatUptime(Math.floor(process.uptime())),
        database: { sizeBytes: 0, sizeMB: '—', totalRows: 0, tableCount: 0, available: false },
        tableCounts: {},
        activeConnections: 0,
        recentActivity: {},
        totalRecentActivity: 0,
        userGrowth: { thisWeek: 0, lastWeek: 0, growthRate: 0 },
        healthChecks: [
          { name: 'Database', status: 'down', latency: 0, message: errorMessage },
          { name: 'Auth', status: 'down', latency: 0, message: 'Unable to check' },
          { name: 'API', status: 'healthy', latency: 0, message: 'Routes responding' },
        ],
      },
      lastUpdated: new Date().toISOString(),
    }, { status: 500 })
  }
}
