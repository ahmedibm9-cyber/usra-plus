import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin Infrastructure API Route
// Queries REAL Supabase system metrics
// Returns database health, storage, and connection data

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET(_request: NextRequest) {
  const supabase = getSupabaseAdmin()

  if (!supabase) {
    return NextResponse.json({
      source: 'unavailable',
      data: null,
      message: 'No system metrics available - connect your database to see infrastructure data',
      lastUpdated: new Date().toISOString(),
    })
  }

  try {
    const data: Record<string, unknown> = {}
    let hasAnyLive = false

    // ─── Database row counts (proxy for DB size) ───────────────────────
    const tableCounts: Record<string, number> = {}
    const tables = ['profiles', 'families', 'family_members', 'tasks', 'grocery_items', 'chat_messages', 'calendar_events', 'family_invites']

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      if (!error && count !== null) {
        tableCounts[table] = count
        hasAnyLive = true
      }
    }

    if (Object.keys(tableCounts).length > 0) {
      data.tableCounts = tableCounts
      data.totalRows = Object.values(tableCounts).reduce((a, b) => a + b, 0)
    }

    // ─── Recent activity (last 24h) ────────────────────────────────────
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const recentActivity: Record<string, number> = {}
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo.toISOString())

      if (!error && count !== null) {
        recentActivity[table] = count
      }
    }

    if (Object.keys(recentActivity).length > 0) {
      data.recentActivity = recentActivity
      data.totalRecentActivity = Object.values(recentActivity).reduce((a, b) => a + b, 0)
    }

    // ─── Active connections approximation ──────────────────────────────
    // We count profiles with last_login in the last hour as "active connections"
    const oneHourAgo = new Date()
    oneHourAgo.setHours(oneHourAgo.getHours() - 1)

    const { count: activeNow, error: activeError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_login', oneHourAgo.toISOString())

    if (!activeError && activeNow !== null) {
      data.activeConnections = activeNow
      hasAnyLive = true
    }

    // ─── Growth rate (last 7 days vs previous 7 days) ──────────────────
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const { count: newUsersThisWeek } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())

    const { count: newUsersLastWeek } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', fourteenDaysAgo.toISOString())
      .lt('created_at', sevenDaysAgo.toISOString())

    if (newUsersThisWeek !== null && newUsersLastWeek !== null) {
      const growthRate = newUsersLastWeek > 0
        ? ((newUsersThisWeek - newUsersLastWeek) / newUsersLastWeek) * 100
        : 0
      data.userGrowth = {
        thisWeek: newUsersThisWeek,
        lastWeek: newUsersLastWeek,
        growthRate: Math.round(growthRate * 10) / 10,
      }
      hasAnyLive = true
    }

    if (!hasAnyLive) {
      return NextResponse.json({
        source: 'unavailable',
        data: null,
        message: 'No system metrics available - connect your database to see infrastructure data',
        lastUpdated: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      source: 'live',
      data,
      lastUpdated: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({
      source: 'unavailable',
      data: null,
      message: 'Unable to fetch infrastructure metrics',
      lastUpdated: new Date().toISOString(),
    })
  }
}
