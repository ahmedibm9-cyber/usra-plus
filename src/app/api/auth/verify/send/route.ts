import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { db } from '@/lib/db'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import crypto from 'crypto'

// In-memory OTP send rate limiting per email
const otpSendAttempts = new Map<string, { count: number; resetTime: number }>()
const MAX_OTP_SENDS = 3
const OTP_SEND_WINDOW = 10 * 60 * 1000 // 10 minutes

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of otpSendAttempts.entries()) {
      if (now > entry.resetTime) {
        otpSendAttempts.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit OTP send attempts
    const rateLimitResponse = applyRateLimit(req, RATE_LIMITS.AUTH_VERIFY)
    if (rateLimitResponse) return rateLimitResponse

    const supabaseAdmin = getSupabaseAdmin()
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service not configured' }, { status: 503 })
    }

    const body = await req.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const emailLower = email.toLowerCase()

    // Per-email OTP send rate limit: max 3 per 10 minutes
    const sendEntry = otpSendAttempts.get(emailLower)
    const now = Date.now()
    if (sendEntry && now < sendEntry.resetTime && sendEntry.count >= MAX_OTP_SENDS) {
      return NextResponse.json(
        { error: 'Too many verification emails sent. Please try again later.', retryAfter: Math.ceil((sendEntry.resetTime - now) / 1000) },
        { status: 429 }
      )
    }

    // Check user exists in our DB
    const user = await db.user.findUnique({ where: { email: emailLower } })
    if (!user) {
      // Don't reveal whether email exists for security
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a verification code has been sent.',
      })
    }

    // If already verified, let them know
    if (user.emailVerified) {
      return NextResponse.json({
        success: true,
        message: 'Email is already verified. You can log in.',
        alreadyVerified: true,
      })
    }

    // Invalidate any existing unused codes for this email
    await db.verificationCode.updateMany({
      where: {
        email: emailLower,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    })

    // Generate 6-digit OTP using cryptographically secure random
    const code = crypto.randomInt(100000, 1000000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store the code in our DB
    await db.verificationCode.create({
      data: {
        email: emailLower,
        code,
        expiresAt,
      },
    })

    // Track per-email send count
    if (sendEntry && now < sendEntry.resetTime) {
      sendEntry.count++
    } else {
      otpSendAttempts.set(emailLower, { count: 1, resetTime: now + OTP_SEND_WINDOW })
    }

    const isDev = process.env.NODE_ENV !== 'production'

    // Try to send verification email via Supabase
    // Method 1: Use Supabase's built-in OTP which sends a real email
    let emailSent = false

    try {
      // Look up the Supabase user by email — list users and filter client-side
      const { data: { users: supabaseUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

      if (!listError && supabaseUsers) {
        const supabaseUser = supabaseUsers.find(u => u.email?.toLowerCase() === emailLower)

        if (supabaseUser && !supabaseUser.email_confirmed_at) {
          // Resend the Supabase confirmation email (sends a real email)
          const { error: resendError } = await supabaseAdmin.auth.resend({
            type: 'signup',
            email: emailLower,
          })

          if (resendError) {
            console.error('[OTP Send] Supabase resend error:', resendError.message)
          } else {
            emailSent = true
          }
        }
      }
    } catch (supabaseError) {
      console.error('[OTP Send] Supabase error:', supabaseError)
    }

    return NextResponse.json({
      success: true,
      message: emailSent
        ? 'A verification link has been sent to your email. You can also use the code below.'
        : 'Verification code generated.',
      // Always return devCode in development for testing
      ...(isDev ? { devCode: code } : {}),
      // In production, if Supabase email was sent, tell the user
      // If not, we still provide the OTP code system
      emailSent,
      expiresIn: 600, // seconds
    })
  } catch (error) {
    console.error('[OTP Send] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
