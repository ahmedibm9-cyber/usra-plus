import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserId } from '@/lib/auth-utils'
import { db } from '@/lib/db'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * POST /api/subscription/activate
 *
 * Activate a subscription using an OTP code.
 * Validates: OTP exists, is 'pending', not expired, belongs to this user.
 * On success: Creates/updates UserSubscription with the planSlug, startDate, endDate from the OTP.
 *
 * Body: { otpCode: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const rateLimitResult = checkRateLimit(request, RATE_LIMITS.API_WRITE)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: Math.ceil(rateLimitResult.retryAfterMs / 1000) },
        {
          status: 429,
          headers: { 'Retry-After': Math.ceil(rateLimitResult.retryAfterMs / 1000).toString() },
        }
      )
    }

    // Verify authentication
    const userId = await getAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { otpCode } = body

    if (!otpCode) {
      return NextResponse.json(
        { error: 'Missing required field: otpCode' },
        { status: 400 }
      )
    }

    // Find the OTP
    const otp = await db.subscriptionOtp.findUnique({
      where: { code: String(otpCode) },
    })

    if (!otp) {
      return NextResponse.json(
        { error: 'Invalid OTP code. Please check and try again.' },
        { status: 400 }
      )
    }

    // Validate OTP status
    if (otp.status === 'used') {
      return NextResponse.json(
        { error: 'This OTP code has already been used.' },
        { status: 400 }
      )
    }

    if (otp.status === 'revoked') {
      return NextResponse.json(
        { error: 'This OTP code has been revoked by an administrator.' },
        { status: 400 }
      )
    }

    if (otp.status === 'expired') {
      return NextResponse.json(
        { error: 'This OTP code has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Check if OTP is expired by time (even if status hasn't been updated yet)
    if (otp.expiresAt < new Date()) {
      // Auto-update to expired
      await db.subscriptionOtp.update({
        where: { id: otp.id },
        data: { status: 'expired' },
      })
      return NextResponse.json(
        { error: 'This OTP code has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Validate OTP belongs to this user
    if (otp.userId !== userId) {
      return NextResponse.json(
        { error: 'This OTP code was not assigned to your account.' },
        { status: 403 }
      )
    }

    // Mark OTP as used
    await db.subscriptionOtp.update({
      where: { id: otp.id },
      data: {
        status: 'used',
        usedAt: new Date(),
      },
    })

    // Create or update UserSubscription
    const existingSubscription = await db.userSubscription.findFirst({
      where: { userId },
    })

    const subscriptionData = {
      plan: otp.planSlug,
      status: 'active',
      currentPeriodStart: otp.startDate,
      currentPeriodEnd: otp.endDate,
      expirationDate: otp.endDate,
      autoRenew: false,
      lastRevenuecatEvent: 'OTP_ACTIVATION',
      lastEventAt: new Date(),
    }

    let subscription
    if (existingSubscription) {
      subscription = await db.userSubscription.update({
        where: { id: existingSubscription.id },
        data: subscriptionData,
      })
    } else {
      subscription = await db.userSubscription.create({
        data: {
          userId,
          ...subscriptionData,
        },
      })
    }

    return NextResponse.json({
      success: true,
      subscription: {
        plan: otp.planSlug,
        startDate: otp.startDate.toISOString(),
        endDate: otp.endDate.toISOString(),
      },
    })
  } catch (error) {
    console.error('[Subscription Activate] Error:', error)
    return NextResponse.json(
      { error: 'Failed to activate subscription' },
      { status: 500 }
    )
  }
}
