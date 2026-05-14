/**
 * Server-side admin authentication verification utility.
 *
 * Admin API routes require authentication via one of:
 *  1. Authorization: Bearer <ADMIN_SECRET_KEY> header
 *  2. A valid HMAC-signed `usra-admin-session` cookie (httpOnly)
 *
 * The new system uses HMAC-signed tokens that are tamper-proof.
 * Old base64-encoded sessions are no longer accepted.
 *
 * Single admin credential: admin@usraplus.com
 * Role is selected at login time and embedded in the session token.
 */

import { verifyAdminSessionToken } from '@/lib/admin-session'
import { timingSafeEqual } from 'crypto'

interface AdminAuthResult {
  authenticated: boolean
  admin?: {
    email: string
    role: string
  }
  reason?: string
}

/**
 * Known admin email addresses.
 * Only admin@usraplus.com is the valid account now.
 */
const ADMIN_EMAILS = ['admin@usraplus.com']

/**
 * Valid admin roles that can be assigned.
 */
const VALID_ROLES = ['super_admin', 'support_admin', 'analytics_admin', 'billing_admin']

/**
 * Verify that the incoming request is from an authenticated admin.
 *
 * Checks (in order):
 *  1. Authorization: Bearer <ADMIN_SECRET_KEY>
 *  2. HMAC-signed usra-admin-session cookie
 */
export function verifyAdminAuth(request: Request): AdminAuthResult {
  const secretKey = process.env.ADMIN_SECRET_KEY

  // ── Method 1: Bearer token in Authorization header ──────────────────────
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i)
    if (match && secretKey) {
      // Use timing-safe comparison to prevent timing attacks
      const tokenBuf = Buffer.from(match[1])
      const keyBuf = Buffer.from(secretKey)
      if (tokenBuf.length === keyBuf.length && timingSafeEqual(tokenBuf, keyBuf)) {
        return {
          authenticated: true,
          admin: { email: 'api-key', role: 'super_admin' },
        }
      }
    }
  }

  // ── Method 2: HMAC-signed session cookie ───────────────────────────────
  const cookieHeader = request.headers.get('cookie') || ''
  const sessionCookie = parseCookie(cookieHeader, 'usra-admin-session')

  if (sessionCookie) {
    // Verify the HMAC-signed token
    const payload = verifyAdminSessionToken(decodeURIComponent(sessionCookie))

    if (!payload) {
      return {
        authenticated: false,
        reason: 'Invalid or expired session token',
      }
    }

    // Validate email is a known admin account
    if (!ADMIN_EMAILS.includes(payload.email)) {
      return {
        authenticated: false,
        reason: 'Unknown admin account',
      }
    }

    // Validate role is one of the allowed roles
    if (!VALID_ROLES.includes(payload.role)) {
      return {
        authenticated: false,
        reason: 'Invalid role — possible tampering detected',
      }
    }

    return {
      authenticated: true,
      admin: { email: payload.email, role: payload.role },
    }
  }

  return {
    authenticated: false,
    reason: 'No authentication credentials provided',
  }
}

/**
 * Parse a specific cookie value from a cookie header string.
 */
function parseCookie(cookieHeader: string, name: string): string | null {
  const prefix = `${name}=`
  const cookies = cookieHeader.split(';')
  for (const cookie of cookies) {
    const trimmed = cookie.trim()
    if (trimmed.startsWith(prefix)) {
      return trimmed.substring(prefix.length)
    }
  }
  return null
}
