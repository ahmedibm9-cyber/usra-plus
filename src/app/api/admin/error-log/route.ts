import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/admin-auth'

// ─── In-Memory Fallback Storage ───────────────────────────────────────

interface StoredError {
  id: string
  timestamp: string
  type: string
  severity: string
  status: string
  message: string
  stack?: string
  source?: string
  lineNumber?: number
  columnNumber?: number
  url?: string
  occurrenceCount: number
  firstSeen: string
  lastSeen: string
  userAgent?: string
}

const MAX_IN_MEMORY_ERRORS = 500
const inMemoryErrors: StoredError[] = []

// ─── Health Check Endpoints ───────────────────────────────────────────

async function checkSupabaseConnection(): Promise<{ status: string; responseTime: number; message?: string }> {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    // Try Prisma as fallback
    try {
      const { db } = await import('@/lib/db')
      const start = Date.now()
      const count = await db.user.count()
      const responseTime = Date.now() - start
      return { status: 'healthy', responseTime, message: `Prisma connected (${count} users)` }
    } catch {
      return { status: 'down', responseTime: 0, message: 'No database connection available' }
    }
  }

  const start = Date.now()
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    const responseTime = Date.now() - start

    if (error) {
      // Try Prisma as fallback
      try {
        const { db } = await import('@/lib/db')
        const pStart = Date.now()
        await db.user.count()
        const pResponseTime = Date.now() - pStart
        return { status: 'degraded', responseTime: pResponseTime, message: 'Supabase tables unavailable, Prisma connected' }
      } catch {
        return { status: 'degraded', responseTime, message: error.message }
      }
    }
    return { status: 'healthy', responseTime, message: `${count ?? 0} profiles found` }
  } catch (err) {
    // Try Prisma as fallback
    try {
      const { db } = await import('@/lib/db')
      const pStart = Date.now()
      await db.user.count()
      const pResponseTime = Date.now() - pStart
      return { status: 'degraded', responseTime: pResponseTime, message: 'Supabase down, Prisma connected' }
    } catch {
      return { status: 'down', responseTime: Date.now() - start, message: err instanceof Error ? err.message : 'Connection failed' }
    }
  }
}

async function checkDatabaseTables(): Promise<{ status: string; responseTime: number; message?: string; tables?: Record<string, boolean> }> {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    // Try Prisma as fallback
    try {
      const { db } = await import('@/lib/db')
      const start = Date.now()
      const tables: Record<string, boolean> = {}
      const prismaTables = ['user', 'session', 'auditLog', 'moderationItem', 'supportTicket', 'userBan', 'emailCampaign', 'userSegment', 'aBTest']
      let healthyCount = 0
      for (const table of prismaTables) {
        try {
          await (db as any)[table].count()
          tables[table] = true
          healthyCount++
        } catch {
          tables[table] = false
        }
      }
      const responseTime = Date.now() - start
      const ratio = healthyCount / prismaTables.length
      if (ratio === 1) return { status: 'healthy', responseTime, tables, message: `All ${prismaTables.length} Prisma tables accessible` }
      if (ratio >= 0.5) return { status: 'degraded', responseTime, tables, message: `${healthyCount}/${prismaTables.length} Prisma tables accessible` }
      return { status: 'down', responseTime, tables, message: `Only ${healthyCount}/${prismaTables.length} Prisma tables accessible` }
    } catch {
      return { status: 'down', responseTime: 0, message: 'No database connection available' }
    }
  }

  // Original Supabase logic
  const start = Date.now()
  const tables: Record<string, boolean> = {}
  const requiredTables = ['profiles', 'families', 'family_members', 'tasks', 'grocery_items', 'chat_messages', 'calendar_events', 'admin_users']

  let healthyCount = 0
  for (const table of requiredTables) {
    const { error } = await supabase.from(table).select('*', { count: 'exact', head: true })
    tables[table] = !error
    if (!error) healthyCount++
  }

  const responseTime = Date.now() - start
  const ratio = healthyCount / requiredTables.length

  if (ratio === 1) return { status: 'healthy', responseTime, tables, message: `All ${requiredTables.length} tables accessible` }
  if (ratio >= 0.5) return { status: 'degraded', responseTime, tables, message: `${healthyCount}/${requiredTables.length} tables accessible` }
  return { status: 'down', responseTime, tables, message: `Only ${healthyCount}/${requiredTables.length} tables accessible` }
}

async function checkAuthService(): Promise<{ status: string; responseTime: number; message?: string }> {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    // Try Prisma session check as fallback
    try {
      const { db } = await import('@/lib/db')
      const start = Date.now()
      const sessionCount = await db.session.count({ where: { expiresAt: { gt: new Date() } } })
      const responseTime = Date.now() - start
      return { status: 'healthy', responseTime, message: `Auth via Prisma (${sessionCount} active sessions)` }
    } catch {
      return { status: 'down', responseTime: 0, message: 'No auth service available' }
    }
  }

  const start = Date.now()
  try {
    // Try to use the admin API to verify auth service is responsive
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
    const responseTime = Date.now() - start

    if (error) {
      return { status: 'degraded', responseTime, message: error.message }
    }
    return { status: 'healthy', responseTime, message: `Auth service responsive (${data.users.length} user listed)` }
  } catch (err) {
    return { status: 'down', responseTime: Date.now() - start, message: err instanceof Error ? err.message : 'Auth check failed' }
  }
}

async function checkApiRoutes(): Promise<{ status: string; responseTime: number; message?: string }> {
  const start = Date.now()
  try {
    // Self-test: we're running in an API route, so we're healthy
    const responseTime = Date.now() - start
    return { status: 'healthy', responseTime, message: 'API routes responding' }
  } catch {
    return { status: 'down', responseTime: Date.now() - start, message: 'API route check failed' }
  }
}

// ─── POST: Receive Error Reports ─────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, severity, message, stack, source, lineNumber, columnNumber, url, userAgent } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const errorEntry: StoredError = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: type || 'unknown',
      severity: severity || 'error',
      status: 'active',
      message,
      stack,
      source,
      lineNumber,
      columnNumber,
      url,
      occurrenceCount: 1,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      userAgent,
    }

    // Try to store in Supabase if bug_logs table exists
    const supabase = getSupabaseAdmin()
    if (supabase) {
      try {
        const { error: dbError } = await supabase.from('bug_logs').insert({
          type: errorEntry.type,
          severity: errorEntry.severity,
          message: errorEntry.message,
          stack: errorEntry.stack,
          source: errorEntry.source,
          line_number: errorEntry.lineNumber,
          column_number: errorEntry.columnNumber,
          url: errorEntry.url,
          user_agent: errorEntry.userAgent,
          occurrence_count: errorEntry.occurrenceCount,
        })

        if (!dbError) {
          return NextResponse.json({ success: true, storage: 'database' }, { status: 201 })
        }
        // Table might not exist, fall through to in-memory
      } catch {
        // DB insert failed, use in-memory
      }
    }

    // Fallback: store in memory
    inMemoryErrors.unshift(errorEntry)
    if (inMemoryErrors.length > MAX_IN_MEMORY_ERRORS) {
      inMemoryErrors.length = MAX_IN_MEMORY_ERRORS
    }

    return NextResponse.json({ success: true, storage: 'memory' }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// ─── GET: Retrieve Error Logs & Health Checks ────────────────────────

export async function GET(request: NextRequest) {
  // Auth check — error logs contain stack traces and user info
  const authResult = await verifyAdminAuth(request)
  if (authResult) return authResult
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // ── Health Check Action ────────────────────────────────────────────
    if (action === 'health') {
      const [supabaseCheck, tablesCheck, authCheck, apiCheck] = await Promise.all([
        checkSupabaseConnection(),
        checkDatabaseTables(),
        checkAuthService(),
        checkApiRoutes(),
      ])

      return NextResponse.json({
        healthChecks: [
          {
            id: 'supabase-connection',
            name: 'Supabase Connection',
            status: supabaseCheck.status,
            responseTime: supabaseCheck.responseTime,
            lastChecked: new Date().toISOString(),
            message: supabaseCheck.message,
          },
          {
            id: 'database-tables',
            name: 'Database Tables',
            status: tablesCheck.status,
            responseTime: tablesCheck.responseTime,
            lastChecked: new Date().toISOString(),
            message: tablesCheck.message,
            details: tablesCheck.tables,
          },
          {
            id: 'auth-service',
            name: 'Auth Service',
            status: authCheck.status,
            responseTime: authCheck.responseTime,
            lastChecked: new Date().toISOString(),
            message: authCheck.message,
          },
          {
            id: 'api-health',
            name: 'API Routes',
            status: apiCheck.status,
            responseTime: apiCheck.responseTime,
            lastChecked: new Date().toISOString(),
            message: apiCheck.message,
          },
        ],
        lastUpdated: new Date().toISOString(),
      })
    }

    // ── Performance Check Action ───────────────────────────────────────
    if (action === 'performance') {
      const start = Date.now()
      // Measure API response time by hitting a lightweight endpoint
      const supabase = getSupabaseAdmin()
      let apiResponseTime = 0
      let dbResponseTime = 0

      if (supabase) {
        const dbStart = Date.now()
        await supabase.from('profiles').select('*', { count: 'exact', head: true })
        dbResponseTime = Date.now() - dbStart
      }

      apiResponseTime = Date.now() - start

      return NextResponse.json({
        performance: {
          apiResponseTime,
          dbResponseTime,
          timestamp: new Date().toISOString(),
        },
        lastUpdated: new Date().toISOString(),
      })
    }

    // ── Default: Return Error Logs ─────────────────────────────────────
    const severity = searchParams.get('severity')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '100')

    // Try to fetch from Supabase first
    const supabase = getSupabaseAdmin()
    if (supabase) {
      try {
        let query = supabase
          .from('bug_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit)

        if (severity) query = query.eq('severity', severity)
        if (type) query = query.eq('type', type)

        const { data, error } = await query

        if (!error && data) {
          return NextResponse.json({
            errors: data.map((row: Record<string, unknown>) => ({
              id: row.id,
              timestamp: row.created_at,
              type: row.type,
              severity: row.severity,
              status: 'active',
              message: row.message,
              stack: row.stack,
              source: row.source,
              lineNumber: row.line_number,
              columnNumber: row.column_number,
              url: row.url,
              occurrenceCount: row.occurrence_count || 1,
              firstSeen: row.created_at,
              lastSeen: row.created_at,
              userAgent: row.user_agent,
            })),
            source: 'database',
            total: data.length,
          })
        }
      } catch {
        // Fall through to in-memory
      }
    }

    // Fallback: return in-memory errors
    let filtered = [...inMemoryErrors]
    if (severity) filtered = filtered.filter(e => e.severity === severity)
    if (type) filtered = filtered.filter(e => e.type === type)
    filtered = filtered.slice(0, limit)

    return NextResponse.json({
      errors: filtered,
      source: 'memory',
      total: filtered.length,
    })
  } catch (error) {
    console.error('[Error Log API] GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
