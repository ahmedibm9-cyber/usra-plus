import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserId, requireAuth } from '@/lib/auth-utils'
import { sendEmail, isResendConfigured } from '@/lib/email/send'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import type { EmailTemplate } from '@/lib/email/send'

/**
 * POST /api/email/send
 *
 * Send an email using the Resend integration.
 * Requires authentication. Only works when RESEND_API_KEY is set.
 *
 * Request body:
 * {
 *   to: string | string[],     // Recipient email(s)
 *   template: EmailTemplate,    // Template name (e.g. 'welcome', 'verification')
 *   data: Record<string, unknown>,  // Template data
 *   subject?: string,           // Optional custom subject
 *   replyTo?: string,           // Optional reply-to
 * }
 */
export async function POST(request: NextRequest) {
  // Rate limit (stricter for email sending)
  const rateLimitResult = checkRateLimit(request, RATE_LIMITS.API_WRITE)
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', retryAfter: Math.ceil(rateLimitResult.retryAfterMs / 1000) },
      {
        status: 429,
        headers: { 'Retry-After': Math.ceil(rateLimitResult.retryAfterMs / 1000).toString() },
      }
    )
  }

  // Require authentication
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { to, template, data, subject, replyTo } = body

    // Validate required fields
    if (!to) {
      return NextResponse.json({ error: 'Recipient (to) is required' }, { status: 400 })
    }
    if (!template) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 })
    }

    // Validate template name
    const validTemplates: EmailTemplate[] = [
      'welcome', 'password-reset', 'verification', 'plan-upgrade', 'plan-downgrade',
      'plan-expiring', 'plan-expired', 'family-invite', 'family-accepted', 'family-removed',
      'payment-success', 'payment-failed', 'invoice-ready', 'security-login-new-device',
      'security-password-changed', 'security-two-factor-enabled', 'security-two-factor-disabled',
      'account-deactivation-warning', 'account-deactivated', 'data-export-ready',
      'referral-invite', 'referral-reward',
    ]
    if (!validTemplates.includes(template)) {
      return NextResponse.json(
        { error: `Invalid template. Must be one of: ${validTemplates.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate email addresses
    const recipients = Array.isArray(to) ? to : [to]
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    for (const email of recipients) {
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: `Invalid email address: ${email}` }, { status: 400 })
      }
    }

    // Check if Resend is configured
    if (!isResendConfigured()) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: 'Email service not configured (RESEND_API_KEY not set). Email was not sent.',
      })
    }

    // Send the email
    const result = await sendEmail({
      to: recipients,
      template: template as EmailTemplate,
      data: data || {},
      subject,
      replyTo,
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        skipped: result.skipped,
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }
  } catch (err) {
    console.error('[Email Send API] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Reject other methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
