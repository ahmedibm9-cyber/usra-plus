import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { db } from '@/lib/db'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// Lazy-initialized anon client for JWT validation (not admin)
let _anonClient: ReturnType<typeof createClient> | null = null
function getSupabaseAnonClient() {
  if (_anonClient) return _anonClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  _anonClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return _anonClient
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('usra-auth-token')?.value

    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    // ─── Try Prisma first (works when using SQLite or PostgreSQL via Prisma) ───
    try {
      const session = await db.session.findUnique({
        where: { token },
        include: { user: true },
      })

      if (session && session.expiresAt > new Date()) {
        return NextResponse.json({
          user: {
            id: session.user.id,
            email: session.user.email,
            firstName: session.user.firstName,
            lastName: session.user.lastName,
            phone: session.user.phone,
            countryCode: session.user.countryCode,
            avatarUrl: session.user.avatarUrl,
            language: session.user.language,
            theme: session.user.theme,
            createdAt: session.user.createdAt.toISOString(),
            updatedAt: session.user.updatedAt.toISOString(),
          },
        })
      }

      // Clean up expired session
      if (session) {
        await db.session.delete({ where: { id: session.id } }).catch(() => {})
      }
    } catch (prismaError) {
      console.log('[Local Auth] Prisma unavailable for session check, trying Supabase')
    }

    // ─── Fallback: Validate the Supabase Auth JWT token ───
    // When login falls back to Supabase, the token is the Supabase access_token (JWT).
    // We must use the ANON key client (not admin) for getUser(jwt) — the admin client
    // uses service role auth which doesn't properly validate user JWTs.
    const anonClient = getSupabaseAnonClient()
    if (anonClient) {
      try {
        const { data: { user: authUser }, error } = await anonClient.auth.getUser(token)

        if (!error && authUser) {
          // Get profile from profiles table
          const supabase = getSupabaseAdmin()
          let profile: Record<string, unknown> | null = null
          if (supabase) {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authUser.id)
              .maybeSingle()
            profile = data
          }

          return NextResponse.json({
            user: {
              id: authUser.id,
              email: authUser.email || '',
              firstName: (profile?.first_name as string) || authUser.user_metadata?.first_name || null,
              lastName: (profile?.last_name as string) || authUser.user_metadata?.last_name || null,
              phone: (profile?.phone as string) || null,
              countryCode: (profile?.country_code as string) || '+966',
              avatarUrl: (profile?.avatar_url as string) || null,
              language: (profile?.language as string) || 'en',
              theme: (profile?.theme as string) || 'dark',
              createdAt: authUser.created_at,
              updatedAt: authUser.updated_at || authUser.created_at,
            },
          })
        }
      } catch (supabaseError) {
        console.error('[Local Auth] Supabase session check failed:', supabaseError)
      }
    }

    // ─── Last resort: Try admin client (for service role tokens) ───
    const supabase = getSupabaseAdmin()
    if (supabase) {
      try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser(token)

        if (!error && authUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle()

          return NextResponse.json({
            user: {
              id: authUser.id,
              email: authUser.email || '',
              firstName: (profile?.first_name as string) || authUser.user_metadata?.first_name || null,
              lastName: (profile?.last_name as string) || authUser.user_metadata?.last_name || null,
              phone: (profile?.phone as string) || null,
              countryCode: (profile?.country_code as string) || '+966',
              avatarUrl: (profile?.avatar_url as string) || null,
              language: (profile?.language as string) || 'en',
              theme: (profile?.theme as string) || 'dark',
              createdAt: authUser.created_at,
              updatedAt: authUser.updated_at || authUser.created_at,
            },
          })
        }
      } catch {
        // Admin client also failed
      }
    }

    return NextResponse.json({ user: null }, { status: 401 })
  } catch (error) {
    console.error('[Local Auth] Me error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
