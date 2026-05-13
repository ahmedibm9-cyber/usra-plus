import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import type { TrialStatus } from '@/types/admin'

// ─── GET: List all user trials with filtering ────────────────────────────
export async function GET(request: NextRequest) {

  try {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({
      source: 'demo',
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      hasMore: false,
    })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as TrialStatus | null
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))

  try {
    let query = supabase
      .from('user_trials')
      .select('*', { count: 'exact' })

    if (status) {
      query = query.eq('status', status)
    }
    if (dateFrom) {
      query = query.gte('started_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('started_at', dateTo)
    }

    const start = (page - 1) * pageSize
    query = query.range(start, start + pageSize - 1).order('created_at', { ascending: false })

    const { data, count, error } = await query

    if (error) {
      return NextResponse.json({
        source: 'demo',
        data: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
      })
    }

    return NextResponse.json({
      source: 'live',
      data: data || [],
      total: count ?? 0,
      page,
      pageSize,
      hasMore: start + pageSize < (count ?? 0),
    })
  } catch (err) {
    return NextResponse.json({
      source: 'demo',
      data: [],
      total: 0,
      page,
      pageSize,
      hasMore: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    })
  }

  } catch (error) {

    console.error('[src.app.api.admin.trials] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}

// ─── POST: Manually start/extend a trial for a user ─────────────────────
export async function POST(request: NextRequest) {

  try {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json({ source: 'demo', error: 'Database not configured' }, { status: 503 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { userId, action, durationDays } = body as {
    userId?: string
    action?: 'start' | 'extend'
    durationDays?: number
  }

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  if (!action || !['start', 'extend'].includes(action)) {
    return NextResponse.json({ error: 'action must be "start" or "extend"' }, { status: 400 })
  }

  const trialDays = durationDays || 3
  const now = new Date()
  const expiresAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000).toISOString()

  try {
    if (action === 'start') {
      // Check if user already has an active trial
      const { data: existing } = await supabase
        .from('user_trials')
        .select('id, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ error: 'User already has an active trial' }, { status: 409 })
      }

      const { data, error } = await supabase
        .from('user_trials')
        .insert({
          user_id: userId,
          status: 'active',
          started_at: now.toISOString(),
          expires_at: expiresAt,
          was_abuse_flagged: false,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: 'Failed to start trial', details: error.message }, { status: 500 })
      }

      return NextResponse.json({ source: 'live', success: true, trial: data }, { status: 201 })
    }

    if (action === 'extend') {
      // Find the current active trial and extend it
      const { data: current } = await supabase
        .from('user_trials')
        .select('id, expires_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle()

      if (!current) {
        return NextResponse.json({ error: 'No active trial found for this user' }, { status: 404 })
      }

      const currentExpiry = new Date((current as Record<string, unknown>).expires_at as string)
      const newExpiry = new Date(currentExpiry.getTime() + trialDays * 24 * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('user_trials')
        .update({ expires_at: newExpiry, updated_at: new Date().toISOString() })
        .eq('id', (current as Record<string, unknown>).id as string)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: 'Failed to extend trial', details: error.message }, { status: 500 })
      }

      return NextResponse.json({ source: 'live', success: true, trial: data })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to process trial action',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.trials] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}
