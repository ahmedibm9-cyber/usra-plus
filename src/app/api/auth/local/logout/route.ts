import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('usra-auth-token')?.value

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
