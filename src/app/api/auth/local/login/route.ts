import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { validateCSRF } from '@/lib/csrf'
import { logger } from '@/lib/logger'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    // CSRF protection
    const csrfError = validateCSRF(req)
    if (csrfError) return csrfError

    // Rate limit login attempts
    const rateLimitResponse = await applyRateLimit(req, RATE_LIMITS.AUTH_LOGIN)
    if (rateLimitResponse) return rateLimitResponse

    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Input length validation — prevent bcrypt DoS from very long passwords
    if (email.length > 254 || password.length > 128) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 400 }
      )
    }

    const emailLower = email.toLowerCase()

    // Try Prisma first (local dev with SQLite), fall back to Supabase REST API
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
      createdAt: string
      updatedAt: string
    }

    try {
      // Try Prisma (local dev with SQLite)
      const dbUser = await db.user.findUnique({ where: { email: emailLower } })
      if (!dbUser) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      // Verify password
      const valid = await bcrypt.compare(password, dbUser.passwordHash)
      if (!valid) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      // Check if email is verified before allowing login
      if (!dbUser.emailVerified) {
        return NextResponse.json(
          { error: 'Please verify your email before logging in. Check your inbox for a verification code.', needsVerification: true },
          { status: 403 }
        )
      }

      // Create session token
      const token = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      await db.session.create({
        data: { userId: dbUser.id, token, expiresAt },
      })

      // Clean up old expired sessions
      await db.session.deleteMany({
        where: { userId: dbUser.id, expiresAt: { lt: new Date() } },
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
        createdAt: dbUser.createdAt.toISOString(),
        updatedAt: dbUser.updatedAt.toISOString(),
      }

      const response = NextResponse.json({
        user,
        session: { token, expiresAt: expiresAt.toISOString() },
      })

      response.cookies.set('usra-auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
      })

      return response
    } catch (prismaError) {
      // Prisma failed (likely on Vercel) — use Supabase Auth API
      logger.warn('[Local Auth]', 'Prisma unavailable, using Supabase Auth API')
      const supabase = getSupabaseAdmin()
      if (!supabase) {
        throw new Error('No database available')
      }

      // Use Supabase Auth to sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailLower,
        password,
      })

      if (authError || !authData.user) {
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      const authUser = authData.user

      // Get profile from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      // Try to create a Prisma session with a long-lived UUID token.
      // If Prisma is available, this gives us a session that doesn't expire like JWTs.
      // If Prisma is unavailable, fall back to the Supabase JWT (which expires after ~1 hour).
      let token: string
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      let _usedPrismaSession = false

      try {
        // Sync user to Prisma first
        const placeholderHash = await bcrypt.hash(`supabase-sync-${authUser.id}-${Date.now()}`, 4)
        const existingPrismaUser = await db.user.findUnique({ where: { id: authUser.id } })
          .catch(() => db.user.findUnique({ where: { email: emailLower } }))
          .catch(() => null)

        if (existingPrismaUser) {
          await db.user.update({
            where: { id: existingPrismaUser.id },
            data: { emailVerified: true, updatedAt: new Date() },
          }).catch(() => {})
        } else {
          await db.user.create({
            data: {
              id: authUser.id,
              email: emailLower,
              passwordHash: placeholderHash,
              firstName: profile?.first_name || authUser.user_metadata?.first_name || null,
              lastName: profile?.last_name || authUser.user_metadata?.last_name || null,
              phone: profile?.phone || null,
              countryCode: profile?.country_code || '+966',
              avatarUrl: profile?.avatar_url || null,
              language: profile?.language || 'en',
              theme: profile?.theme || 'dark',
              emailVerified: true,
            },
          }).catch(() => {})
        }

        // Create Prisma session with UUID token
        token = crypto.randomUUID()
        await db.session.create({
          data: { userId: authUser.id, token, expiresAt },
        })
        await db.session.deleteMany({
          where: { userId: authUser.id, expiresAt: { lt: new Date() } },
        }).catch(() => {})
        _usedPrismaSession = true
      } catch {
        // Prisma unavailable — use Supabase JWT
        token = authData.session?.access_token || crypto.randomUUID()
      }

      user = {
        id: authUser.id,
        email: emailLower,
        firstName: profile?.first_name || authUser.user_metadata?.first_name || null,
        lastName: profile?.last_name || authUser.user_metadata?.last_name || null,
        phone: profile?.phone || null,
        countryCode: profile?.country_code || '+966',
        avatarUrl: profile?.avatar_url || null,
        language: profile?.language || 'en',
        theme: profile?.theme || 'dark',
        createdAt: authUser.created_at,
        updatedAt: authUser.updated_at || authUser.created_at,
      }

      const response = NextResponse.json({
        user,
        session: { token, expiresAt: expiresAt.toISOString() },
      })

      response.cookies.set('usra-auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
      })

      return response
    }
  } catch (error) {
    logger.error('[Local Auth]', 'Login error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
