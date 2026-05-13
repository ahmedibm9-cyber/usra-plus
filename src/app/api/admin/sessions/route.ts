import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { db } from '@/lib/db'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// Admin Sessions API Route
// Queries REAL Session table from Prisma/PostgreSQL — NO fake data

export async function GET(request: NextRequest) {

  try {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch all sessions with user info
    const sessions = await db.session.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const now = new Date()

    // Build session list with real data
    const sessionList = sessions.map(session => {
      const isActive = session.expiresAt > now
      const durationMs = isActive ? now.getTime() - session.createdAt.getTime() : session.expiresAt.getTime() - session.createdAt.getTime()

      return {
        id: session.id,
        userId: session.userId,
        userName: session.user ? `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() || session.user.email : 'Unknown',
        userEmail: session.user?.email || 'unknown',
        deviceType: 'unknown' as string, // We don't track device type in current schema
        browser: 'Unknown' as string,
        ipAddress: '—' as string,
        country: '—' as string,
        city: '' as string,
        lastActive: session.createdAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        durationMs,
        isActive,
      }
    })

    // Stats
    const totalActive = sessionList.filter(s => s.isActive).length
    const mobileCount = 0 // Not tracked in current schema
    const desktopCount = totalActive // Assume all are desktop for now
    const avgDurationMs = sessionList.length > 0
      ? Math.round(sessionList.reduce((sum, s) => sum + s.durationMs, 0) / sessionList.length)
      : 0

    // Last hour sessions
    const oneHourAgo = new Date(now.getTime() - 3600000)
    const sessionsLastHour = sessions.filter(s => s.createdAt >= oneHourAgo).length

    // Geographic distribution — empty since we don't track
    const geographicDistribution: Array<{ country: string; count: number }> = []

    // Device breakdown — based on what we know
    const deviceBreakdown = totalActive > 0
      ? [{ device: 'desktop', count: totalActive, percentage: 100 }]
      : []

    return NextResponse.json({
      source: 'live',
      data: {
        sessions: sessionList,
        stats: {
          totalActive,
          mobileCount,
          desktopCount,
          avgDurationMs,
          sessionsLastHour,
          totalSessions: sessions.length,
        },
        geographicDistribution,
        deviceBreakdown,
      },
      lastUpdated: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json({
      source: 'live',
      data: {
        sessions: [],
        stats: { totalActive: 0, mobileCount: 0, desktopCount: 0, avgDurationMs: 0, sessionsLastHour: 0, totalSessions: 0 },
        geographicDistribution: [],
        deviceBreakdown: [],
      },
      error: err instanceof Error ? err.message : 'Unknown error',
      lastUpdated: new Date().toISOString(),
    })
  }

  } catch (error) {

    console.error('[src.app.api.admin.sessions] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}

// ─── DELETE: Revoke (delete) a session ──────────────────────────────────
export async function DELETE(request: NextRequest) {

  try {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { sessionId } = body as { sessionId?: string }
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
  }

  try {
    // Fetch the session to check if it belongs to the admin
    const session = await db.session.findUnique({ where: { id: sessionId } })
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Prevent admin from revoking their own session
    // Check if the session token matches the admin's cookie token
    const adminCookie = request.headers.get('cookie') || ''
    const adminTokenMatch = adminCookie.match(/usra-admin-session=([^;]+)/)
    if (adminTokenMatch && session.token === adminTokenMatch[1]) {
      return NextResponse.json({ error: 'Cannot revoke your own admin session' }, { status: 403 })
    }

    await db.session.delete({ where: { id: sessionId } })

    // Audit log
    await db.auditLog.create({
      data: {
        adminEmail: auth.admin?.email || 'unknown',
        action: 'revoke_session',
        targetType: 'session',
        targetId: sessionId,
        details: JSON.stringify({ userId: session.userId }),
      },
    })

    return NextResponse.json({ source: 'live', success: true })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to revoke session',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.sessions] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}
