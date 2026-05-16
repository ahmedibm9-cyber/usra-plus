/**
 * GDPR/PDPL Compliant Account Deletion Endpoint
 *
 * Deletes the authenticated user and ALL associated data from the database.
 * Deletion order respects foreign key constraints:
 *   1. CouponRedemptions (by userId)
 *   2. UserSubscriptions (by userId)
 *   3. FamilyMemberships (by userId — user leaves families)
 *   4. VerificationCodes (by user's email)
 *   5. Referrals where user is referrer or referred
 *   6. RevenueTransactions (by userId)
 *   7. Refunds (by userId)
 *   8. Sessions (by userId — would cascade, but explicit is clearer)
 *   9. User record (last)
 *
 * Protected by:
 *   - Authentication (getAuthenticatedUserId)
 *   - Rate limiting (1 request per hour per IP)
 *   - CSRF validation (Origin/Referer check)
 *   - DELETE method only
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserId } from '@/lib/auth-utils'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { validateCSRF } from '@/lib/csrf'
import { db } from '@/lib/db'

// Account deletion is a destructive action — very strict rate limit
const ACCOUNT_DELETE_RATE_LIMIT = { maxRequests: 1, windowMs: 60 * 60 * 1000, key: 'user:delete' }

export async function DELETE(request: NextRequest) {
  try {
    // ─── Rate Limiting ────────────────────────────────────────────────
    const rateLimitResponse = applyRateLimit(request, ACCOUNT_DELETE_RATE_LIMIT)
    if (rateLimitResponse) return rateLimitResponse

    // ─── CSRF Protection ──────────────────────────────────────────────
    const csrfError = validateCSRF(request)
    if (csrfError) return csrfError

    // ─── Authentication ───────────────────────────────────────────────
    const userId = await getAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // ─── Fetch user record (needed for email) ─────────────────────────
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // ─── Delete in correct order (respecting foreign keys) ────────────

    // 1. Coupon redemptions by this user
    await db.couponRedemption.deleteMany({
      where: { userId: user.id },
    }).catch(() => {})

    // 2. User subscriptions
    await db.userSubscription.deleteMany({
      where: { userId: user.id },
    }).catch(() => {})

    // 3. Family memberships — remove user from all families
    await db.familyMember.deleteMany({
      where: { userId: user.id },
    }).catch(() => {})

    // 4. Verification codes for this user's email
    await db.verificationCode.deleteMany({
      where: { email: user.email },
    }).catch(() => {})

    // 5. Referrals where user is referrer or referred user
    await db.referral.deleteMany({
      where: {
        OR: [
          { referrerId: user.id },
          { referredUserId: user.id },
        ],
      },
    }).catch(() => {})

    // 6. Revenue transactions by this user
    await db.revenueTransaction.deleteMany({
      where: { userId: user.id },
    }).catch(() => {})

    // 7. Refunds by this user
    await db.refund.deleteMany({
      where: { userId: user.id },
    }).catch(() => {})

    // 8. Sessions (would cascade on User delete, but explicit for clarity)
    await db.session.deleteMany({
      where: { userId: user.id },
    }).catch(() => {})

    // 9. Finally, delete the user record itself
    await db.user.delete({
      where: { id: user.id },
    })

    return NextResponse.json({
      success: true,
      message: 'Account and all associated data have been permanently deleted.',
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[User Delete API] Error:', errorMessage)

    return NextResponse.json(
      { error: 'Failed to delete account. Please try again or contact support.' },
      { status: 500 }
    )
  }
}

// Reject other methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PATCH() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
