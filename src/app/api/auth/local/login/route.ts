import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
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
      console.log('[Local Auth] Prisma unavailable, using Supabase Auth API')
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

      const token = authData.session?.access_token || crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

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
    console.error('[Local Auth] Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
