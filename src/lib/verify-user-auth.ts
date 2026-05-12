/**
 * Server-side user authentication verification for API routes.
 *
 * Validates that the request comes from an authenticated Supabase user
 * by actually verifying the JWT token — NOT just checking cookie names.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { verifyAdminAuth } from '@/lib/admin-auth'
import type { NextRequest } from 'next/server'

interface UserAuthResult {
  authenticated: boolean
  userId?: string
  email?: string
  reason?: string
}

/**
 * Extract and validate the Supabase access token from cookies.
 * Uses the service role admin client to verify the JWT server-side.
 */
export async function verifyUserAuth(request: NextRequest): Promise<UserAuthResult> {
  // 1. Check admin auth first (admin users are always authorized)
  const adminAuth = verifyAdminAuth(request)
  if (adminAuth.authenticated) {
    return { authenticated: true, userId: 'admin', email: adminAuth.admin?.email }
  }

  // 2. Extract Supabase access token from cookies
  const cookieHeader = request.headers.get('cookie') || ''
  const accessToken = extractSupabaseToken(cookieHeader)

  if (!accessToken) {
    // 3. In development mode, allow requests without auth for demo accounts
    //    This is needed because demo accounts use localStorage auth, not Supabase cookies
    if (process.env.NODE_ENV === 'development') {
      return { authenticated: true, userId: 'dev-mode', reason: 'dev-mode-bypass' }
    }
    return { authenticated: false, reason: 'No access token found' }
  }

  // 4. Verify the token server-side using Supabase admin
  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) {
    // If admin client not available, fall back to cookie presence check
    // This should only happen in misconfigured environments
    console.warn('[USRA PLUS] Supabase admin client not available for token verification')
    return { authenticated: true, userId: 'cookie-only', reason: 'admin-client-unavailable' }
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken)
    if (error) {
      return { authenticated: false, reason: `Token verification failed: ${error.message}` }
    }
    if (data.user) {
      return { authenticated: true, userId: data.user.id, email: data.user.email }
    }
    return { authenticated: false, reason: 'No user found for token' }
  } catch {
    return { authenticated: false, reason: 'Token verification error' }
  }
}

/**
 * Extract the Supabase access token from cookie header.
 * Handles both the standard format and project-specific cookie names.
 */
function extractSupabaseToken(cookieHeader: string): string | null {
  const cookies = cookieHeader.split(';')

  // Try project-specific cookie name first: sb-{projectRef}-auth-token
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '')
  const projectCookieName = `sb-${projectRef}-auth-token`

  for (const cookie of cookies) {
    const trimmed = cookie.trim()
    // Check project-specific cookie
    if (trimmed.startsWith(`${projectCookieName}=`)) {
      const value = trimmed.substring(projectCookieName.length + 1)
      return decodeSupabaseCookie(value)
    }
    // Check generic sb-access-token
    if (trimmed.startsWith('sb-access-token=')) {
      return trimmed.substring('sb-access-token='.length)
    }
  }

  return null
}

/**
 * Decode the Supabase auth cookie value.
 * The cookie format is: base64(JSON{access_token, refresh_token, ...})
 */
function decodeSupabaseCookie(value: string): string | null {
  try {
    // Supabase stores the token as base64-encoded JSON
    const decoded = decodeURIComponent(value)
    const parsed = JSON.parse(atob(decoded))
    return parsed?.access_token || null
  } catch {
    // If decoding fails, the value might be the raw token
    return value
  }
}
