/**
 * Secure Admin Session Manager
 * 
 * Replaces the insecure base64-encoded session token with HMAC-signed sessions.
 * Sessions are stored in httpOnly cookies set by the server.
 * Tokens are tamper-proof and expire automatically.
 * 
 * Single admin credential: admin@usraplus.com
 * Role is selected at login and embedded in the session token.
 */

import { createHmac, timingSafeEqual, randomBytes } from 'crypto'

// Session duration: 4 hours
const SESSION_DURATION_MS = 4 * 60 * 60 * 1000
const COOKIE_NAME = 'usra-admin-session'

interface AdminSessionPayload {
  email: string
  role: string
  issuedAt: number
  expiresAt: number
  nonce: string
}

interface SignedSession {
  payload: string
  signature: string
}

/**
 * Get the HMAC signing key from environment.
 * Falls back to a derived key from other secrets if ADMIN_SESSION_SECRET is not set.
 */
function getSigningKey(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SECRET_KEY
  if (secret) return secret

  // Fallback for first-run / dev: derive a stable key from other available secrets
  if (process.env.NODE_ENV !== 'production') {
    const fallback = 'usra-admin-session-secret-dev-only-' + (process.env.DATABASE_URL || 'default')
    console.warn('[AdminSession] WARNING: Using derived fallback signing key. Set ADMIN_SESSION_SECRET for production.')
    return fallback
  }

  throw new Error('ADMIN_SESSION_SECRET or ADMIN_SECRET_KEY environment variable is required for admin session signing')
}

/**
 * Create an HMAC signature for the session payload.
 */
function signPayload(payload: string): string {
  return createHmac('sha256', getSigningKey())
    .update(payload)
    .digest('hex')
}

/**
 * Create a signed admin session token.
 */
export function createAdminSessionToken(email: string, role: string): string {
  const issuedAt = Date.now()
  const expiresAt = issuedAt + SESSION_DURATION_MS
  const nonce = createHmac('sha256', getSigningKey())
    .update(`${email}:${role}:${issuedAt}:${randomBytes(16).toString('hex')}`)
    .digest('hex')
    .slice(0, 16)

  const payload: AdminSessionPayload = {
    email,
    role,
    issuedAt,
    expiresAt,
    nonce,
  }

  const payloadStr = JSON.stringify(payload)
  const payloadB64 = Buffer.from(payloadStr).toString('base64')
  const signature = signPayload(payloadB64)

  const session: SignedSession = {
    payload: payloadB64,
    signature,
  }

  return Buffer.from(JSON.stringify(session)).toString('base64')
}

/**
 * Verify a signed admin session token.
 * Returns the session payload if valid, or null if invalid/expired.
 */
export function verifyAdminSessionToken(token: string): AdminSessionPayload | null {
  try {
    const sessionJson = Buffer.from(token, 'base64').toString('utf-8')
    const session: SignedSession = JSON.parse(sessionJson)

    if (!session.payload || !session.signature) {
      return null
    }

    // Verify signature using timing-safe comparison
    const expectedSignature = signPayload(session.payload)
    const sigBuffer = Buffer.from(session.signature, 'hex')
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')

    if (sigBuffer.length !== expectedBuffer.length) {
      return null
    }

    if (!timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null
    }

    // Decode payload
    const payloadJson = Buffer.from(session.payload, 'base64').toString('utf-8')
    const payload: AdminSessionPayload = JSON.parse(payloadJson)

    // Check expiration
    if (Date.now() > payload.expiresAt) {
      return null
    }

    // Validate required fields
    if (!payload.email || !payload.role || !payload.expiresAt) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

/**
 * Get the cookie name for admin sessions.
 */
export function getAdminCookieName(): string {
  return COOKIE_NAME
}

/**
 * Get cookie options for admin session.
 * These are set as httpOnly, Secure, SameSite=Strict.
 */
export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000, // in seconds
  }
}

/**
 * Valid admin roles that can be assigned.
 */
const VALID_ROLES = ['super_admin', 'support_admin', 'analytics_admin', 'billing_admin']

/**
 * Known admin email addresses.
 */
const ADMIN_EMAILS = ['admin@usraplus.com']

/**
 * Verify admin auth from a request using the new signed session system.
 * This replaces the old verifyAdminAuth for new sessions.
 */
export function verifySignedAdminAuth(request: Request): {
  authenticated: boolean
  admin?: { email: string; role: string }
  reason?: string
} {
  // Method 1: Bearer token with ADMIN_SECRET_KEY
  const secretKey = process.env.ADMIN_SECRET_KEY
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

  // Method 2: Signed session cookie
  const cookieHeader = request.headers.get('cookie') || ''
  const sessionCookie = parseCookie(cookieHeader, COOKIE_NAME)

  if (sessionCookie) {
    const payload = verifyAdminSessionToken(decodeURIComponent(sessionCookie))

    if (!payload) {
      return {
        authenticated: false,
        reason: 'Invalid or expired session',
      }
    }

    // Validate the admin account is still authorized
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
        reason: 'Invalid role in session',
      }
    }

    return {
      authenticated: true,
      admin: { email: payload.email, role: payload.role },
    }
  }

  return {
    authenticated: false,
    reason: 'No valid authentication credentials',
  }
}

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
