import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { hash } from 'bcryptjs'

// User Detail & Edit API (Prisma/SQLite)
// GET: Get user details
// PUT: Update user profile, change password, etc.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {

  try {
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId } = await params

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        sessions: {
          select: { id: true, createdAt: true, expiresAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get subscription info
    const subscription = await db.userSubscription.findFirst({
      where: { userId, status: 'active' },
    })

    // Get ban history
    const bans = await db.userBan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({
      source: 'live',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        language: user.language,
        theme: user.theme,
        countryCode: user.countryCode,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        lastLogin: user.sessions.length > 0 ? user.sessions[0].createdAt.toISOString() : null,
        sessionCount: user.sessions.length,
        recentSessions: user.sessions.map(s => ({
          id: s.id,
          createdAt: s.createdAt.toISOString(),
          expiresAt: s.expiresAt.toISOString(),
        })),
      },
      subscription: subscription ? {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        createdAt: subscription.createdAt.toISOString(),
      } : null,
      bans: bans.map(b => ({
        id: b.id,
        banType: b.banType,
        status: b.status,
        reason: b.reason,
        createdAt: b.createdAt.toISOString(),
        expiresAt: b.expiresAt?.toISOString() || null,
      })),
    })
  } catch (error) {
    console.error('[Admin User Detail API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch user details' }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.users.userId] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {

  try {
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId } = await params

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, ...payload } = body as Record<string, unknown> & { action?: string }

  try {
    // Verify user exists
    const existingUser = await db.user.findUnique({ where: { id: userId } })
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If no action, treat as profile update
    if (!action || action === 'update_profile') {
      const updateData: Record<string, unknown> = {}
      const allowedFields = ['firstName', 'lastName', 'phone', 'language', 'theme', 'countryCode', 'avatarUrl', 'emailVerified']

      for (const field of allowedFields) {
        if (payload[field] !== undefined) {
          updateData[field] = payload[field]
        }
      }

      if (payload.email !== undefined && typeof payload.email === 'string') {
        // Check for duplicate email
        const duplicate = await db.user.findFirst({
          where: { email: payload.email, NOT: { id: userId } },
        })
        if (duplicate) {
          return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
        }
        updateData.email = payload.email
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
      }

      const updated = await db.user.update({
        where: { id: userId },
        data: updateData,
      })

      return NextResponse.json({
        source: 'live',
        success: true,
        user: {
          id: updated.id,
          email: updated.email,
          firstName: updated.firstName,
          lastName: updated.lastName,
          phone: updated.phone,
          language: updated.language,
          theme: updated.theme,
          countryCode: updated.countryCode,
          emailVerified: updated.emailVerified,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      })
    }

    // Reset password
    if (action === 'reset_password') {
      const { newPassword } = payload as { newPassword?: string }
      if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
      }

      const hashedPassword = await hash(newPassword, 12)
      await db.user.update({
        where: { id: userId },
        data: { passwordHash: hashedPassword },
      })

      // Invalidate all existing sessions
      await db.session.deleteMany({ where: { userId } })

      return NextResponse.json({
        source: 'live',
        success: true,
        message: 'Password reset successfully. All sessions have been terminated.',
      })
    }

    // Ban/suspend user
    if (action === 'ban') {
      const { banType, reason, durationHours } = payload as {
        banType?: string
        reason?: string
        durationHours?: number
      }

      if (!reason) {
        return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
      }

      const validBanTypes = ['warning', 'temporary_suspension', 'shadow_ban', 'permanent_ban']
      if (!banType || !validBanTypes.includes(banType)) {
        return NextResponse.json({ error: `banType must be one of: ${validBanTypes.join(', ')}` }, { status: 400 })
      }

      const expiresAt = banType === 'temporary_suspension' && durationHours
        ? new Date(Date.now() + durationHours * 60 * 60 * 1000)
        : null

      const ban = await db.userBan.create({
        data: {
          userId,
          banType,
          status: 'active',
          reason,
          issuedBy: auth.admin?.email || 'unknown',
          expiresAt,
        },
      })

      // If temporary or permanent ban, invalidate sessions
      if (banType === 'temporary_suspension' || banType === 'permanent_ban') {
        await db.session.deleteMany({ where: { userId } })
      }

      return NextResponse.json({
        source: 'live',
        success: true,
        ban: {
          id: ban.id,
          banType: ban.banType,
          status: ban.status,
          reason: ban.reason,
          createdAt: ban.createdAt.toISOString(),
          expiresAt: ban.expiresAt?.toISOString() || null,
        },
      })
    }

    // Revoke ban
    if (action === 'revoke_ban') {
      const { banId } = payload as { banId?: string }
      if (!banId) {
        return NextResponse.json({ error: 'banId is required' }, { status: 400 })
      }

      const ban = await db.userBan.findUnique({ where: { id: banId } })
      if (!ban || ban.userId !== userId) {
        return NextResponse.json({ error: 'Ban not found for this user' }, { status: 404 })
      }

      const updated = await db.userBan.update({
        where: { id: banId },
        data: {
          status: 'revoked',
          revokedBy: auth.admin?.email || 'unknown',
          revokeReason: 'Revoked by admin',
        },
      })

      return NextResponse.json({
        source: 'live',
        success: true,
        ban: {
          id: updated.id,
          status: updated.status,
        },
      })
    }

    // Delete user
    if (action === 'delete_user') {
      if (auth.admin?.role !== 'super_admin') {
        return NextResponse.json({ error: 'Only super_admin can delete users' }, { status: 403 })
      }

      // Delete related records first
      await db.session.deleteMany({ where: { userId } })
      await db.userBan.deleteMany({ where: { userId } })
      await db.userSubscription.deleteMany({ where: { userId } })
      await db.user.delete({ where: { id: userId } })

      return NextResponse.json({
        source: 'live',
        success: true,
        message: 'User and all related data deleted',
      })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    console.error('[Admin User Edit API] Error:', error)
    return NextResponse.json({ error: 'Failed to process user action' }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.users.userId] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}
