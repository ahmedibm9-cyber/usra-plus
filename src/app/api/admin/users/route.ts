import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin Users API Route
// Queries profiles table with pagination and filtering
// Returns ONLY privacy-safe fields: id, email, name, plan, status, last_login, created_at, family_count, language, country
// NO private data (no messages, files, task content)

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

// Demo fallback users
const DEMO_USERS: SafeUserRecord[] = [
  { id: 'u-001', email: 'ahmed@email.com', name: 'Ahmed Al-Rashid', plan: 'pro', status: 'active', last_login: '2025-03-04T14:30:00Z', created_at: '2024-06-12T08:00:00Z', family_count: 2, language: 'ar', country: 'SA' },
  { id: 'u-002', email: 'fatima@email.com', name: 'Fatima Hassan', plan: 'free', status: 'active', last_login: '2025-03-04T10:15:00Z', created_at: '2024-08-22T12:00:00Z', family_count: 1, language: 'ar', country: 'SA' },
  { id: 'u-003', email: 'khalid@email.com', name: 'Khalid Al-Maktoum', plan: 'family_plus', status: 'active', last_login: '2025-03-03T22:45:00Z', created_at: '2024-04-05T09:00:00Z', family_count: 3, language: 'ar', country: 'AE' },
  { id: 'u-004', email: 'noura@email.com', name: 'Noura Al-Said', plan: 'free', status: 'flagged', last_login: '2025-02-28T06:20:00Z', created_at: '2024-11-01T14:00:00Z', family_count: 0, language: 'ar', country: 'SA' },
  { id: 'u-005', email: 'omar@email.com', name: 'Omar Al-Faisal', plan: 'pro', status: 'active', last_login: '2025-03-04T16:00:00Z', created_at: '2024-07-18T11:00:00Z', family_count: 1, language: 'en', country: 'SA' },
  { id: 'u-006', email: 'sara@email.com', name: 'Sara Al-Qahtani', plan: 'free', status: 'active', last_login: '2025-03-04T09:30:00Z', created_at: '2024-09-30T15:00:00Z', family_count: 1, language: 'ar', country: 'SA' },
  { id: 'u-007', email: 'mohammed@email.com', name: 'Mohammed Al-Dosari', plan: 'family_plus', status: 'suspended', last_login: '2025-02-10T13:00:00Z', created_at: '2024-05-20T10:00:00Z', family_count: 2, language: 'ar', country: 'KW' },
  { id: 'u-008', email: 'layla@email.com', name: 'Layla Al-Harbi', plan: 'pro', status: 'active', last_login: '2025-03-04T11:45:00Z', created_at: '2024-03-14T08:00:00Z', family_count: 1, language: 'ar', country: 'SA' },
  { id: 'u-009', email: 'aziz@email.com', name: 'Abdulaziz Al-Shammari', plan: 'free', status: 'active', last_login: '2025-03-03T18:00:00Z', created_at: '2024-10-08T16:00:00Z', family_count: 0, language: 'en', country: 'QA' },
  { id: 'u-010', email: 'huda@email.com', name: 'Huda Al-Ghamdi', plan: 'pro', status: 'active', last_login: '2025-03-04T07:30:00Z', created_at: '2024-06-25T09:00:00Z', family_count: 1, language: 'ar', country: 'SA' },
  { id: 'u-011', email: 'rashid@email.com', name: 'Rashid Al-Naimi', plan: 'family_plus', status: 'active', last_login: '2025-03-04T20:15:00Z', created_at: '2024-02-10T07:00:00Z', family_count: 4, language: 'ar', country: 'AE' },
  { id: 'u-012', email: 'amal@email.com', name: 'Amal Al-Zahrani', plan: 'free', status: 'flagged', last_login: '2025-01-20T12:00:00Z', created_at: '2024-12-05T13:00:00Z', family_count: 0, language: 'ar', country: 'SA' },
  { id: 'u-013', email: 'yasser@email.com', name: 'Yasser Al-Otaibi', plan: 'pro', status: 'active', last_login: '2025-03-02T15:30:00Z', created_at: '2024-08-01T10:00:00Z', family_count: 1, language: 'ar', country: 'BH' },
  { id: 'u-014', email: 'maha@email.com', name: 'Maha Al-Khalifa', plan: 'family_plus', status: 'active', last_login: '2025-03-04T13:00:00Z', created_at: '2024-04-18T08:00:00Z', family_count: 3, language: 'ar', country: 'BH' },
  { id: 'u-015', email: 'tarek@email.com', name: 'Tarek Al-Suwaidi', plan: 'free', status: 'suspended', last_login: '2025-01-15T09:00:00Z', created_at: '2024-07-22T14:00:00Z', family_count: 0, language: 'en', country: 'OM' },
  { id: 'u-016', email: 'dina@email.com', name: 'Dina Al-Mutairi', plan: 'pro', status: 'active', last_login: '2025-03-04T17:45:00Z', created_at: '2024-09-10T11:00:00Z', family_count: 2, language: 'ar', country: 'SA' },
  { id: 'u-017', email: 'faisal@email.com', name: 'Faisal Al-Ahmadi', plan: 'free', status: 'active', last_login: '2025-03-01T08:00:00Z', created_at: '2025-01-05T10:00:00Z', family_count: 0, language: 'ar', country: 'KW' },
  { id: 'u-018', email: 'reem@email.com', name: 'Reem Al-Enazi', plan: 'pro', status: 'active', last_login: '2025-03-04T19:20:00Z', created_at: '2024-11-20T09:00:00Z', family_count: 1, language: 'ar', country: 'SA' },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))
  const plan = searchParams.get('plan') // 'free', 'pro', 'family_plus'
  const status = searchParams.get('status') // 'active', 'suspended', 'flagged'
  const search = searchParams.get('search') // search by name or email

  const supabase = getSupabaseAdmin()

  if (!supabase) {
    // Return demo data with pagination
    let filtered = [...DEMO_USERS]
    if (plan) filtered = filtered.filter(u => u.plan === plan)
    if (status) filtered = filtered.filter(u => u.status === status)
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
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
      // Table doesn't exist or query error — return demo data
      let filtered = [...DEMO_USERS]
      if (plan) filtered = filtered.filter(u => u.plan === plan)
      if (status) filtered = filtered.filter(u => u.status === status)
      if (search) {
        const q = search.toLowerCase()
        filtered = filtered.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
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

    // Enrich with family_count from family_members table
    const userIds = (profiles || []).map(p => p.id)
    let familyCounts: Record<string, number> = {}

    if (userIds.length > 0) {
      const { data: memberships } = await supabase
        .from('family_members')
        .select('user_id, family_id')
        .in('user_id', userIds)

      if (memberships) {
        // Count distinct families per user
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
    // On error, return demo data
    let filtered = [...DEMO_USERS]
    if (plan) filtered = filtered.filter(u => u.plan === plan)
    if (status) filtered = filtered.filter(u => u.status === status)
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
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
