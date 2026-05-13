import { NextRequest, NextResponse } from 'next/server'

// ─── POST /api/admin/logout ───────────────────────────────────────────────────
// Clears the HttpOnly admin session cookie set by the login endpoint.

export async function POST(_request: NextRequest) {
  try {
    const response = NextResponse.json({ success: true })

    response.cookies.set('usra-admin-session', '', {
      path: '/',
      maxAge: 0,
      sameSite: 'strict',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    })

    return response
  } catch (error) {
    console.error('[Admin Logout] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
