import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin Users API Route
// Queries profiles table with pagination and filtering
// Returns ONLY privacy-safe fields: id, email, name, plan, status, last_login, created_at, family_count, language, country
// NO private data (no messages, files, task content)
// When Supabase is unavailable or tables don't exist, returns empty data with source: 'demo'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Privacy-safe user fields
interface SafeUserRecord {
  id: string
  email: string
  name: string
  plan: string
  status: string
  last_login: string | null
  created_at: string
  family_count: number
  language: string
  country: string | null
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))
  const plan = searchParams.get('plan')
  const status = searchParams.get('status')
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
    // Build query — select only privacy-safe fields
    let query = supabase
      .from('profiles')
      .select('id, email, name, plan, status, last_login, created_at, language, country', { count: 'exact' })

    // Apply filters
    if (plan) {
      query = query.eq('plan', plan)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Apply pagination
    const start = (page - 1) * pageSize
    query = query.range(start, start + pageSize - 1).order('created_at', { ascending: false })

    const { data: profiles, count, error } = await query

    if (error) {
      // Table doesn't exist or query error — return empty data
      return NextResponse.json({
        source: 'demo',
        data: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
      })
    }

    // Enrich with family_count from family_members table
    const userIds = (profiles || []).map(p => p.id)
    let familyCounts: Record<string, number> = {}

    if (userIds.length > 0) {
      const { data: memberships } = await supabase
        .from('family_members')
        .select('user_id, family_id')
        .in('user_id', userIds)

      if (memberships) {
        const userFamilies: Record<string, Set<string>> = {}
        for (const m of memberships) {
          if (!userFamilies[m.user_id]) userFamilies[m.user_id] = new Set()
          userFamilies[m.user_id].add(m.family_id)
        }
        for (const [uid, families] of Object.entries(userFamilies)) {
          familyCounts[uid] = families.size
        }
      }
    }

    // Build safe user records
    const safeUsers: SafeUserRecord[] = (profiles || []).map(p => ({
      id: p.id,
      email: p.email || '',
      name: p.name || '',
      plan: p.plan || 'free',
      status: p.status || 'active',
      last_login: p.last_login || null,
      created_at: p.created_at || '',
      family_count: familyCounts[p.id] || 0,
      language: p.language || 'en',
      country: p.country || null,
    }))

    const total = count ?? 0

    return NextResponse.json({
      source: 'live',
      data: safeUsers,
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
