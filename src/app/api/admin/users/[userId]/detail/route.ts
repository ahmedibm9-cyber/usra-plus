import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// ─── Types ────────────────────────────────────────────────────────────────

interface AuthIdentity {
  provider: string
  identity_data: Record<string, unknown> | null
  created_at: string | null
  last_sign_in_at: string | null
}

interface AuthFactor {
  id: string
  factor_type: string
  status: string
  created_at: string | null
  updated_at: string | null
}

interface PasswordInfo {
  has_password: boolean
  last_password_change: string | null
  encryption_type: string
  providers: string[]
  mfa_enabled: boolean
}

interface AuthData {
  id: string
  email: string | null
  phone: string | null
  email_confirmed_at: string | null
  phone_confirmed_at: string | null
  confirmed_at: string | null
  last_sign_in_at: string | null
  created_at: string | null
  updated_at: string | null
  role: string | null
  app_metadata: Record<string, unknown> | null
  user_metadata: Record<string, unknown> | null
  identities: AuthIdentity[]
  factors: AuthFactor[]
  password_info: PasswordInfo
}

interface UserDetailResponse {
  source: 'live' | 'demo'
  auth: AuthData | null
  profile: Record<string, unknown> | null
  subscription: Record<string, unknown> | null
  trials: Record<string, unknown>[]
  bans: Record<string, unknown>[]
  trustScore: Record<string, unknown> | null
  notes: Record<string, unknown>[]
  sessions: Record<string, unknown>[]
  families: Record<string, unknown>[]
  devices: Record<string, unknown>[]
  error?: string
  details?: string
}

// GET /api/admin/users/[userId]/detail - Full user account details (super_admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse<UserDetailResponse>> {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse as NextResponse<UserDetailResponse>

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' } as UserDetailResponse, { status: 401 })
  }

  // Only super_admin can see full account details including auth data
  if (auth.admin?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden - super_admin only' } as UserDetailResponse, { status: 403 })
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return NextResponse.json(
      { source: 'demo', auth: null, profile: null, subscription: null, trials: [], bans: [], trustScore: null, notes: [], sessions: [], families: [], devices: [], error: 'Database not configured' },
      { status: 503 }
    )
  }

  const { userId } = await params

  try {
    // 1. Fetch auth user data using Supabase Admin API
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)

    // 2. Fetch profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    // If neither auth user nor profile exists, return 404
    if ((authError || !authUser?.user) && (profileError || !profile)) {
      return NextResponse.json(
        { source: 'demo', auth: null, profile: null, subscription: null, trials: [], bans: [], trustScore: null, notes: [], sessions: [], families: [], devices: [], error: 'User not found' },
        { status: 404 }
      )
    }

    // 3. Fetch all related data in parallel
    const [subscriptionResult, trialResult, bansResult, trustResult, notesResult, sessionsResult, familiesResult] = await Promise.allSettled([
      supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_trials').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10),
      supabase.from('user_bans').select('*').eq('user_id', userId).order('issued_at', { ascending: false }).limit(20),
      supabase.from('user_trust_scores').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_notes').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      supabase.from('user_sessions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      supabase.from('family_members').select('family_id, role, nickname, families(id, name)').eq('user_id', userId),
    ])

    // 4. Fetch device fingerprints
    const deviceResult = await supabase
      .from('device_fingerprints')
      .select('*')
      .eq('user_id', userId)
      .order('last_seen', { ascending: false })
      .limit(10)

    // Build comprehensive auth data response
    const authData: AuthData | null = authUser?.user ? {
      id: authUser.user.id,
      email: authUser.user.email ?? null,
      phone: authUser.user.phone ?? null,
      email_confirmed_at: authUser.user.email_confirmed_at ?? null,
      phone_confirmed_at: authUser.user.phone_confirmed_at ?? null,
      confirmed_at: authUser.user.confirmed_at ?? null,
      last_sign_in_at: authUser.user.last_sign_in_at ?? null,
      created_at: authUser.user.created_at ?? null,
      updated_at: authUser.user.updated_at ?? null,
      role: authUser.user.role ?? null,
      app_metadata: authUser.user.app_metadata ?? null,
      user_metadata: authUser.user.user_metadata ?? null,
      identities: authUser.user.identities?.map(i => ({
        provider: i.provider,
        identity_data: i.identity_data as Record<string, unknown> | null,
        created_at: i.created_at ?? null,
        last_sign_in_at: i.last_sign_in_at ?? null,
      })) ?? [],
      factors: authUser.user.factors?.map(f => ({
        id: f.id,
        factor_type: f.factor_type,
        status: f.status,
        created_at: f.created_at ?? null,
        updated_at: f.updated_at ?? null,
      })) ?? [],
      // Password info (no plaintext — just metadata)
      password_info: {
        has_password: !!(authUser.user.user_metadata?.password_hash || authUser.user.app_metadata?.provider === 'email'),
        last_password_change: authUser.user.updated_at || null,
        encryption_type: 'bcrypt (Supabase Auth)',
        providers: authUser.user.identities?.map(i => i.provider) || [],
        mfa_enabled: (authUser.user.factors?.filter(f => f.status === 'verified').length || 0) > 0,
      },
    } : null

    // Helper to extract data from settled results
    const settleData = <T>(result: PromiseSettledResult<{ data: T | null; error: { message: string } | null }>): T | null =>
      result.status === 'fulfilled' && !result.value.error ? result.value.data : null

    const settleDataArray = <T>(result: PromiseSettledResult<{ data: T[] | null; error: { message: string } | null }>): T[] =>
      result.status === 'fulfilled' && !result.value.error ? (result.value.data || []) : []

    return NextResponse.json({
      source: authData || profile ? 'live' : 'demo',
      auth: authData,
      profile: profile || null,
      subscription: settleData(subscriptionResult as PromiseSettledResult<{ data: Record<string, unknown> | null; error: { message: string } | null }>),
      trials: settleDataArray(trialResult as PromiseSettledResult<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>),
      bans: settleDataArray(bansResult as PromiseSettledResult<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>),
      trustScore: settleData(trustResult as PromiseSettledResult<{ data: Record<string, unknown> | null; error: { message: string } | null }>),
      notes: settleDataArray(notesResult as PromiseSettledResult<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>),
      sessions: settleDataArray(sessionsResult as PromiseSettledResult<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>),
      families: settleDataArray(familiesResult as PromiseSettledResult<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>),
      devices: deviceResult.data || [],
    })
  } catch (err) {
    return NextResponse.json({
      source: 'demo',
      auth: null,
      profile: null,
      subscription: null,
      trials: [],
      bans: [],
      trustScore: null,
      notes: [],
      sessions: [],
      families: [],
      devices: [],
      error: 'Failed to fetch user details',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }
}
