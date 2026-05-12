import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

type EmailCampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled'

const VALID_STATUSES: EmailCampaignStatus[] = ['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled']

// ─── GET: List campaigns ─────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') as EmailCampaignStatus | null
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)))

  try {
    const where = status ? { status } : {}
    const [data, total] = await Promise.all([
      db.emailCampaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.emailCampaign.count({ where }),
    ])

    // Map DB fields to camelCase for frontend
    const mapped = data.map(c => ({
      id: c.id,
      name: c.name,
      subject: c.subject,
      bodyHtml: c.bodyHtml,
      bodyText: c.bodyText,
      templateId: c.templateId,
      targetSegment: c.targetSegment,
      status: c.status,
      scheduledAt: c.scheduledAt?.toISOString() ?? null,
      sentAt: c.sentAt?.toISOString() ?? null,
      totalRecipients: c.totalRecipients,
      openedCount: c.openedCount,
      clickedCount: c.clickedCount,
      bouncedCount: c.bouncedCount,
      createdBy: c.createdBy,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
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
}

// ─── POST: Create campaign ───────────────────────────────────────────────
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

  const { name, subject, targetSegment, scheduledAt, bodyHtml, bodyText, templateId } = body as {
    name?: string
    subject?: string
    targetSegment?: string
    scheduledAt?: string
    bodyHtml?: string
    bodyText?: string
    templateId?: string
  }

  if (!name || !subject) {
    return NextResponse.json({ error: 'name and subject are required' }, { status: 400 })
  }

  try {
    const status: EmailCampaignStatus = scheduledAt ? 'scheduled' : 'draft'
    const campaign = await db.emailCampaign.create({
      data: {
        name,
        subject,
        bodyHtml: bodyHtml || '<p></p>',
        bodyText: bodyText || null,
        templateId: templateId || null,
        targetSegment: targetSegment || 'all',
        status,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        totalRecipients: 0,
        openedCount: 0,
        clickedCount: 0,
        bouncedCount: 0,
        createdBy: auth.admin?.email || null,
      },
    })

    return NextResponse.json({
      source: 'live',
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        bodyHtml: campaign.bodyHtml,
        bodyText: campaign.bodyText,
        templateId: campaign.templateId,
        targetSegment: campaign.targetSegment,
        status: campaign.status,
        scheduledAt: campaign.scheduledAt?.toISOString() ?? null,
        sentAt: campaign.sentAt?.toISOString() ?? null,
        totalRecipients: campaign.totalRecipients,
        openedCount: campaign.openedCount,
        clickedCount: campaign.clickedCount,
        bouncedCount: campaign.bouncedCount,
        createdBy: campaign.createdBy,
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
      },
    }, { status: 201 })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to create campaign',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }
}

// ─── PATCH: Update campaign ──────────────────────────────────────────────
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

  const { campaignId, status, ...updates } = body as Record<string, unknown> & {
    campaignId?: string
    status?: string
  }

  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })
  }

  if (status && !VALID_STATUSES.includes(status as EmailCampaignStatus)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
  }

  // Map camelCase to DB fields
  const fieldMap: Record<string, string> = {
    name: 'name',
    subject: 'subject',
    targetSegment: 'targetSegment',
    bodyHtml: 'bodyHtml',
    bodyText: 'bodyText',
    templateId: 'templateId',
  }

  const updateData: Record<string, unknown> = {}
  if (status) updateData.status = status

  for (const [key, value] of Object.entries(updates)) {
    if (fieldMap[key]) {
      updateData[fieldMap[key]] = value
    }
  }

  // Handle scheduledAt separately (needs Date conversion)
  if ('scheduledAt' in updates && updates.scheduledAt) {
    updateData.scheduledAt = new Date(updates.scheduledAt as string)
  }

  // Auto-set sentAt when status changes to 'sent'
  if (status === 'sent') {
    updateData.sentAt = new Date()
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  try {
    const campaign = await db.emailCampaign.update({
      where: { id: campaignId },
      data: updateData,
    })

    return NextResponse.json({
      source: 'live',
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        bodyHtml: campaign.bodyHtml,
        bodyText: campaign.bodyText,
        templateId: campaign.templateId,
        targetSegment: campaign.targetSegment,
        status: campaign.status,
        scheduledAt: campaign.scheduledAt?.toISOString() ?? null,
        sentAt: campaign.sentAt?.toISOString() ?? null,
        totalRecipients: campaign.totalRecipients,
        openedCount: campaign.openedCount,
        clickedCount: campaign.clickedCount,
        bouncedCount: campaign.bouncedCount,
        createdBy: campaign.createdBy,
        createdAt: campaign.createdAt.toISOString(),
        updatedAt: campaign.updatedAt.toISOString(),
      },
    })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to update campaign',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }
}

// ─── DELETE: Delete campaign ─────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const campaignId = searchParams.get('campaignId')

  if (!campaignId) {
    return NextResponse.json({ error: 'campaignId query parameter is required' }, { status: 400 })
  }

  try {
    await db.emailCampaign.delete({ where: { id: campaignId } })
    return NextResponse.json({ source: 'live', success: true })
  } catch (err) {
    return NextResponse.json({
      error: 'Failed to delete campaign',
      details: err instanceof Error ? err.message : 'Unknown error',
    }, { status: 500 })
  }
}
