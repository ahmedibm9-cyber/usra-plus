import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { db } from '@/lib/db'

/**
 * POST /api/admin/subscription-otp/generate
 *
 * Generate a new subscription OTP code for a user.
 * Only super-admin can perform this action.
 *
 * Body: { userId: string, planSlug: string, startDate: string, endDate: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin auth
    const authResult = verifyAdminAuth(request)
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.reason || 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only super_admin can generate OTPs
    if (authResult.admin?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super-admin can generate subscription OTPs' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, planSlug, startDate, endDate } = body

    // Validate required fields
    if (!userId || !planSlug || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, planSlug, startDate, endDate' },
        { status: 400 }
      )
    }

    // Validate planSlug — only paid plans can be granted via OTP
    const validPlans = ['pro', 'family_plus', 'max', 'ultimate']
    if (!validPlans.includes(planSlug)) {
      return NextResponse.json(
        { error: `Invalid planSlug. Must be one of: ${validPlans.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate user exists
    const user = await db.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format for startDate or endDate' },
        { status: 400 }
      )
    }
    if (end <= start) {
      return NextResponse.json(
        { error: 'endDate must be after startDate' },
        { status: 400 }
      )
    }

    // Generate a 6-digit OTP code using crypto.randomInt
    const otpCode = String(randomInt(100000, 999999))

    // Set OTP code expiry to 7 days from now
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Store in SubscriptionOtp table
    const otp = await db.subscriptionOtp.create({
      data: {
        code: otpCode,
        userId,
        planSlug,
        startDate: start,
        endDate: end,
        generatedBy: authResult.admin.email,
        expiresAt,
      },
    })

    // Log action in AdminOtpAction table
    await db.adminOtpAction.create({
      data: {
        adminId: authResult.admin.email,
        action: 'generated',
        otpId: otp.id,
        targetUserId: userId,
        details: JSON.stringify({
          planSlug,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          otpCode,
        }),
      },
    })

    return NextResponse.json({
      otpCode,
      otpId: otp.id,
      expiresAt: expiresAt.toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error('[SubscriptionOTP Generate] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate subscription OTP' },
      { status: 500 }
    )
  }
}
