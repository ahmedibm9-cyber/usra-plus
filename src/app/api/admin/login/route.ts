import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import {
  createAdminSessionToken,
  getAdminCookieName,
  getAdminCookieOptions,
} from '@/lib/admin-session'
import { db } from '@/lib/db'

// ─── Server-Side Admin Authentication ──────────────────────────────────────
// Single admin credential with role selector.
// Sessions use HMAC-signed tokens in httpOnly cookies — tamper-proof.
// All login attempts are audited.

const ALLOWED_ROLES = ['super_admin', 'support_admin', 'analytics_admin', 'billing_admin'] as const
type AllowedRole = typeof ALLOWED_ROLES[number]

const ROLE_NAMES: Record<AllowedRole, string> = {
  super_admin: 'USRA Founder',
  support_admin: 'Support Admin',
  analytics_admin: 'Analytics Admin',
  billing_admin: 'Billing Admin',
}

// Single admin account — one credential, role selected at login
const ADMIN_EMAIL = 'admin@usraplus.com'
// Default password for first run — should be changed via ADMIN_PASSWORD env var
const DEFAULT_ADMIN_PASSWORD = 'usra2024admin'
const ADMIN_PASSWORD: string = process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD

// Bcrypt hash — computed on first request from ADMIN_PASSWORD env var
let cachedHash: string | null = null

async function getPasswordHash(): Promise<string> {
  if (cachedHash) return cachedHash
  const envHash = process.env.ADMIN_PASSWORD_HASH
  if (envHash) {
    cachedHash = envHash
    return envHash
  }
  // Generate hash on first use (ADMIN_PASSWORD is guaranteed defined when this is called)
  cachedHash = await bcrypt.hash(ADMIN_PASSWORD!, 12)
  return cachedHash
}

// Track failed login attempts for brute force protection
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>()
const MAX_FAILED_ATTEMPTS = 10
const LOCKOUT_DURATION = 30 * 60 * 1000 // 30 minutes

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_LOGIN)
    if (rateLimitResponse) return rateLimitResponse

    // Warn if using default password (not configured via env var)
    if (!process.env.ADMIN_PASSWORD) {
      console.warn('[AdminLogin] Using default ADMIN_PASSWORD — set the ADMIN_PASSWORD env var for production')
    }

    const { email, password, role } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password required' }, { status: 400 })
    }

    // Validate role
    const selectedRole: AllowedRole = role || 'support_admin'
    if (!ALLOWED_ROLES.includes(selectedRole)) {
      return NextResponse.json({ success: false, error: 'Invalid role selected' }, { status: 400 })
    }

    // Check brute force lockout
    const clientKey = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const lockout = failedAttempts.get(clientKey)
    if (lockout && lockout.count >= MAX_FAILED_ATTEMPTS && Date.now() < lockout.lockedUntil) {
      return NextResponse.json(
        { success: false, error: 'Account temporarily locked. Try again later.' },
        { status: 429 }
      )
    }

    // Validate email is the single admin account
    if (email !== ADMIN_EMAIL) {
      recordFailedAttempt(clientKey)
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    // Check credentials with bcrypt only
    let authenticated = false
    const passwordHash = await getPasswordHash()

    try {
      authenticated = await bcrypt.compare(password, passwordHash)
    } catch {
      // bcrypt comparison error — do not fall back to plaintext
    }

    if (!authenticated) {
      recordFailedAttempt(clientKey)
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
    }

    // Clear failed attempts on successful login
    failedAttempts.delete(clientKey)

    // ─── First-run seed: ensure admin user exists in DB ───────────────────
    // The admin panel uses its own HMAC-signed session system (not the User model),
    // but we create a DB record for audit trails and future features.
    try {
      const existingAdmin = await db.user.findUnique({ where: { email: ADMIN_EMAIL } }).catch(() => null)
      if (!existingAdmin) {
        const hash = await getPasswordHash()
        await db.user.create({
          data: {
            email: ADMIN_EMAIL,
            passwordHash: hash,
            firstName: 'USRA',
            lastName: 'Admin',
            language: 'en',
            theme: 'dark',
            emailVerified: true,
          },
        }).catch(() => {})
        console.log('[AdminLogin] Seeded initial admin user in database')
      }
    } catch {
      // Non-critical: DB seed failure should not block login
    }

    // Use the selected role for this session
    const sessionRole = selectedRole
    const adminName = ROLE_NAMES[selectedRole]

    // Create HMAC-signed session token
    const sessionToken = createAdminSessionToken(email, sessionRole)

    const adminUser = {
      id: `admin-${sessionRole}`,
      email,
      role: sessionRole,
      name: adminName,
      avatar_url: null,
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }

    const cookieOptions = getAdminCookieOptions()
    const cookieName = getAdminCookieName()

    const response = NextResponse.json({
      success: true,
      adminUser,
    })

    response.cookies.set(cookieName, sessionToken, {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
      maxAge: cookieOptions.maxAge,
    })

    return response
  } catch (error) {
    console.error('[AdminLogin] Error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

function recordFailedAttempt(clientKey: string) {
  const existing = failedAttempts.get(clientKey)
  if (existing) {
    existing.count++
    if (existing.count >= MAX_FAILED_ATTEMPTS) {
      existing.lockedUntil = Date.now() + LOCKOUT_DURATION
    }
  } else {
    failedAttempts.set(clientKey, { count: 1, lockedUntil: 0 })
  }
}
