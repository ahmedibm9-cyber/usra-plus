import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('usra-auth-token')?.value

    // Also invalidate Supabase session if Supabase is configured.
    // This ensures JWT sessions from Supabase Auth are properly terminated.
    // Must run BEFORE deleting the session from DB so we can look up the user.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (token && supabaseUrl && supabaseServiceKey) {
      try {
        const session = await db.session.findFirst({ where: { token } }).catch(() => null)
        if (session?.userId) {
          const user = await db.user.findUnique({ where: { id: session.userId } }).catch(() => null)
          // If the user ID looks like a Supabase UUID (not a local- prefix), invalidate their Supabase session
          if (user && !user.id.startsWith('local-') && !user.id.startsWith('demo-')) {
            // Call Supabase Admin API to sign out the user from all sessions
            await fetch(`${supabaseUrl}/auth/v1/logout`, {
              method: 'POST',
              headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
              },
            }).catch(() => {
              // Non-critical: Supabase session invalidation is best-effort
            })
          }
        }
      } catch {
        // Non-critical: Supabase session invalidation is best-effort
      }
    }

    if (token) {
      // Delete the session from database
      await db.session.deleteMany({ where: { token } }).catch(() => {})
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set('usra-auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error('[Local Auth] Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
