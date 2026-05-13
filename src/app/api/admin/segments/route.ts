import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// ─── GET: List segments with member counts ───────────────────────────────
export async function GET(request: NextRequest) {

  try {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))

  try {
    const [data, total] = await Promise.all([
      db.userSegment.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.userSegment.count(),
    ])

    const mapped = data.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      rules: s.rules,
      userCount: s.userCount,
      isAutoUpdate: s.isAutoUpdate,
      lastUpdatedAt: s.lastUpdatedAt?.toISOString() ?? null,
      createdBy: s.createdBy,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
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

    console.error('[src.app.api.admin.segments] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}

// ─── POST: Create segment ────────────────────────────────────────────────
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

  const { name, description, rules, isAutoUpdate } = body as {
    name?: string
    description?: string
    rules?: Record<string, unknown>
    isAutoUpdate?: boolean
  }

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  try {
    const segment = await db.userSegment.create({
      data: {
        name,
        description: description || '',
        rules: JSON.stringify(rules || {}),
        userCount: 0,
        isAutoUpdate: isAutoUpdate ?? false,
        createdBy: auth.admin?.email || null,
      },
    })

    return NextResponse.json({
      source: 'live',
      success: true,
      segment: {
        id: segment.id,
        name: segment.name,
        description: segment.description,
        rules: segment.rules,
        userCount: segment.userCount,
        isAutoUpdate: segment.isAutoUpdate,
        lastUpdatedAt: segment.lastUpdatedAt?.toISOString() ?? null,
        createdBy: segment.createdBy,
        createdAt: segment.createdAt.toISOString(),
        updatedAt: segment.updatedAt.toISOString(),
      },
    }, { status: 201 })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to create segment',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.segments] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}

// ─── PATCH: Update segment ───────────────────────────────────────────────
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

  const { segmentId, ...updates } = body as Record<string, unknown> & { segmentId?: string }

  if (!segmentId) {
    return NextResponse.json({ error: 'segmentId is required' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = {
    lastUpdatedAt: new Date(),
  }

  if ('name' in updates) updateData.name = updates.name
  if ('description' in updates) updateData.description = updates.description
  if ('rules' in updates) updateData.rules = updates.rules
  if ('isAutoUpdate' in updates) updateData.isAutoUpdate = updates.isAutoUpdate
  if ('userCount' in updates) updateData.userCount = updates.userCount

  if (Object.keys(updateData).length === 1) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  try {
    const segment = await db.userSegment.update({
      where: { id: segmentId },
      data: updateData,
    })

    return NextResponse.json({
      source: 'live',
      success: true,
      segment: {
        id: segment.id,
        name: segment.name,
        description: segment.description,
        rules: segment.rules,
        userCount: segment.userCount,
        isAutoUpdate: segment.isAutoUpdate,
        lastUpdatedAt: segment.lastUpdatedAt?.toISOString() ?? null,
        createdBy: segment.createdBy,
        createdAt: segment.createdAt.toISOString(),
        updatedAt: segment.updatedAt.toISOString(),
      },
    })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to update segment',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.segments] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}

// ─── DELETE: Delete segment ──────────────────────────────────────────────
export async function DELETE(request: NextRequest) {

  try {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const segmentId = searchParams.get('segmentId')

  if (!segmentId) {
    return NextResponse.json({ error: 'segmentId query parameter is required' }, { status: 400 })
  }

  try {
    await db.userSegment.delete({ where: { id: segmentId } })
    return NextResponse.json({ source: 'live', success: true })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to delete segment',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.segments] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}
