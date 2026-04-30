import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin Families API Route
// Queries families table with aggregate metrics
// Returns: id, name, member_count, plan, tasks_completed_count, last_active, activity_score
// All data is privacy-safe: aggregate metrics only, no personal content

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

// Demo fallback families
const DEMO_FAMILIES: SafeFamilyRecord[] = [
  { id: 'f-001', name: 'Al-Ahmadi', member_count: 5, plan: 'family_plus', tasks_completed_count: 342, last_active: '2025-03-04T20:30:00Z', activity_score: 94 },
  { id: 'f-002', name: 'Al-Qahtani', member_count: 4, plan: 'pro', tasks_completed_count: 287, last_active: '2025-03-04T18:15:00Z', activity_score: 88 },
  { id: 'f-003', name: 'Al-Shammari', member_count: 6, plan: 'family_plus', tasks_completed_count: 256, last_active: '2025-03-04T16:45:00Z', activity_score: 82 },
  { id: 'f-004', name: 'Al-Dosari', member_count: 3, plan: 'pro', tasks_completed_count: 198, last_active: '2025-03-04T14:20:00Z', activity_score: 76 },
  { id: 'f-005', name: 'Al-Harbi', member_count: 4, plan: 'free', tasks_completed_count: 145, last_active: '2025-03-03T22:10:00Z', activity_score: 71 },
  { id: 'f-006', name: 'Al-Ghamdi', member_count: 2, plan: 'pro', tasks_completed_count: 167, last_active: '2025-03-03T19:45:00Z', activity_score: 68 },
  { id: 'f-007', name: 'Al-Zahrani', member_count: 5, plan: 'free', tasks_completed_count: 89, last_active: '2025-03-02T11:30:00Z', activity_score: 55 },
  { id: 'f-008', name: 'Al-Otaibi', member_count: 3, plan: 'pro', tasks_completed_count: 134, last_active: '2025-03-01T09:15:00Z', activity_score: 62 },
  { id: 'f-009', name: 'Al-Mutairi', member_count: 4, plan: 'family_plus', tasks_completed_count: 223, last_active: '2025-02-28T17:00:00Z', activity_score: 79 },
  { id: 'f-010', name: 'Al-Shehri', member_count: 2, plan: 'free', tasks_completed_count: 56, last_active: '2025-02-27T14:30:00Z', activity_score: 43 },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))
  const plan = searchParams.get('plan')
  const search = searchParams.get('search')

  const supabase = getSupabaseAdmin()

  if (!supabase) {
    // Return demo data with pagination
    let filtered = [...DEMO_FAMILIES]
    if (plan) filtered = filtered.filter(f => f.plan === plan)
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(f => f.name.toLowerCase().includes(q))
    }

    const total = filtered.length
    const start = (page - 1) * pageSize
    const paginatedData = filtered.slice(start, start + pageSize)

    return NextResponse.json({
      source: 'demo',
      data: paginatedData,
      total,
      page,
      pageSize,
      hasMore: start + pageSize < total,
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
      // Table doesn't exist — return demo data
      let filtered = [...DEMO_FAMILIES]
      if (plan) filtered = filtered.filter(f => f.plan === plan)
      if (search) {
        const q = search.toLowerCase()
        filtered = filtered.filter(f => f.name.toLowerCase().includes(q))
      }
      const total = filtered.length
      const startIdx = (page - 1) * pageSize
      const paginatedData = filtered.slice(startIdx, startIdx + pageSize)

      return NextResponse.json({
        source: 'demo',
        data: paginatedData,
        total,
        page,
        pageSize,
        hasMore: startIdx + pageSize < total,
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
      familyId: string,
      updatedAt: string | null,
      memberCount: number,
      tasksCompleted: number,
    ): number {
      // Task score: 0-50 based on completed tasks (capped at 500 for 50 points)
      const taskScore = Math.min((tasksCompleted / 500) * 50, 50)

      // Member score: 0-30 based on member count (capped at 10 for 30 points)
      const memberScore = Math.min((memberCount / 10) * 30, 30)

      // Recency score: 0-20 based on days since last update
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
        activity_score: calculateActivityScore(f.id, f.updated_at, memberCount, tasksCompleted),
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
    // On error, return demo data
    let filtered = [...DEMO_FAMILIES]
    if (plan) filtered = filtered.filter(f => f.plan === plan)
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(f => f.name.toLowerCase().includes(q))
    }
    const total = filtered.length
    const startIdx = (page - 1) * pageSize
    const paginatedData = filtered.slice(startIdx, startIdx + pageSize)

    return NextResponse.json({
      source: 'demo',
      data: paginatedData,
      total,
      page,
      pageSize,
      hasMore: startIdx + pageSize < total,
    })
  }
}
