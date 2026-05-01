import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin Analytics API Route
// Queries REAL Supabase aggregate data using service role key
// All data is privacy-safe: aggregate counts only, no personal content
// Returns zeros for missing data instead of demo fake numbers

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

  // If no Supabase client, return zeros
  if (!supabase) {
    return NextResponse.json({
      source: 'demo',
      data: {
        users: { total: 0, newThisMonth: 0, active: 0, dailyActive: 0, monthlyActive: 0 },
        families: { total: 0, avgSize: 0, active: 0 },
        tasks: { created: 0, completed: 0, completionRate: 0 },
        groceries: { itemsTracked: 0, completedLists: 0 },
        subscriptions: { mrr: 0, arr: 0, free: 0, pro: 0, familyPlus: 0, conversionRate: 0 },
        chat: { totalMessages: 0 },
      },
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

      // Active users (logged in last 30 days) — last_login column exists
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
    // tasks.status values: 'todo', 'in_progress', 'done' (NOT 'completed')
    const { count: tasksCreated, error: tasksError } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })

    if (!tasksError && tasksCreated !== null) {
      hasAnyLive = true

      const { count: tasksCompleted } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'done')

      data.tasks = {
        created: tasksCreated,
        completed: tasksCompleted ?? 0,
        completionRate: tasksCreated > 0 ? (tasksCompleted ?? 0) / tasksCreated : 0,
      }
    }

    // ─── Query grocery_items table ────────────────────────────────────────
    // grocery_items uses 'checked' column (NOT 'completed')
    const { count: groceryItems, error: groceryError } = await supabase
      .from('grocery_items')
      .select('*', { count: 'exact', head: true })

    if (!groceryError && groceryItems !== null) {
      hasAnyLive = true

      const { count: checkedItems } = await supabase
        .from('grocery_items')
        .select('*', { count: 'exact', head: true })
        .eq('checked', true)

      data.groceries = {
        itemsTracked: groceryItems,
        completedLists: checkedItems ?? 0,
      }
    }

    // ─── Query subscriptions table ────────────────────────────────────────
    // subscriptions.plan: 'free', 'pro', 'family_plus'
    // subscriptions.status: 'active', 'cancelled', 'expired'
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('plan, status')

    if (!subsError && subscriptions) {
      hasAnyLive = true

      const planCounts: Record<string, number> = { free: 0, pro: 0, family_plus: 0 }
      for (const sub of subscriptions) {
        const plan = sub.plan || 'free'
        if (plan in planCounts) {
          planCounts[plan]++
        }
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

    // If no live data at all, return zeros
    if (!hasAnyLive) {
      return NextResponse.json({
        source: 'demo',
        data: {
          users: { total: 0, newThisMonth: 0, active: 0, dailyActive: 0, monthlyActive: 0 },
          families: { total: 0, avgSize: 0, active: 0 },
          tasks: { created: 0, completed: 0, completionRate: 0 },
          groceries: { itemsTracked: 0, completedLists: 0 },
          subscriptions: { mrr: 0, arr: 0, free: 0, pro: 0, familyPlus: 0, conversionRate: 0 },
          chat: { totalMessages: 0 },
        },
        lastUpdated: new Date().toISOString(),
      })
    }

    // Return live data with zeros for missing sections
    return NextResponse.json({
      source: 'live',
      data: {
        users: (data.users as Record<string, unknown>) || { total: 0, newThisMonth: 0, active: 0, dailyActive: 0, monthlyActive: 0 },
        families: (data.families as Record<string, unknown>) || { total: 0, avgSize: 0, active: 0 },
        tasks: (data.tasks as Record<string, unknown>) || { created: 0, completed: 0, completionRate: 0 },
        groceries: (data.groceries as Record<string, unknown>) || { itemsTracked: 0, completedLists: 0 },
        subscriptions: (data.subscriptions as Record<string, unknown>) || { mrr: 0, arr: 0, free: 0, pro: 0, familyPlus: 0, conversionRate: 0 },
        chat: (data.chat as Record<string, unknown>) || { totalMessages: 0 },
      },
      lastUpdated: new Date().toISOString(),
    })
  } catch {
    // On any error, return zeros
    return NextResponse.json({
      source: 'demo',
      data: {
        users: { total: 0, newThisMonth: 0, active: 0, dailyActive: 0, monthlyActive: 0 },
        families: { total: 0, avgSize: 0, active: 0 },
        tasks: { created: 0, completed: 0, completionRate: 0 },
        groceries: { itemsTracked: 0, completedLists: 0 },
        subscriptions: { mrr: 0, arr: 0, free: 0, pro: 0, familyPlus: 0, conversionRate: 0 },
        chat: { totalMessages: 0 },
      },
      lastUpdated: new Date().toISOString(),
    })
  }
}
