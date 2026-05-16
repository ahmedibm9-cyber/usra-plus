/**
 * Legal Documents API — GDPR/PDPL Compliance
 *
 * GET /api/legal?type=privacy|terms|cookies
 * Returns the requested legal document content as JSON.
 */

import { NextRequest, NextResponse } from 'next/server'
import { PRIVACY_POLICY } from '@/lib/legal/privacy-policy'
import { TERMS_OF_SERVICE } from '@/lib/legal/terms-of-service'
import { COOKIE_POLICY } from '@/lib/legal/cookie-policy'

const documents: Record<string, { content: string; title: string; lastUpdated: string }> = {
  privacy: {
    content: PRIVACY_POLICY,
    title: 'Privacy Policy',
    lastUpdated: '2026-03-04',
  },
  terms: {
    content: TERMS_OF_SERVICE,
    title: 'Terms of Service',
    lastUpdated: '2026-03-04',
  },
  cookies: {
    content: COOKIE_POLICY,
    title: 'Cookie Policy',
    lastUpdated: '2026-03-04',
  },
}

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type')

  if (!type || !documents[type]) {
    return NextResponse.json(
      {
        error: `Invalid document type. Must be one of: ${Object.keys(documents).join(', ')}`,
        available: Object.keys(documents),
      },
      { status: 400 }
    )
  }

  const doc = documents[type]

  return NextResponse.json({
    type,
    title: doc.title,
    content: doc.content,
    lastUpdated: doc.lastUpdated,
    dataController: 'USRA PLUS',
    contact: 'privacy@usraplus.com',
  })
}
