import { NextRequest, NextResponse } from 'next/server'
import { db, getDatabaseProvider } from '@/lib/db'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { validateEnvironment } from '@/lib/env-validation'

// Admin-only health endpoint for monitoring
export async function GET(request: NextRequest) {
  // Auth check — defense in depth
  const authResult = verifyAdminAuth(request)
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const start = Date.now()
  const dbProvider = getDatabaseProvider()
  const supabase = getSupabaseAdmin()

  let dbStatus = 'down'
  let dbLatency = 0
  let dbMessage = 'No database connection'
  let userCount = 0

  if (supabase) {
    try {
      const dbStart = Date.now()
      const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      dbLatency = Date.now() - dbStart
      if (error) {
        dbStatus = 'degraded'
        dbMessage = error.message
      } else {
        dbStatus = 'healthy'
        dbMessage = `PostgreSQL connected (${count ?? 0} users)`
        userCount = count ?? 0
      }
    } catch (err) {
      dbLatency = Date.now() - start
      dbMessage = err instanceof Error ? err.message : 'Connection failed'
    }
  } else {
    try {
      const dbStart = Date.now()
      userCount = await db.user.count()
      dbLatency = Date.now() - dbStart
      dbStatus = 'healthy'
      dbMessage = `${dbProvider} connected (${userCount} users)`
    } catch (err) {
      dbLatency = Date.now() - start
      dbMessage = err instanceof Error ? err.message : 'Connection failed'
    }
  }

  const status = dbStatus === 'healthy' ? 200 : dbStatus === 'degraded' ? 200 : 503

  // Run environment validation and include results in health check
  const envResult = validateEnvironment()

  return NextResponse.json({
    status: dbStatus,
    database: { status: dbStatus, provider: dbProvider, latency: dbLatency, message: dbMessage, userCount },
    env: { valid: envResult.valid, missing: envResult.missing, warningCount: envResult.warnings.length },
    uptime: process.uptime(),
    memory: Math.round(process.memoryUsage().heapUsed / 1048576),
    timestamp: new Date().toISOString(),
    responseTime: Date.now() - start,
  }, { status })
}
