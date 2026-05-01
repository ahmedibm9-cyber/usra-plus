import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin Families API Route
// Queries families table with aggregate metrics
// Returns: id, name, member_count, plan, tasks_completed_count, last_active, activity_score
// All data is privacy-safe: aggregate metrics only, no personal content
// families table has 'created_by' (not 'owner'), NO 'plan' column
// Plan is fetched from subscriptions table
// tasks.status = 'done' (not 'completed')
// When Supabase is unavailable or tables don't exist, returns empty data with source: 'demo'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Privacy-safe family fields
interface SafeFamilyRecord {
  id: string
  name: string
  member_count: number
  plan: string
  tasks_completed_count: number
  last_active: string | null
  activity_score: number
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))
  const plan = searchParams.get('plan')
  const search = searchParams.get('search')

  const supabase = getSupabaseAdmin()

  if (!supabase) {
    // No Supabase credentials configured — return empty data
    return NextResponse.json({
      source: 'demo',
      data: [],
      total: 0,
      page,
      pageSize,
      hasMore: false,
    })
  }

  try {
    // Build base query — families table does NOT have a 'plan' column
    // families: id, name, created_by, created_at, updated_at
    let query = supabase
      .from('families')
      .select('id, name, created_at, updated_at', { count: 'exact' })

    // If filtering by plan, we need to get families via subscriptions
    if (plan) {
      // Get user_ids with this plan from subscriptions
      const { data: subsByPlan, error: subsPlanError } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('plan', plan)
        .eq('status', 'active')

      if (subsPlanError || !subsByPlan || subsByPlan.length === 0) {
        return NextResponse.json({
          source: 'live',
          data: [],
          total: 0,
          page,
          pageSize,
          hasMore: false,
        })
      }

      // Get family_ids those users belong to
      const userIds = subsByPlan.map(s => s.user_id)
      const { data: memberships } = await supabase
        .from('family_members')
        .select('family_id')
        .in('user_id', userIds)

      if (!memberships || memberships.length === 0) {
        return NextResponse.json({
          source: 'live',
          data: [],
          total: 0,
          page,
          pageSize,
          hasMore: false,
        })
      }

      const familyIds = memberships.map(m => m.family_id)
      query = query.in('id', familyIds)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    // Apply pagination
    const start = (page - 1) * pageSize
    query = query.range(start, start + pageSize - 1).order('updated_at', { ascending: false, nullsFirst: false })

    const { data: families, count, error } = await query

    if (error) {
      // Table doesn't exist — return empty data
      return NextResponse.json({
        source: 'demo',
        data: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
      })
    }

    // Enrich with member counts, task completion counts, and plan info
    const familyIds = (families || []).map(f => f.id)
    const memberCounts: Record<string, number> = {}
    const taskCompletionCounts: Record<string, number> = {}
    const familyPlans: Record<string, string> = {}

    if (familyIds.length > 0) {
      // Get member counts
      const { data: memberships } = await supabase
        .from('family_members')
        .select('family_id')
        .in('family_id', familyIds)

      if (memberships) {
        for (const m of memberships) {
          memberCounts[m.family_id] = (memberCounts[m.family_id] || 0) + 1
        }
      }

      // Get done task counts per family (tasks.status = 'done', NOT 'completed')
      const { data: doneTasks } = await supabase
        .from('tasks')
        .select('family_id')
        .eq('status', 'done')
        .in('family_id', familyIds)

      if (doneTasks) {
        for (const t of doneTasks) {
          taskCompletionCounts[t.family_id] = (taskCompletionCounts[t.family_id] || 0) + 1
        }
      }

      // Get plan info from subscriptions via family members
      const { data: familyMembersList } = await supabase
        .from('family_members')
        .select('family_id, user_id')
        .in('family_id', familyIds)

      if (familyMembersList && familyMembersList.length > 0) {
        const userIds = familyMembersList.map(fm => fm.user_id)
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('user_id, plan, status')
          .in('user_id', userIds)

        if (subs) {
          // Map subscription plans back to families
          const userPlanMap: Record<string, string> = {}
          for (const sub of subs) {
            if (sub.status === 'active' && !userPlanMap[sub.user_id]) {
              userPlanMap[sub.user_id] = sub.plan || 'free'
            }
          }
          // Assign the highest plan in the family as the family plan
          const planRank: Record<string, number> = { free: 0, pro: 1, family_plus: 2 }
          for (const fm of familyMembersList) {
            const userPlan = userPlanMap[fm.user_id] || 'free'
            const currentPlan = familyPlans[fm.family_id] || 'free'
            if ((planRank[userPlan] || 0) > (planRank[currentPlan] || 0)) {
              familyPlans[fm.family_id] = userPlan
            }
          }
        }
      }
    }

    // Calculate activity score (0-100) based on:
    // - Task completion (50% weight)
    // - Member engagement (30% weight)
    // - Recency (20% weight)
    function calculateActivityScore(
      updatedAt: string | null,
      memberCount: number,
      tasksCompleted: number,
    ): number {
      const taskScore = Math.min((tasksCompleted / 500) * 50, 50)
      const memberScore = Math.min((memberCount / 10) * 30, 30)
      let recencyScore = 0
      if (updatedAt) {
        const daysSince = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)
        recencyScore = Math.max(0, 20 - (daysSince / 30) * 20)
      }
      return Math.round(taskScore + memberScore + recencyScore)
    }

    // Build safe family records
    const safeFamilies: SafeFamilyRecord[] = (families || []).map(f => {
      const memberCount = memberCounts[f.id] || 0
      const tasksCompleted = taskCompletionCounts[f.id] || 0
      return {
        id: f.id,
        name: f.name || '',
        member_count: memberCount,
        plan: familyPlans[f.id] || 'free',
        tasks_completed_count: tasksCompleted,
        last_active: f.updated_at || f.created_at || null,
        activity_score: calculateActivityScore(f.updated_at, memberCount, tasksCompleted),
      }
    })

    const total = count ?? 0

    return NextResponse.json({
      source: 'live',
      data: safeFamilies,
      total,
      page,
      pageSize,
      hasMore: start + pageSize < total,
    })
  } catch {
    // On error, return empty data
    return NextResponse.json({
      source: 'demo',
      data: [],
      total: 0,
      page,
      pageSize,
      hasMore: false,
    })
  }
}
