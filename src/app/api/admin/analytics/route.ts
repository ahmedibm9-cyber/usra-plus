import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin Analytics API Route
// Queries REAL Supabase aggregate data using service role key
// All data is privacy-safe: aggregate counts only, no personal content

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ─── Demo fallback data (used when tables don't exist or Supabase is unreachable) ──

function getDemoAnalytics() {
  return {
    users: {
      total: 12847,
      newThisMonth: 147,
      active: 8429,
      dailyActive: 2891,
      monthlyActive: 8429,
    },
    families: {
      total: 3256,
      avgSize: 3.8,
      active: 2891,
    },
    tasks: {
      created: 48921,
      completed: 31247,
      completionRate: 0.639,
    },
    groceries: {
      itemsTracked: 24156,
      completedLists: 8423,
    },
    subscriptions: {
      mrr: 28940,
      arr: 347280,
      free: 9612,
      pro: 2158,
      familyPlus: 1077,
      conversionRate: 0.224,
    },
    chat: {
      totalMessages: 156782,
      // NO content — count only
    },
  }
}

export async function GET(_request: NextRequest) {
  const supabase = getSupabaseAdmin()

  // If no Supabase client, return demo data
  if (!supabase) {
    return NextResponse.json({
      source: 'demo',
      data: getDemoAnalytics(),
      lastUpdated: new Date().toISOString(),
    })
  }

  try {
    const data: Record<string, unknown> = {}
    let hasAnyLive = false

    // ─── Query profiles table ─────────────────────────────────────────────
    const { count: totalUsers, error: profilesError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (!profilesError && totalUsers !== null) {
      hasAnyLive = true

      // New users this month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count: newThisMonth } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString())

      // Active users (logged in last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('last_login', thirtyDaysAgo.toISOString())

      data.users = {
        total: totalUsers,
        newThisMonth: newThisMonth ?? 0,
        active: activeUsers ?? 0,
        dailyActive: 0, // Would need session tracking
        monthlyActive: activeUsers ?? 0,
      }
    }

    // ─── Query families table ─────────────────────────────────────────────
    const { count: totalFamilies, error: familiesError } = await supabase
      .from('families')
      .select('*', { count: 'exact', head: true })

    if (!familiesError && totalFamilies !== null) {
      hasAnyLive = true

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { count: activeFamilies } = await supabase
        .from('families')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', thirtyDaysAgo.toISOString())

      // Average family size via family_members
      let avgSize = 0
      const { data: familyMembers } = await supabase
        .from('family_members')
        .select('family_id')

      if (familyMembers && familyMembers.length > 0) {
        const familyCounts: Record<string, number> = {}
        for (const fm of familyMembers) {
          familyCounts[fm.family_id] = (familyCounts[fm.family_id] || 0) + 1
        }
        const sizes = Object.values(familyCounts)
        avgSize = Math.round((sizes.reduce((a, b) => a + b, 0) / sizes.length) * 10) / 10
      }

      data.families = {
        total: totalFamilies,
        avgSize,
        active: activeFamilies ?? 0,
      }
    }

    // ─── Query tasks table ────────────────────────────────────────────────
    const { count: tasksCreated, error: tasksError } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })

    if (!tasksError && tasksCreated !== null) {
      hasAnyLive = true

      const { count: tasksCompleted } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')

      data.tasks = {
        created: tasksCreated,
        completed: tasksCompleted ?? 0,
        completionRate: tasksCreated > 0 ? (tasksCompleted ?? 0) / tasksCreated : 0,
      }
    }

    // ─── Query grocery_items table ────────────────────────────────────────
    const { count: groceryItems, error: groceryError } = await supabase
      .from('grocery_items')
      .select('*', { count: 'exact', head: true })

    if (!groceryError && groceryItems !== null) {
      hasAnyLive = true

      const { count: completedItems } = await supabase
        .from('grocery_items')
        .select('*', { count: 'exact', head: true })
        .eq('completed', true)

      data.groceries = {
        itemsTracked: groceryItems,
        completedLists: completedItems ?? 0,
      }
    }

    // ─── Query subscriptions table (optional — may not exist) ─────────────
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('plan, status')

    if (!subsError && subscriptions) {
      hasAnyLive = true

      const planCounts: Record<string, number> = { free: 0, pro: 0, family_plus: 0 }
      for (const sub of subscriptions) {
        const plan = sub.plan || 'free'
        planCounts[plan] = (planCounts[plan] || 0) + 1
      }
      const totalPaid = planCounts.pro + planCounts.family_plus
      const total = planCounts.free + totalPaid

      data.subscriptions = {
        mrr: Math.round(totalPaid * 9.99 * 100) / 100, // Simplified MRR estimate
        arr: Math.round(totalPaid * 9.99 * 12 * 100) / 100,
        free: planCounts.free,
        pro: planCounts.pro,
        familyPlus: planCounts.family_plus,
        conversionRate: total > 0 ? Math.round((totalPaid / total) * 1000) / 1000 : 0,
      }
    }

    // ─── Query chat_messages (aggregate count only — NO content) ──────────
    const { count: chatMessages, error: chatError } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })

    if (!chatError && chatMessages !== null) {
      hasAnyLive = true

      data.chat = {
        totalMessages: chatMessages,
      }
    }

    // If no live data at all, return full demo
    if (!hasAnyLive) {
      return NextResponse.json({
        source: 'demo',
        data: getDemoAnalytics(),
        lastUpdated: new Date().toISOString(),
      })
    }

    // Merge live data with demo defaults for missing sections
    const demoDefaults = getDemoAnalytics()
    const finalData = { ...demoDefaults, ...data }

    return NextResponse.json({
      source: Object.keys(data).length < 6 ? 'demo' : 'live',
      data: finalData,
      lastUpdated: new Date().toISOString(),
    })
  } catch {
    // On any error, return demo data
    return NextResponse.json({
      source: 'demo',
      data: getDemoAnalytics(),
      lastUpdated: new Date().toISOString(),
    })
  }
}
