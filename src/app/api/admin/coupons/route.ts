import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const VALID_DISCOUNT_TYPES = ['percentage', 'fixed_amount', 'free_trial_extension', 'plan_upgrade']
const VALID_AUDIENCES = ['all', 'new_users', 'existing_users', 'churned_users', 'trial_users', 'vip']

// ─── GET: List all coupons ───────────────────────────────────────────────
export async function GET(request: NextRequest) {

  try {
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const isActiveFilter = searchParams.get('isActive')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))

  try {
    const where: Record<string, unknown> = {}
    if (isActiveFilter !== null) {
      where.isActive = isActiveFilter === 'true'
    }

    const [coupons, total] = await Promise.all([
      db.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { redemptions: true } },
        },
      }),
      db.coupon.count({ where }),
    ])

    const serializedCoupons = coupons.map(c => ({
      id: c.id,
      code: c.code,
      name: c.name,
      description: c.description,
      discountType: c.discountType,
      discountValue: Number(c.discountValue),
      applicablePlans: c.applicablePlans,
      maxRedemptions: c.maxRedemptions,
      currentRedemptions: c._count.redemptions,
      maxRedemptionsPerUser: c.maxRedemptionsPerUser,
      validFrom: c.validFrom?.toISOString() ?? null,
      validUntil: c.validUntil?.toISOString() ?? null,
      isActive: c.isActive,
      targetAudience: c.targetAudience,
      autoApply: c.autoApply,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }))

    return NextResponse.json({
      source: 'live',
      data: serializedCoupons,
      total,
      page,
      pageSize,
      hasMore: (page - 1) * pageSize + pageSize < total,
    })
  } catch (err) {
    return NextResponse.json({
      source: 'demo',
      data: [],
      total: 0,
      page,
      pageSize,
      hasMore: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    })
  }

  } catch (error) {

    console.error('[src.app.api.admin.coupons] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}

// ─── POST: Create a new coupon ───────────────────────────────────────────
export async function POST(request: NextRequest) {

  try {
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.ADMIN_API)
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

  const {
    code, name, description, discountType, discountValue,
    applicablePlans, maxRedemptions, maxRedemptionsPerUser,
    validFrom, validUntil, targetAudience, autoApply,
  } = body as {
    code?: string
    name?: string
    description?: string
    discountType?: string
    discountValue?: number
    applicablePlans?: string[]
    maxRedemptions?: number | null
    maxRedemptionsPerUser?: number
    validFrom?: string
    validUntil?: string | null
    targetAudience?: string
    autoApply?: boolean
  }

  if (!code || !name || !discountType || discountValue === undefined) {
    return NextResponse.json({ error: 'code, name, discountType, and discountValue are required' }, { status: 400 })
  }

  if (!VALID_DISCOUNT_TYPES.includes(discountType)) {
    return NextResponse.json({ error: `Invalid discountType. Must be one of: ${VALID_DISCOUNT_TYPES.join(', ')}` }, { status: 400 })
  }

  if (targetAudience && !VALID_AUDIENCES.includes(targetAudience)) {
    return NextResponse.json({ error: `Invalid targetAudience. Must be one of: ${VALID_AUDIENCES.join(', ')}` }, { status: 400 })
  }

  if (discountType === 'percentage' && discountValue > 100) {
    return NextResponse.json({ error: 'Percentage discount cannot exceed 100' }, { status: 400 })
  }

  if (discountType === 'percentage' && discountValue < 0) {
    return NextResponse.json({ error: 'Discount value cannot be negative' }, { status: 400 })
  }

  if (discountType === 'fixed_amount' && discountValue < 0) {
    return NextResponse.json({ error: 'Discount value cannot be negative' }, { status: 400 })
  }

  try {
    // Check for duplicate code
    const existing = await db.coupon.findUnique({ where: { code: code.toUpperCase() } })
    if (existing) {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 })
    }

    const coupon = await db.coupon.create({
      data: {
        code: code.toUpperCase(),
        name,
        description: description || '',
        discountType,
        discountValue,
        applicablePlans: JSON.stringify(applicablePlans || []),
        maxRedemptions: maxRedemptions || null,
        currentRedemptions: 0,
        maxRedemptionsPerUser: maxRedemptionsPerUser || 1,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        isActive: true,
        targetAudience: targetAudience || 'all',
        autoApply: autoApply || false,
        createdBy: auth.admin?.email || null,
      },
    })

    return NextResponse.json({
      source: 'live',
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        applicablePlans: coupon.applicablePlans,
        maxRedemptions: coupon.maxRedemptions,
        maxRedemptionsPerUser: coupon.maxRedemptionsPerUser,
        validFrom: coupon.validFrom?.toISOString() ?? null,
        validUntil: coupon.validUntil?.toISOString() ?? null,
        isActive: coupon.isActive,
        targetAudience: coupon.targetAudience,
        autoApply: coupon.autoApply,
        createdAt: coupon.createdAt.toISOString(),
        updatedAt: coupon.updatedAt.toISOString(),
      },
    }, { status: 201 })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to create coupon',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.coupons] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}

// ─── PATCH: Update coupon ────────────────────────────────────────────────
export async function PATCH(request: NextRequest) {

  try {
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.ADMIN_API)
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

  const { couponId, ...updates } = body as Record<string, unknown> & { couponId?: string }

  if (!couponId) {
    return NextResponse.json({ error: 'couponId is required' }, { status: 400 })
  }

  // Validate discountType if being updated
  if (updates.discountType && !VALID_DISCOUNT_TYPES.includes(updates.discountType as string)) {
    return NextResponse.json({ error: `Invalid discountType. Must be one of: ${VALID_DISCOUNT_TYPES.join(', ')}` }, { status: 400 })
  }

  if (updates.targetAudience && !VALID_AUDIENCES.includes(updates.targetAudience as string)) {
    return NextResponse.json({ error: `Invalid targetAudience. Must be one of: ${VALID_AUDIENCES.join(', ')}` }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {}
  const directFields = [
    'name', 'description', 'discountType', 'discountValue',
    'maxRedemptions', 'maxRedemptionsPerUser', 'isActive',
    'targetAudience', 'autoApply',
  ]

  for (const [key, value] of Object.entries(updates)) {
    if (directFields.includes(key)) {
      updateData[key] = value
    } else if (key === 'applicablePlans') {
      updateData['applicablePlans'] = JSON.stringify(value)
    } else if (key === 'validUntil') {
      updateData['validUntil'] = value ? new Date(value as string) : null
    } else if (key === 'validFrom') {
      updateData['validFrom'] = value ? new Date(value as string) : null
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  try {
    const coupon = await db.coupon.update({
      where: { id: couponId },
      data: updateData,
    })

    return NextResponse.json({
      source: 'live',
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        applicablePlans: coupon.applicablePlans,
        maxRedemptions: coupon.maxRedemptions,
        maxRedemptionsPerUser: coupon.maxRedemptionsPerUser,
        validFrom: coupon.validFrom?.toISOString() ?? null,
        validUntil: coupon.validUntil?.toISOString() ?? null,
        isActive: coupon.isActive,
        targetAudience: coupon.targetAudience,
        autoApply: coupon.autoApply,
        createdAt: coupon.createdAt.toISOString(),
        updatedAt: coupon.updatedAt.toISOString(),
      },
    })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to update coupon',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.coupons] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}

// ─── DELETE: Soft delete coupon (set isActive=false) ────────────────────
export async function DELETE(request: NextRequest) {

  try {
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const couponId = searchParams.get('couponId')

  if (!couponId) {
    return NextResponse.json({ error: 'couponId query parameter is required' }, { status: 400 })
  }

  try {
    const coupon = await db.coupon.update({
      where: { id: couponId },
      data: { isActive: false },
    })

    return NextResponse.json({
      source: 'live',
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        applicablePlans: coupon.applicablePlans,
        maxRedemptions: coupon.maxRedemptions,
        maxRedemptionsPerUser: coupon.maxRedemptionsPerUser,
        validFrom: coupon.validFrom?.toISOString() ?? null,
        validUntil: coupon.validUntil?.toISOString() ?? null,
        isActive: coupon.isActive,
        targetAudience: coupon.targetAudience,
        autoApply: coupon.autoApply,
        createdAt: coupon.createdAt.toISOString(),
        updatedAt: coupon.updatedAt.toISOString(),
      },
    })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to delete coupon',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.coupons] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}
