import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { db } from '@/lib/db'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { validateCSRF } from '@/lib/csrf'

// In-memory OTP attempt tracking for brute-force protection
const otpAttempts = new Map<string, { count: number; lockedUntil: number }>()
const MAX_OTP_ATTEMPTS = 5
const OTP_LOCKOUT_DURATION = 10 * 60 * 1000 // 10 minutes

// Cleanup expired OTP attempt entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of otpAttempts.entries()) {
      if (now > entry.lockedUntil) {
        otpAttempts.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

export async function POST(req: NextRequest) {
  try {
    // CSRF protection
    const csrfError = validateCSRF(req)
    if (csrfError) return csrfError

    // Rate limit verification attempts
    const rateLimitResponse = applyRateLimit(req, RATE_LIMITS.AUTH_VERIFY)
    if (rateLimitResponse) return rateLimitResponse

    const supabaseAdmin = getSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service not configured' }, { status: 503 })
    }

    const body = await req.json()
    const { email, code } = body

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      )
    }

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Verification code must be 6 digits' },
        { status: 400 }
      )
    }

    const emailLower = email.toLowerCase()

    // Check brute-force lockout for this email
    const attemptEntry = otpAttempts.get(emailLower)
    if (attemptEntry && attemptEntry.count >= MAX_OTP_ATTEMPTS && Date.now() < attemptEntry.lockedUntil) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      )
    }

    // Find a valid (unused, not expired) code for this email
    const verificationCode = await db.verificationCode.findFirst({
      where: {
        email: emailLower,
        code,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!verificationCode) {
      // Record failed attempt for brute-force protection
      const existing = otpAttempts.get(emailLower)
      if (existing) {
        existing.count++
        if (existing.count >= MAX_OTP_ATTEMPTS) {
          existing.lockedUntil = Date.now() + OTP_LOCKOUT_DURATION
        }
      } else {
        otpAttempts.set(emailLower, { count: 1, lockedUntil: 0 })
      }

      // Check if code exists but is expired
      const expiredCode = await db.verificationCode.findFirst({
        where: {
          email: emailLower,
          code,
          usedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      })

      if (expiredCode && expiredCode.expiresAt <= new Date()) {
        return NextResponse.json(
          { error: 'Verification code has expired. Please request a new one.' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Invalid verification code. Please try again.' },
        { status: 400 }
      )
    }

    // Mark the code as used
    await db.verificationCode.update({
      where: { id: verificationCode.id },
      data: { usedAt: new Date() },
    })

    // Clear brute-force attempts on successful verification
    otpAttempts.delete(emailLower)

    // Mark user as verified
    const user = await db.user.update({
      where: { email: emailLower },
      data: { emailVerified: true },
    })

    // Also confirm the email in Supabase Auth
    try {
      const { data: { users: supabaseUsers } } = await supabaseAdmin.auth.admin.listUsers()
      const supabaseUser = supabaseUsers?.find(u => u.email?.toLowerCase() === emailLower)
      if (supabaseUser && !supabaseUser.email_confirmed_at) {
        await supabaseAdmin.auth.admin.updateUserById(supabaseUser.id, {
          email_confirm: true,
        })
      }
    } catch (supabaseErr) {
      console.error('[OTP Check] Failed to confirm email in Supabase:', supabaseErr)
      // Don't fail the whole request - our DB is the source of truth
    }

    // Create a session for auto-login
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await db.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    // Clean up old expired sessions
    await db.session.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } },
    })

    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      countryCode: user.countryCode,
      avatarUrl: user.avatarUrl,
      language: user.language,
      theme: user.theme,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }

    const response = NextResponse.json({
      success: true,
      message: 'Email verified successfully!',
      user: userData,
      session: { token, expiresAt: expiresAt.toISOString() },
    })

    // Set auth cookie for auto-login
    response.cookies.set('usra-auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error('[OTP Check] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
