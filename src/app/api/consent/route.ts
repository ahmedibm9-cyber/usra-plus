/**
 * Consent Management Endpoint — GDPR/PDPL Compliance
 *
 * POST /api/consent  — Record a new consent
 * GET  /api/consent  — Get all consents for the current user
 *
 * Consent types: "terms", "privacy", "marketing", "cookies"
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-utils'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'

const VALID_CONSENT_TYPES = ['terms', 'privacy', 'marketing', 'cookies'] as const
type ConsentType = typeof VALID_CONSENT_TYPES[number]

function isValidConsentType(type: string): type is ConsentType {
  return VALID_CONSENT_TYPES.includes(type as ConsentType)
}

// ─── POST: Record a new consent ────────────────────────────────

export async function POST(request: NextRequest) {
  // Rate limit
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.API_WRITE)
  if (rateLimitResponse) return rateLimitResponse

  // Auth
  const { userId, error } = await requireAuth(request)
  if (error) return error

  try {
    const body = await request.json()
    const { type, granted, version, ipAddress, userAgent } = body

    // Validate type
    if (!type || !isValidConsentType(type)) {
      return NextResponse.json(
        { error: `Invalid consent type. Must be one of: ${VALID_CONSENT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate granted
    if (typeof granted !== 'boolean') {
      return NextResponse.json(
        { error: 'granted must be a boolean' },
        { status: 400 }
      )
    }

    // Create consent record
    const consent = await db.consent.create({
      data: {
        userId,
        type,
        granted,
        version: version ?? '1.0',
        ipAddress: ipAddress || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
        userAgent: userAgent || request.headers.get('user-agent') || null,
      },
    })

    return NextResponse.json({ consent }, { status: 201 })
  } catch (err) {
    console.error('[Consent POST] Error:', err)
    return NextResponse.json(
      { error: 'Failed to record consent' },
      { status: 500 }
    )
  }
}

// ─── GET: Get all consents for current user ────────────────────

export async function GET(request: NextRequest) {
  // Rate limit
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.API_READ)
  if (rateLimitResponse) return rateLimitResponse

  // Auth
  const { userId, error } = await requireAuth(request)
  if (error) return error

  try {
    const consents = await db.consent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    // Group by type with latest first
    const grouped = consents.reduce<Record<string, typeof consents>>((acc, consent) => {
      if (!acc[consent.type]) acc[consent.type] = []
      acc[consent.type].push(consent)
      return acc
    }, {})

    // Latest consent per type
    const latestConsents = Object.entries(grouped).map(([type, items]) => ({
      type,
      latest: items[0],
      history: items,
    }))

    return NextResponse.json({
      consents,
      grouped: latestConsents,
      total: consents.length,
    })
  } catch (err) {
    console.error('[Consent GET] Error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch consents' },
      { status: 500 }
    )
  }
}
