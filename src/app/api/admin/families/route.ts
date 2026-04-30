import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin Families API Route
// Queries families table with aggregate metrics
// Returns: id, name, member_count, plan, tasks_completed_count, last_active, activity_score
// All data is privacy-safe: aggregate metrics only, no personal content
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
    // Build base query — select only privacy-safe fields
    let query = supabase
      .from('families')
      .select('id, name, plan, created_at, updated_at', { count: 'exact' })

    if (plan) {
      query = query.eq('plan', plan)
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

    // Enrich with member counts and task completion counts
    const familyIds = (families || []).map(f => f.id)
    const memberCounts: Record<string, number> = {}
    const taskCompletionCounts: Record<string, number> = {}

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

      // Get completed task counts per family
      const { data: completedTasks } = await supabase
        .from('tasks')
        .select('family_id')
        .eq('status', 'completed')
        .in('family_id', familyIds)

      if (completedTasks) {
        for (const t of completedTasks) {
          taskCompletionCounts[t.family_id] = (taskCompletionCounts[t.family_id] || 0) + 1
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
        plan: f.plan || 'free',
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
