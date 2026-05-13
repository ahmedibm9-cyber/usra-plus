import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// ─── GET: List A/B Tests ─────────────────────────────────────────────────
export async function GET(request: NextRequest) {

  try {
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
    const where = status ? { status } : {}
    const [data, total] = await Promise.all([
      db.aBTest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.aBTest.count({ where }),
    ])

    const mapped = data.map(t => ({
      id: t.id,
      name: t.name,
      featureKey: t.featureKey,
      variantA: t.variantA,
      variantB: t.variantB,
      trafficPercentage: t.trafficPercentage,
      status: t.status,
      targetSegment: t.targetSegment,
      startedAt: t.startedAt?.toISOString() ?? null,
      endedAt: t.endedAt?.toISOString() ?? null,
      winner: t.winner,
      createdBy: t.createdBy,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }))

    return NextResponse.json({
      source: 'live',
      data: mapped,
      total,
      page,
      pageSize,
      hasMore: (page - 1) * pageSize + pageSize < total,
    })
  } catch (err) {
    return NextResponse.json({
      source: 'live',
      data: [],
      total: 0,
      page,
      pageSize,
      hasMore: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    })
  }

  } catch (error) {

    console.error('[src.app.api.admin.abtests] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}

// ─── POST: Create new A/B Test ───────────────────────────────────────────
export async function POST(request: NextRequest) {

  try {
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

  const { name, featureKey, variantA, variantB, trafficPercentage, targetSegment } = body as {
    name?: string
    featureKey?: string
    variantA?: string
    variantB?: string
    trafficPercentage?: number
    targetSegment?: string
  }

  if (!name || !featureKey || !variantA || !variantB) {
    return NextResponse.json({ error: 'name, featureKey, variantA, and variantB are required' }, { status: 400 })
  }

  if (trafficPercentage !== undefined && (trafficPercentage < 1 || trafficPercentage > 100)) {
    return NextResponse.json({ error: 'trafficPercentage must be between 1 and 100' }, { status: 400 })
  }

  try {
    const test = await db.aBTest.create({
      data: {
        name,
        featureKey,
        variantA,
        variantB,
        trafficPercentage: trafficPercentage || 50,
        status: 'draft',
        targetSegment: targetSegment || 'all',
        createdBy: auth.admin?.email || null,
      },
    })

    return NextResponse.json({
      source: 'live',
      success: true,
      test: {
        id: test.id,
        name: test.name,
        featureKey: test.featureKey,
        variantA: test.variantA,
        variantB: test.variantB,
        trafficPercentage: test.trafficPercentage,
        status: test.status,
        targetSegment: test.targetSegment,
        startedAt: test.startedAt?.toISOString() ?? null,
        endedAt: test.endedAt?.toISOString() ?? null,
        winner: test.winner,
        createdBy: test.createdBy,
        createdAt: test.createdAt.toISOString(),
        updatedAt: test.updatedAt.toISOString(),
      },
    }, { status: 201 })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to create A/B test',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.abtests] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}

// ─── PATCH: Update test status (start, pause, complete, cancel) ─────────
export async function PATCH(request: NextRequest) {

  try {
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

  const { testId, action, winner } = body as {
    testId?: string
    action?: 'start' | 'pause' | 'complete' | 'cancel'
    winner?: string
  }

  if (!testId || !action) {
    return NextResponse.json({ error: 'testId and action are required' }, { status: 400 })
  }

  const validActions = ['start', 'pause', 'complete', 'cancel']
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: `action must be one of: ${validActions.join(', ')}` }, { status: 400 })
  }

  try {
    // Verify the test exists
    const existing = await db.aBTest.findUnique({ where: { id: testId } })
    if (!existing) {
      return NextResponse.json({ error: 'A/B test not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    const now = new Date()

    switch (action) {
      case 'start':
        updateData.status = 'running'
        updateData.startedAt = now
        break
      case 'pause':
        updateData.status = 'paused'
        break
      case 'complete':
        updateData.status = 'completed'
        updateData.endedAt = now
        if (winner) updateData.winner = winner
        break
      case 'cancel':
        updateData.status = 'cancelled'
        updateData.endedAt = now
        break
    }

    const test = await db.aBTest.update({
      where: { id: testId },
      data: updateData,
    })

    return NextResponse.json({
      source: 'live',
      success: true,
      test: {
        id: test.id,
        name: test.name,
        featureKey: test.featureKey,
        variantA: test.variantA,
        variantB: test.variantB,
        trafficPercentage: test.trafficPercentage,
        status: test.status,
        targetSegment: test.targetSegment,
        startedAt: test.startedAt?.toISOString() ?? null,
        endedAt: test.endedAt?.toISOString() ?? null,
        winner: test.winner,
        createdBy: test.createdBy,
        createdAt: test.createdAt.toISOString(),
        updatedAt: test.updatedAt.toISOString(),
      },
    })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to update A/B test',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.abtests] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}

// ─── DELETE: Delete A/B Test ─────────────────────────────────────────────
export async function DELETE(request: NextRequest) {

  try {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const testId = searchParams.get('testId')

  if (!testId) {
    return NextResponse.json({ error: 'testId query parameter is required' }, { status: 400 })
  }

  try {
    await db.aBTest.delete({ where: { id: testId } })
    return NextResponse.json({ source: 'live', success: true })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to delete A/B test',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.abtests] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}
