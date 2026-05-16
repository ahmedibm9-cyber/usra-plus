import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { getAuthenticatedUserId } from '@/lib/auth-utils'

/**
 * POST /api/coupons/redeem
 *
 * User-facing coupon redemption endpoint.
 *
 * Body: { code: string, userId?: string }
 *
 * Validates coupon: exists, active, not expired, not max redemptions, not already used by this user.
 * On success, creates CouponRedemption record and returns discount details.
 * Rate limited: 3 attempts per hour per user.
 * Auth required: userId is verified from session, body userId ignored for security.
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check — verify the requesting user is authenticated
    const authenticatedUserId = await getAuthenticatedUserId(request)
    if (!authenticatedUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Rate limit: 3 attempts per hour per user
    const rateLimitResult = checkRateLimit(request, {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000,
      key: 'coupon:redeem',
    })
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many coupon attempts. Please try again later.', retryAfter: Math.ceil(rateLimitResult.retryAfterMs / 1000) },
        {
          status: 429,
          headers: { 'Retry-After': Math.ceil(rateLimitResult.retryAfterMs / 1000).toString() },
        }
      )
    }

    // Parse body
    let body: { code?: string; userId?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const { code } = body
    // Use authenticated user ID, ignore body userId for security
    const userId = authenticatedUserId

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 })
    }

    // Look up coupon by code (case-insensitive)
    const coupon = await db.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
      },
    })

    if (!coupon) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 404 })
    }

    // Validate: active
    if (!coupon.isActive) {
      return NextResponse.json({ error: 'This coupon is no longer active' }, { status: 400 })
    }

    // Validate: not expired (check validFrom and validUntil)
    const now = new Date()
    if (coupon.validFrom && new Date(coupon.validFrom) > now) {
      return NextResponse.json({ error: 'This coupon is not yet valid' }, { status: 400 })
    }
    if (coupon.validUntil && new Date(coupon.validUntil) < now) {
      return NextResponse.json({ error: 'This coupon has expired' }, { status: 400 })
    }

    // Validate: max redemptions
    if (coupon.maxRedemptions !== null && coupon.currentRedemptions >= coupon.maxRedemptions) {
      return NextResponse.json({ error: 'This coupon has reached its maximum redemptions' }, { status: 400 })
    }

    // Validate: not already used by this user
    const existingRedemption = await db.couponRedemption.findFirst({
      where: {
        couponId: coupon.id,
        userId,
      },
    })

    if (existingRedemption) {
      // Check per-user limit
      if (coupon.maxRedemptionsPerUser <= 1) {
        return NextResponse.json({ error: 'You have already used this coupon' }, { status: 400 })
      }

      // Count how many times this user has redeemed this coupon
      const userRedemptionCount = await db.couponRedemption.count({
        where: { couponId: coupon.id, userId },
      })

      if (userRedemptionCount >= coupon.maxRedemptionsPerUser) {
        return NextResponse.json({ error: 'You have reached the maximum uses for this coupon' }, { status: 400 })
      }
    }

    // All validations passed — create redemption + increment counter atomically
    const [redemption] = await db.$transaction([
      db.couponRedemption.create({
        data: {
          couponId: coupon.id,
          userId,
          discountApplied: coupon.discountValue,
        },
      }),
      db.coupon.update({
        where: { id: coupon.id },
        data: { currentRedemptions: { increment: 1 } },
      }),
    ])

    // Return success with discount details
    return NextResponse.json({
      success: true,
      coupon: {
        id: coupon.id,
        name: coupon.name,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        applicablePlans: JSON.parse(coupon.applicablePlans),
      },
      redemption: {
        id: redemption.id,
        redeemedAt: redemption.redeemedAt,
        discountApplied: redemption.discountApplied,
      },
    })
  } catch (error) {
    console.error('[CouponRedeemAPI] Error:', error)
    return NextResponse.json({ error: 'Failed to redeem coupon' }, { status: 500 })
  }
}
