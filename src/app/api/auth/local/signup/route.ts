import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { validateCSRF } from '@/lib/csrf'
import { sendOTP, sendWelcome, isEmailConfigured } from '@/lib/email'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    // CSRF protection
    const csrfError = validateCSRF(req)
    if (csrfError) return csrfError

    // Rate limit signup attempts
    const rateLimitResponse = await applyRateLimit(req, RATE_LIMITS.AUTH_SIGNUP)
    if (rateLimitResponse) return rateLimitResponse

    const body = await req.json()
    const { firstName, lastName, email, password, phone, countryCode } = body

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Input length limits — prevent bcrypt DoS
    if (email.length > 254 || password.length > 128) {
      return NextResponse.json(
        { error: 'Input too long' },
        { status: 400 }
      )
    }

    // Sanitize string inputs — strip HTML tags
    const sanitize = (str: string) => str.replace(/<[^>]*>/g, '').trim()
    const sanitizedFirstName = firstName ? sanitize(String(firstName)).slice(0, 100) : null
    const sanitizedLastName = lastName ? sanitize(String(lastName)).slice(0, 100) : null
    const sanitizedPhone = phone ? sanitize(String(phone)).slice(0, 20) : null

    const emailLower = email.toLowerCase()
    const passwordHash = await bcrypt.hash(password, 12)

    // Try Prisma first (local SQLite), fall back to Supabase REST API (Vercel)
    let user: {
      id: string
      email: string
      firstName: string | null
      lastName: string | null
      phone: string | null
      countryCode: string | null
      avatarUrl: string | null
      language: string
      theme: string
      emailVerified: boolean
      createdAt: string
      updatedAt: string
    }

    try {
      // Try Prisma (local dev with SQLite)
      const existing = await db.user.findUnique({ where: { email: emailLower } })
      if (existing) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        )
      }

      // Create user with emailVerified = false — OTP verification required
      const dbUser = await db.user.create({
        data: {
          email: emailLower,
          passwordHash,
          firstName: sanitizedFirstName,
          lastName: sanitizedLastName,
          phone: sanitizedPhone,
          countryCode: countryCode || '+966',
          emailVerified: false,
        },
      })

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
      const otpCode = crypto.randomInt(100000, 1000000).toString()
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

      // Store the verification code
      await db.verificationCode.create({
        data: {
          email: emailLower,
          code: otpCode,
          expiresAt: otpExpiresAt,
        },
      })

      user = {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        phone: dbUser.phone,
        countryCode: dbUser.countryCode,
        avatarUrl: dbUser.avatarUrl,
        language: dbUser.language,
        theme: dbUser.theme,
        emailVerified: false,
        createdAt: dbUser.createdAt.toISOString(),
        updatedAt: dbUser.updatedAt.toISOString(),
      }

      // ─── Send OTP and Welcome emails via Resend ────────────────────
      let otpEmailSent = false

      if (isEmailConfigured()) {
        const userName = sanitizedFirstName || undefined
        const lang = (dbUser.language as 'en' | 'ar') || 'en'

        // Send OTP email
        const otpResult = await sendOTP(emailLower, otpCode, userName, lang)
        if (otpResult.success) {
          otpEmailSent = true
        } else {
          console.warn('[Signup] OTP email failed:', otpResult.error)
        }

        // Send welcome email (fire-and-forget — don't block signup on this)
        sendWelcome(emailLower, userName || 'User', lang).catch(err => {
          console.warn('[Signup] Welcome email failed:', err instanceof Error ? err.message : err)
        })
      }

      // If email was sent, do NOT return devCode.
      // If email failed, return devCode as fallback.
      return NextResponse.json({
        user,
        needsVerification: true,
        message: otpEmailSent
          ? 'Account created. A verification code has been sent to your email.'
          : 'Account created. Please verify your email with the code sent.',
        ...(process.env.NODE_ENV !== 'production' && !otpEmailSent ? { devCode: otpCode } : {}),
        emailSent: otpEmailSent,
        expiresIn: 600,
      }, { status: 201 })

    } catch (prismaError) {
      // Prisma failed (likely on Vercel) — use Supabase REST API
      console.log('[Local Auth] Prisma unavailable, using Supabase REST API')
      const supabase = getSupabaseAdmin()
      if (!supabase) {
        throw new Error('No database available')
      }

      // Check existing user in Supabase profiles table
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', emailLower)
        .maybeSingle()

      if (existingProfile) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 409 }
        )
      }

      // Create user in Supabase using Auth Admin API (not auto-confirmed)
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: emailLower,
        password,
        email_confirm: false, // Don't auto-confirm — user needs to verify
        user_metadata: {
          first_name: sanitizedFirstName,
          last_name: sanitizedLastName,
          phone: sanitizedPhone,
          country_code: countryCode || '+966',
        },
      })

      if (authError) {
        console.error('[Local Auth] Supabase auth error:', authError)
        return NextResponse.json(
          { error: authError.message || 'Failed to create account' },
          { status: 400 }
        )
      }

      const authUser = authData.user

      // Create profile in profiles table
      await supabase.from('profiles').insert({
        id: authUser.id,
        email: emailLower,
        first_name: sanitizedFirstName,
        last_name: sanitizedLastName,
        phone: sanitizedPhone,
        country_code: countryCode || '+966',
        language: 'en',
        theme: 'dark',
      })

      // Store OTP in Supabase verification_codes table using cryptographically secure random
      const otpCode = crypto.randomInt(100000, 1000000).toString()
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      await supabase.from('verification_codes').insert({
        email: emailLower,
        code: otpCode,
        expires_at: otpExpiresAt,
      })

      user = {
        id: authUser.id,
        email: emailLower,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        countryCode: countryCode || '+966',
        avatarUrl: null,
        language: 'en',
        theme: 'dark',
        emailVerified: false,
        createdAt: authUser.created_at,
        updatedAt: authUser.updated_at || authUser.created_at,
      }

      // ─── Send OTP and Welcome emails via Resend ────────────────────
      let otpEmailSent = false

      if (isEmailConfigured()) {
        const userName = sanitizedFirstName || undefined

        // Send OTP email
        const otpResult = await sendOTP(emailLower, otpCode, userName, 'en')
        if (otpResult.success) {
          otpEmailSent = true
        } else {
          console.warn('[Signup] OTP email failed:', otpResult.error)
        }

        // Send welcome email (fire-and-forget)
        sendWelcome(emailLower, userName || 'User', 'en').catch(err => {
          console.warn('[Signup] Welcome email failed:', err instanceof Error ? err.message : err)
        })
      }

      // If email was sent, do NOT return devCode.
      // If email failed, return devCode as fallback.
      return NextResponse.json({
        user,
        needsVerification: true,
        message: otpEmailSent
          ? 'Account created. A verification code has been sent to your email.'
          : 'Account created. Please verify your email with the code sent.',
        ...(process.env.NODE_ENV !== 'production' && !otpEmailSent ? { devCode: otpCode } : {}),
        emailSent: otpEmailSent,
        expiresIn: 600,
      }, { status: 201 })
    }
  } catch (error) {
    console.error('[Local Auth] Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
