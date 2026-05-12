/**
 * Server-side authentication utilities for API route protection.
 *
 * Verifies the `usra-auth-token` cookie by checking both Prisma (SQLite)
 * and Supabase Auth sessions. Also supports Supabase Auth session cookies
 * (sb-access-token) for users who signed in via Supabase Auth directly.
 */

import { NextRequest } from 'next/server'
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

/**
 * Verify the authenticated user from the request's session cookie.
 * Returns the user ID if authenticated, or null if not.
 *
 * Checks Prisma first (local/SQLite sessions), then falls back to
 * Supabase Auth (access token sessions). Also checks for Supabase
 * Auth session cookies (sb-access-token) as a fallback for users
 * who signed in via Supabase Auth directly.
 */
export async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('usra-auth-token')?.value

  if (token) {
    // Try Prisma first (works when using SQLite or PostgreSQL via Prisma)
    try {
      const session = await db.session.findUnique({
        where: { token },
        include: { user: true },
      })

      if (session && session.expiresAt > new Date()) {
        return session.user.id
      }

      // Clean up expired session
      if (session) {
        await db.session.delete({ where: { id: session.id } }).catch(() => {})
      }
    } catch {
      // Prisma unavailable, try Supabase
    }

    // Fallback: Validate the Supabase Auth JWT token
    // The usra-auth-token may be a Supabase access token (JWT) from the login flow.
    // We must use the ANON key client (not admin) for getUser(jwt) — the admin client
    // uses service role auth which conflicts with user JWT validation.
    const anonClient = getSupabaseAnonClient()
    if (anonClient) {
      try {
        const { data: { user: authUser }, error } = await anonClient.auth.getUser(token)

        if (!error && authUser) {
          return authUser.id
        }
      } catch {
        // Supabase session check failed
      }
    }

    // Also try admin client as fallback (for service role tokens)
    const supabase = getSupabaseAdmin()
    if (supabase) {
      try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser(token)

        if (!error && authUser) {
          return authUser.id
        }
      } catch {
        // Admin client check failed
      }
    }
  }

  // Also check for Supabase Auth session cookies
  // Users who signed in via Supabase Auth will have sb-access-token cookies
  const supabaseAccessToken = request.cookies.get('sb-access-token')?.value
    || request.cookies.get(process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, '').replace(/\./g, '-') + '-auth-token')?.value

  if (supabaseAccessToken) {
    const anonClient = getSupabaseAnonClient()
    if (anonClient) {
      try {
        const { data: { user: authUser }, error } = await anonClient.auth.getUser(supabaseAccessToken)

        if (!error && authUser) {
          return authUser.id
        }
      } catch {
        // Supabase session check failed
      }
    }
  }

  return null
}

/**
 * Verify authentication and return a proper error response if not authenticated.
 * Usage in API routes:
 *
 *   const { userId, error } = await requireAuth(request)
 *   if (error) return error
 */
export async function requireAuth(request: NextRequest): Promise<{
  userId: string
  error?: never
} | {
  userId?: never
  error: Response
}> {
  const userId = await getAuthenticatedUserId(request)

  if (!userId) {
    return {
      error: new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    }
  }

  return { userId }
}
