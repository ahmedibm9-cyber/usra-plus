import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// ─── GET: List all subscription plans ────────────────────────────────────
export async function GET(request: NextRequest) {

  try {
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const plans = await db.subscriptionPlan.findMany({
      orderBy: { sortOrder: 'asc' },
    })

    const serializedPlans = plans.map(plan => ({
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
      description: plan.description,
      monthlyPrice: Number(plan.monthlyPrice),
      yearlyPrice: plan.yearlyPrice != null ? Number(plan.yearlyPrice) : null,
      lifetimePrice: plan.lifetimePrice != null ? Number(plan.lifetimePrice) : null,
      currency: plan.currency,
      features: plan.features,
      limits: plan.limits,
      trialDays: plan.trialDays,
      isActive: plan.isActive,
      isPopular: plan.isPopular,
      sortOrder: plan.sortOrder,
      ctaText: plan.ctaText,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    }))

    return NextResponse.json({
      source: 'live',
      data: serializedPlans,
      total: serializedPlans.length,
    })
  } catch (err) {
    return NextResponse.json({
      source: 'demo',
      data: [],
      total: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    })
  }

  } catch (error) {

    console.error('[src.app.api.admin.subscriptions] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}

// ─── POST: Create a new subscription plan ────────────────────────────────
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
    slug, name, description, monthlyPrice, yearlyPrice, lifetimePrice,
    currency, features, limits, trialDays, isActive, isPopular, sortOrder, ctaText,
  } = body as {
    slug?: string
    name?: string
    description?: string
    monthlyPrice?: number
    yearlyPrice?: number | null
    lifetimePrice?: number | null
    currency?: string
    features?: string[]
    limits?: Record<string, unknown>
    trialDays?: number
    isActive?: boolean
    isPopular?: boolean
    sortOrder?: number
    ctaText?: string
  }

  if (!slug || !name) {
    return NextResponse.json({ error: 'slug and name are required' }, { status: 400 })
  }

  try {
    // Check for duplicate slug
    const existing = await db.subscriptionPlan.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: 'Plan slug already exists' }, { status: 409 })
    }

    // Get next sort order if not provided
    const maxSort = await db.subscriptionPlan.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    const plan = await db.subscriptionPlan.create({
      data: {
        slug,
        name,
        description: description || '',
        monthlyPrice: monthlyPrice ?? 0,
        yearlyPrice: yearlyPrice ?? null,
        lifetimePrice: lifetimePrice ?? null,
        currency: currency || 'USD',
        features: JSON.stringify(features ?? []),
        limits: JSON.stringify(limits ?? {}),
        trialDays: trialDays ?? 0,
        isActive: isActive ?? true,
        isPopular: isPopular ?? false,
        sortOrder: sortOrder ?? (maxSort ? maxSort.sortOrder + 1 : 1),
        ctaText: ctaText || '',
      },
    })

    return NextResponse.json({
      source: 'live',
      success: true,
      plan: {
        id: plan.id,
        slug: plan.slug,
        name: plan.name,
        description: plan.description,
        monthlyPrice: Number(plan.monthlyPrice),
        yearlyPrice: plan.yearlyPrice != null ? Number(plan.yearlyPrice) : null,
        lifetimePrice: plan.lifetimePrice != null ? Number(plan.lifetimePrice) : null,
        currency: plan.currency,
        features: plan.features,
        limits: plan.limits,
        trialDays: plan.trialDays,
        isActive: plan.isActive,
        isPopular: plan.isPopular,
        sortOrder: plan.sortOrder,
        ctaText: plan.ctaText,
        createdAt: plan.createdAt.toISOString(),
        updatedAt: plan.updatedAt.toISOString(),
      },
    }, { status: 201 })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to create plan',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.subscriptions] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}

// ─── PATCH: Update a subscription plan ───────────────────────────────────
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

  const { planId, ...updates } = body as Record<string, unknown> & { planId?: string }

  if (!planId) {
    return NextResponse.json({ error: 'planId is required' }, { status: 400 })
  }

  // Build update data
  const updateData: Record<string, unknown> = {}
  const allowedFields = [
    'name', 'description', 'monthlyPrice', 'yearlyPrice', 'lifetimePrice',
    'currency', 'trialDays', 'isActive', 'isPopular', 'sortOrder', 'ctaText',
  ]

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      updateData[key] = value
    } else if (key === 'features') {
      updateData['features'] = JSON.stringify(value)
    } else if (key === 'limits') {
      updateData['limits'] = JSON.stringify(value)
    } else if (key === 'slug') {
      updateData['slug'] = value
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  try {
    const plan = await db.subscriptionPlan.update({
      where: { id: planId },
      data: updateData,
    })

    return NextResponse.json({
      source: 'live',
      success: true,
      plan: {
        id: plan.id,
        slug: plan.slug,
        name: plan.name,
        description: plan.description,
        monthlyPrice: Number(plan.monthlyPrice),
        yearlyPrice: plan.yearlyPrice != null ? Number(plan.yearlyPrice) : null,
        lifetimePrice: plan.lifetimePrice != null ? Number(plan.lifetimePrice) : null,
        currency: plan.currency,
        features: plan.features,
        limits: plan.limits,
        trialDays: plan.trialDays,
        isActive: plan.isActive,
        isPopular: plan.isPopular,
        sortOrder: plan.sortOrder,
        ctaText: plan.ctaText,
        createdAt: plan.createdAt.toISOString(),
        updatedAt: plan.updatedAt.toISOString(),
      },
    })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to update plan',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.subscriptions] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}

// ─── DELETE: Deactivate a subscription plan ──────────────────────────────
export async function DELETE(request: NextRequest) {

  try {
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const planId = searchParams.get('planId')

  if (!planId) {
    return NextResponse.json({ error: 'planId query parameter is required' }, { status: 400 })
  }

  // Prevent deleting the free plan
  try {
    const plan = await db.subscriptionPlan.findUnique({ where: { id: planId } })
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }
    if (plan.slug === 'free') {
      return NextResponse.json({ error: 'Cannot deactivate the Free plan' }, { status: 400 })
    }

    const updated = await db.subscriptionPlan.update({
      where: { id: planId },
      data: { isActive: false },
    })

    return NextResponse.json({
      source: 'live',
      success: true,
      plan: {
        id: updated.id,
        slug: updated.slug,
        name: updated.name,
        description: updated.description,
        monthlyPrice: Number(updated.monthlyPrice),
        yearlyPrice: updated.yearlyPrice != null ? Number(updated.yearlyPrice) : null,
        lifetimePrice: updated.lifetimePrice != null ? Number(updated.lifetimePrice) : null,
        currency: updated.currency,
        features: updated.features,
        limits: updated.limits,
        trialDays: updated.trialDays,
        isActive: updated.isActive,
        isPopular: updated.isPopular,
        sortOrder: updated.sortOrder,
        ctaText: updated.ctaText,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to deactivate plan',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.subscriptions] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}
