import { NextResponse } from 'next/server'
import { db, getDatabaseProvider } from '@/lib/db'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// Public health endpoint (no auth required) for monitoring
export async function GET() {
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

  return NextResponse.json({
    status: dbStatus,
    database: { status: dbStatus, provider: dbProvider, latency: dbLatency, message: dbMessage, userCount },
    uptime: process.uptime(),
    memory: Math.round(process.memoryUsage().heapUsed / 1048576),
    timestamp: new Date().toISOString(),
    responseTime: Date.now() - start,
  }, { status })
}
