import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { validateCSRF } from '@/lib/csrf'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    // CSRF protection
    const csrfError = validateCSRF(req)
    if (csrfError) return csrfError

    // Rate limit signup attempts
    const rateLimitResponse = applyRateLimit(req, RATE_LIMITS.AUTH_SIGNUP)
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

      // Always return devCode — the Prisma/SQLite path has no email provider,
      // so the user has no other way to receive the verification code.
      return NextResponse.json({
        user,
        needsVerification: true,
        message: 'Account created. Please verify your email with the code sent.',
        devCode: otpCode,
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

      // Always return devCode — the Supabase admin.createUser() path does not
      // send a confirmation email (email_confirm: false), so the user has no
      // other way to receive the verification code.
      return NextResponse.json({
        user,
        needsVerification: true,
        message: 'Account created. Please verify your email with the code sent.',
        devCode: otpCode,
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
