import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { db } from '@/lib/db'

// Feature Flags API — dedicated endpoint for feature flag CRUD

// GET: Retrieve all feature flags
export async function GET(request: NextRequest) {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const flags = await db.featureFlag.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const mapped = flags.map(f => ({
      id: f.id,
      key: f.key,
      name: f.name,
      description: f.description,
      enabled: f.enabled,
      rolloutPercentage: f.rolloutPercentage,
      targetPlan: f.targetPlan,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }))

    return NextResponse.json({ source: 'live', flags: mapped, total: mapped.length })
  } catch (error) {
    console.error('[Admin Feature Flags API] Error:', error)
    return NextResponse.json({ source: 'live', flags: [], total: 0 })
  }
}

// PUT: Update a feature flag (toggle, change rollout, etc.)
export async function PUT(request: NextRequest) {
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

  const { id, key, name, description, enabled, rolloutPercentage, targetPlan } = body as {
    id?: string
    key?: string
    name?: string
    description?: string
    enabled?: boolean
    rolloutPercentage?: number
    targetPlan?: string | null
  }

  // If id is provided, update existing flag
  if (id) {
    try {
      const updateData: Record<string, unknown> = {}
      if (name !== undefined) updateData.name = name
      if (description !== undefined) updateData.description = description
      if (enabled !== undefined) updateData.enabled = enabled
      if (rolloutPercentage !== undefined) updateData.rolloutPercentage = rolloutPercentage
      if (targetPlan !== undefined) updateData.targetPlan = targetPlan || null

      const updated = await db.featureFlag.update({
        where: { id },
        data: updateData,
      })

      return NextResponse.json({
        source: 'live',
        success: true,
        flag: {
          id: updated.id,
          key: updated.key,
          name: updated.name,
          description: updated.description,
          enabled: updated.enabled,
          rolloutPercentage: updated.rolloutPercentage,
          targetPlan: updated.targetPlan,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      })
    } catch (error) {
      console.error('[Admin Feature Flags API] Update error:', error)
      return NextResponse.json({ error: 'Failed to update feature flag' }, { status: 500 })
    }
  }

  // If key is provided, create new flag
  if (key && name) {
    try {
      const created = await db.featureFlag.create({
        data: {
          key,
          name,
          description: description || '',
          enabled: enabled ?? false,
          rolloutPercentage: rolloutPercentage ?? 100,
          targetPlan: targetPlan || null,
        },
      })

      return NextResponse.json({
        source: 'live',
        success: true,
        flag: {
          id: created.id,
          key: created.key,
          name: created.name,
          description: created.description,
          enabled: created.enabled,
          rolloutPercentage: created.rolloutPercentage,
          targetPlan: created.targetPlan,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        },
      }, { status: 201 })
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('Unique')) {
        return NextResponse.json({ error: 'Feature flag key already exists' }, { status: 409 })
      }
      console.error('[Admin Feature Flags API] Create error:', error)
      return NextResponse.json({ error: 'Failed to create feature flag' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Either id (to update) or key+name (to create) is required' }, { status: 400 })
}

// DELETE: Remove a feature flag
export async function DELETE(request: NextRequest) {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 })
  }

  try {
    await db.featureFlag.delete({ where: { id } })
    return NextResponse.json({ source: 'live', success: true, message: 'Feature flag deleted' })
  } catch {
    return NextResponse.json({ error: 'Feature flag not found' }, { status: 404 })
  }
}
