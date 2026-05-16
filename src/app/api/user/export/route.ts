/**
 * User Data Export Endpoint — GDPR/PDPL Compliance
 *
 * GET /api/user/export
 * Exports ALL user data from the Prisma database as a JSON download.
 * Rate limited to 1 request per hour to prevent abuse.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-utils'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  // ─── Rate Limit: 1 request per hour ──────────────────────────
  const rateLimitResponse = await applyRateLimit(request, {
    maxRequests: 1,
    windowMs: 60 * 60 * 1000,
    key: 'user:export',
  })
  if (rateLimitResponse) return rateLimitResponse

  // ─── Authentication ──────────────────────────────────────────
  const { userId, error } = await requireAuth(request)
  if (error) return error

  try {
    // ─── Fetch ALL user data ────────────────────────────────────
    const [user, sessions, subscriptions, familyMembers, couponRedemptions, referrals, consents] = await Promise.all([
      // User profile
      db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          countryCode: true,
          avatarUrl: true,
          language: true,
          theme: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      // Sessions (without tokens for security)
      db.session.findMany({
        where: { userId },
        select: {
          id: true,
          // token excluded for security
          expiresAt: true,
          createdAt: true,
        },
      }),

      // Subscriptions
      db.userSubscription.findMany({
        where: { userId },
        select: {
          id: true,
          plan: true,
          status: true,
          store: true,
          periodType: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          expirationDate: true,
          trialStart: true,
          trialEnd: true,
          autoRenew: true,
          price: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      // Family memberships
      db.familyMember.findMany({
        where: { userId },
        select: {
          id: true,
          familyId: true,
          role: true,
          nickname: true,
          joinedAt: true,
          family: {
            select: {
              id: true,
              name: true,
              description: true,
              inviteCode: true,
              createdAt: true,
            },
          },
        },
      }),

      // Coupon redemptions
      db.couponRedemption.findMany({
        where: { userId },
        select: {
          id: true,
          discountApplied: true,
          redeemedAt: true,
          coupon: {
            select: {
              code: true,
              name: true,
              discountType: true,
              discountValue: true,
            },
          },
        },
      }),

      // Referrals (both as referrer and referred)
      db.referral.findMany({
        where: {
          OR: [
            { referrerId: userId },
            { referredUserId: userId },
          ],
        },
        select: {
          id: true,
          referralCode: true,
          referredEmail: true,
          status: true,
          rewardType: true,
          rewardValue: true,
          rewardClaimed: true,
          rewardClaimedAt: true,
          expiresAt: true,
          createdAt: true,
        },
      }),

      // Consents
      db.consent.findMany({
        where: { userId },
        select: {
          id: true,
          type: true,
          granted: true,
          version: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
        },
      }),
    ])

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // ─── Build export object ────────────────────────────────────
    const exportData = {
      exportInfo: {
        exportedAt: new Date().toISOString(),
        format: 'USRA_PLUS_USER_DATA_EXPORT_v1',
        dataController: 'USRA PLUS',
        contact: 'privacy@usraplus.com',
      },
      profile: user,
      sessions: sessions.map((s) => ({
        ...s,
        note: 'Session tokens excluded for security',
      })),
      subscriptions,
      familyMemberships: familyMembers,
      couponRedemptions,
      referrals,
      consents,
    }

    // ─── Return as JSON download ────────────────────────────────
    const filename = `usra-plus-data-export-${new Date().toISOString().slice(0, 10)}.json`

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Export-Date': new Date().toISOString(),
      },
    })
  } catch (err) {
    logger.error('[User Export]', 'Error:', err)
    return NextResponse.json(
      { error: 'Failed to export user data' },
      { status: 500 }
    )
  }
}
