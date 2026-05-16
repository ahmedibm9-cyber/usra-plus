import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { db } from '@/lib/db'

/**
 * GET /api/admin/subscription-otp
 *
 * List all subscription OTPs with optional filters.
 * Query params: userId, status, planSlug
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin auth
    const authResult = verifyAdminAuth(request)
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.reason || 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || undefined
    const status = searchParams.get('status') || undefined
    const planSlug = searchParams.get('planSlug') || undefined

    // Build where clause
    const where: Record<string, unknown> = {}
    if (userId) where.userId = userId
    if (status) where.status = status
    if (planSlug) where.planSlug = planSlug

    const otps = await db.subscriptionOtp.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Also mark expired OTPs (where expiresAt < now and status is still pending)
    const now = new Date()
    const expiredIds = otps
      .filter(otp => otp.status === 'pending' && otp.expiresAt < now)
      .map(otp => otp.id)

    if (expiredIds.length > 0) {
      await db.subscriptionOtp.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: 'expired' },
      })
      // Update local data too
      for (const otp of otps) {
        if (expiredIds.includes(otp.id)) {
          otp.status = 'expired'
        }
      }
    }

    return NextResponse.json({
      data: otps,
      total: otps.length,
    })
  } catch (error) {
    console.error('[SubscriptionOTP List] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription OTPs' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/subscription-otp
 *
 * Revoke an OTP by id (set status to 'revoked').
 * Body: { otpId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin auth
    const authResult = verifyAdminAuth(request)
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.reason || 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only super_admin can revoke OTPs
    if (authResult.admin?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super-admin can revoke subscription OTPs' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { otpId } = body

    if (!otpId) {
      return NextResponse.json(
        { error: 'Missing required field: otpId' },
        { status: 400 }
      )
    }

    // Find the OTP
    const otp = await db.subscriptionOtp.findUnique({
      where: { id: otpId },
    })

    if (!otp) {
      return NextResponse.json(
        { error: 'OTP not found' },
        { status: 404 }
      )
    }

    if (otp.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot revoke OTP with status '${otp.status}'. Only pending OTPs can be revoked.` },
        { status: 400 }
      )
    }

    // Revoke the OTP
    await db.subscriptionOtp.update({
      where: { id: otpId },
      data: { status: 'revoked' },
    })

    // Log action in AdminOtpAction table
    await db.adminOtpAction.create({
      data: {
        adminId: authResult.admin.email,
        action: 'revoked',
        otpId,
        targetUserId: otp.userId,
        details: JSON.stringify({
          planSlug: otp.planSlug,
          originalCode: otp.code,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'OTP revoked successfully',
    })
  } catch (error) {
    console.error('[SubscriptionOTP Revoke] Error:', error)
    return NextResponse.json(
      { error: 'Failed to revoke subscription OTP' },
      { status: 500 }
    )
  }
}
