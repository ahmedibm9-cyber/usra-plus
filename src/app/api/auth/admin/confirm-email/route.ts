import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { db } from '@/lib/db'
import crypto from 'crypto'

// Admin endpoint to confirm a user's email (used for demo accounts)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, secret } = body

    // Timing-safe auth check - use the admin session secret
    const expectedSecret = process.env.ADMIN_SESSION_SECRET
    if (!expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const secretBuf = Buffer.from(String(secret || ''))
    const expectedBuf = Buffer.from(expectedSecret)
    if (secretBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(secretBuf, expectedBuf)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Validate email length
    if (email.length > 254) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const emailLower = email.toLowerCase()
    let confirmed = false

    // Try to confirm in Supabase Auth
    const supabase = getSupabaseAdmin()
    if (supabase) {
      try {
        const { data: { users } } = await supabase.auth.admin.listUsers()
        const supabaseUser = users?.find(u => u.email?.toLowerCase() === emailLower)
        if (supabaseUser && !supabaseUser.email_confirmed_at) {
          await supabase.auth.admin.updateUserById(supabaseUser.id, {
            email_confirm: true,
          })
          confirmed = true
        } else if (supabaseUser?.email_confirmed_at) {
          confirmed = true // Already confirmed
        }
      } catch (err) {
        console.error('[Confirm Email] Supabase error:', err)
      }
    }

    // Also update Prisma if available
    try {
      await db.user.update({
        where: { email: emailLower },
        data: { emailVerified: true },
      })
    } catch {
      // Prisma may not be available on Vercel
    }

    return NextResponse.json({
      success: true,
      email: emailLower,
      confirmed,
    })
  } catch (error) {
    console.error('[Confirm Email] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
