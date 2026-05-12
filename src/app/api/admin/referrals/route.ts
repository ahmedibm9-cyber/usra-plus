import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const VALID_STATUSES = ['pending', 'signed_up', 'trial_started', 'converted', 'rewarded', 'expired']
const VALID_REWARD_TYPES = ['trial_extension', 'discount', 'plan_upgrade', 'credit']

// ─── GET: List all referrals with metrics ────────────────────────────────
export async function GET(request: NextRequest) {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))

  try {
    const where: Record<string, unknown> = {}
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status
    }

    const [referrals, total] = await Promise.all([
      db.referral.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.referral.count({ where }),
    ])

    // Calculate metrics from all referrals
    const allReferrals = await db.referral.findMany()
    const totalReferrals = allReferrals.length
    const activeReferrals = allReferrals.filter(r => r.status === 'pending' || r.status === 'signed_up').length
    const convertedReferrals = allReferrals.filter(r => r.status === 'converted' || r.status === 'rewarded').length
    const totalRewardsGranted = allReferrals.filter(r => r.rewardClaimed).length
    const conversionRate = totalReferrals > 0 ? Math.round((convertedReferrals / totalReferrals) * 100) : 0

    const metrics = {
      totalReferrals,
      activeReferrals,
      convertedReferrals,
      conversionRate,
      totalRewardsGranted,
    }

    const serializedReferrals = referrals.map(r => ({
      id: r.id,
      referrerId: r.referrerId,
      referralCode: r.referralCode,
      referredEmail: r.referredEmail,
      referredUserId: r.referredUserId,
      status: r.status,
      rewardType: r.rewardType,
      rewardValue: Number(r.rewardValue),
      rewardClaimed: r.rewardClaimed,
      rewardClaimedAt: r.rewardClaimedAt?.toISOString() ?? null,
      expiresAt: r.expiresAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))

    return NextResponse.json({
      source: 'live',
      data: serializedReferrals,
      metrics,
      total,
      page,
      pageSize,
      hasMore: (page - 1) * pageSize + pageSize < total,
    })
  } catch (err) {
    return NextResponse.json({
      source: 'demo',
      data: [],
      metrics: {
        totalReferrals: 0,
        activeReferrals: 0,
        convertedReferrals: 0,
        conversionRate: 0,
        totalRewardsGranted: 0,
      },
      total: 0,
      page,
      pageSize,
      hasMore: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    })
  }
}

// ─── POST: Create a new referral code ────────────────────────────────────
export async function POST(request: NextRequest) {
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

  const { referrerId, referralCode, referredEmail, rewardType, rewardValue, expiresAt } = body as {
    referrerId?: string
    referralCode?: string
    referredEmail?: string
    rewardType?: string
    rewardValue?: number
    expiresAt?: string
  }

  if (!referralCode) {
    return NextResponse.json({ error: 'referralCode is required' }, { status: 400 })
  }

  if (rewardType && !VALID_REWARD_TYPES.includes(rewardType)) {
    return NextResponse.json({ error: `Invalid rewardType. Must be one of: ${VALID_REWARD_TYPES.join(', ')}` }, { status: 400 })
  }

  try {
    // Check for duplicate code
    const existing = await db.referral.findFirst({ where: { referralCode } })
    if (existing) {
      return NextResponse.json({ error: 'Referral code already exists' }, { status: 409 })
    }

    const referral = await db.referral.create({
      data: {
        referrerId: referrerId || 'admin',
        referralCode,
        referredEmail: referredEmail || null,
        rewardType: rewardType || 'trial_extension',
        rewardValue: rewardValue ?? 7,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })

    return NextResponse.json({
      source: 'live',
      success: true,
      referral: {
        id: referral.id,
        referrerId: referral.referrerId,
        referralCode: referral.referralCode,
        referredEmail: referral.referredEmail,
        referredUserId: referral.referredUserId,
        status: referral.status,
        rewardType: referral.rewardType,
        rewardValue: Number(referral.rewardValue),
        rewardClaimed: referral.rewardClaimed,
        rewardClaimedAt: referral.rewardClaimedAt?.toISOString() ?? null,
        expiresAt: referral.expiresAt?.toISOString() ?? null,
        createdAt: referral.createdAt.toISOString(),
        updatedAt: referral.updatedAt.toISOString(),
      },
    }, { status: 201 })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to create referral',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }
}

// ─── PATCH: Update referral status, grant rewards ────────────────────────
export async function PATCH(request: NextRequest) {
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

  const { referralId, status, rewardType, rewardValue, grantReward, expiresAt } = body as {
    referralId?: string
    status?: string
    rewardType?: string
    rewardValue?: number
    grantReward?: boolean
    expiresAt?: string | null
  }

  if (!referralId) {
    return NextResponse.json({ error: 'referralId is required' }, { status: 400 })
  }

  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
  }

  if (rewardType && !VALID_REWARD_TYPES.includes(rewardType)) {
    return NextResponse.json({ error: `Invalid rewardType. Must be one of: ${VALID_REWARD_TYPES.join(', ')}` }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}

  if (status) updateData.status = status
  if (rewardType) updateData.rewardType = rewardType
  if (rewardValue !== undefined) updateData.rewardValue = rewardValue
  if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null

  if (grantReward === true) {
    updateData.rewardClaimed = true
    updateData.rewardClaimedAt = new Date()
    if (!status) updateData.status = 'rewarded'
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  try {
    const referral = await db.referral.update({
      where: { id: referralId },
      data: updateData,
    })

    return NextResponse.json({
      source: 'live',
      success: true,
      referral: {
        id: referral.id,
        referrerId: referral.referrerId,
        referralCode: referral.referralCode,
        referredEmail: referral.referredEmail,
        referredUserId: referral.referredUserId,
        status: referral.status,
        rewardType: referral.rewardType,
        rewardValue: Number(referral.rewardValue),
        rewardClaimed: referral.rewardClaimed,
        rewardClaimedAt: referral.rewardClaimedAt?.toISOString() ?? null,
        expiresAt: referral.expiresAt?.toISOString() ?? null,
        createdAt: referral.createdAt.toISOString(),
        updatedAt: referral.updatedAt.toISOString(),
      },
    })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to update referral',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }
}

// ─── DELETE: Delete a referral ───────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const referralId = searchParams.get('referralId')

  if (!referralId) {
    return NextResponse.json({ error: 'referralId query parameter is required' }, { status: 400 })
  }

  try {
    await db.referral.delete({ where: { id: referralId } })

    return NextResponse.json({
      source: 'live',
      success: true,
    })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to delete referral',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }
}
