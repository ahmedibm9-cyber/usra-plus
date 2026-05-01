import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin Features API Route
// Queries REAL Supabase data for feature usage analytics
// All data is privacy-safe: aggregate counts only

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
      message: 'No database connection configured',
      lastUpdated: new Date().toISOString(),
    })
  }

  try {
    const data: Record<string, unknown> = {}
    let hasAnyLive = false

    // ─── Feature Usage from tasks table ─────────────────────────────────
    const { count: totalTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })

    if (!tasksError && totalTasks !== null) {
      hasAnyLive = true

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      // Tasks created in last 30 days
      const { count: recentTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString())

      // Tasks done in last 30 days (tasks.status values: 'todo', 'in_progress', 'done')
      const { count: completedTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'done')
        .gte('updated_at', thirtyDaysAgo.toISOString())

      // Daily average over last 7 days
      const { count: weeklyTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString())

      const dailyAvg = weeklyTasks ? Math.round(weeklyTasks / 7) : 0
      const completionRate = totalTasks > 0 ? ((completedTasks ?? 0) / totalTasks) * 100 : 0

      data.tasks = {
        total: totalTasks,
        recent: recentTasks ?? 0,
        completed: completedTasks ?? 0,
        dailyAvg,
        completionRate: Math.round(completionRate * 10) / 10,
      }
    }

    // ─── Grocery feature usage ──────────────────────────────────────────
    const { count: totalGroceryItems, error: groceryError } = await supabase
      .from('grocery_items')
      .select('*', { count: 'exact', head: true })

    if (!groceryError && totalGroceryItems !== null) {
      hasAnyLive = true

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { count: weeklyGroceryItems } = await supabase
        .from('grocery_items')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString())

      data.groceries = {
        total: totalGroceryItems,
        dailyAvg: weeklyGroceryItems ? Math.round(weeklyGroceryItems / 7) : 0,
      }
    }

    // ─── Chat messages feature usage ────────────────────────────────────
    const { count: totalMessages, error: chatError } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })

    if (!chatError && totalMessages !== null) {
      hasAnyLive = true

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { count: weeklyMessages } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString())

      data.chat = {
        total: totalMessages,
        dailyAvg: weeklyMessages ? Math.round(weeklyMessages / 7) : 0,
      }
    }

    // ─── Calendar events feature usage ──────────────────────────────────
    const { count: totalEvents, error: eventsError } = await supabase
      .from('calendar_events')
      .select('*', { count: 'exact', head: true })

    if (!eventsError && totalEvents !== null) {
      hasAnyLive = true

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { count: weeklyEvents } = await supabase
        .from('calendar_events')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString())

      data.calendar = {
        total: totalEvents,
        dailyAvg: weeklyEvents ? Math.round(weeklyEvents / 7) : 0,
      }
    }

    // ─── Family invites / growth ────────────────────────────────────────
    const { count: totalInvites, error: invitesError } = await supabase
      .from('family_invites')
      .select('*', { count: 'exact', head: true })

    if (!invitesError && totalInvites !== null) {
      hasAnyLive = true

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { count: weeklyInvites } = await supabase
        .from('family_invites')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString())

      data.invites = {
        total: totalInvites,
        dailyAvg: weeklyInvites ? Math.round(weeklyInvites / 7) : 0,
      }
    }

    // ─── Total feature interactions ─────────────────────────────────────
    const totalInteractions =
      (data.tasks as Record<string, number>)?.recent ?? 0 +
      (data.groceries as Record<string, number>)?.total ?? 0 +
      (data.chat as Record<string, number>)?.total ?? 0 +
      (data.calendar as Record<string, number>)?.total ?? 0

    data.summary = {
      totalInteractions,
      featuresTracked: Object.keys(data).filter(k => k !== 'summary').length,
    }

    if (!hasAnyLive) {
      return NextResponse.json({
        source: 'unavailable',
        data: null,
        message: 'No feature data yet - data will appear as users interact with the platform',
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
      message: 'Unable to fetch feature data',
      lastUpdated: new Date().toISOString(),
    })
  }
}
