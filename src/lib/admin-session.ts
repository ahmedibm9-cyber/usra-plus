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
 * Requires explicit ADMIN_SESSION_SECRET or ADMIN_SECRET_KEY.
 * In production, missing configuration is a fatal error.
 */
function getSigningKey(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_SECRET_KEY
  if (secret) return secret

  // Dev-only fallback — never used in production
  if (process.env.NODE_ENV !== 'production') {
    const fallback = 'usra-admin-session-dev-secret-only'
    console.warn('[AdminSession] WARNING: Using dev-only fallback signing key. Set ADMIN_SESSION_SECRET for production.')
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
