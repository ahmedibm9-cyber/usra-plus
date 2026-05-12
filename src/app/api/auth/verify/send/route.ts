import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
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

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store the code in our DB
    await db.verificationCode.create({
      data: {
        email: emailLower,
        code,
        expiresAt,
      },
    })

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
