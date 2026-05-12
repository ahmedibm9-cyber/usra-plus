/**
 * Resend Email Service for USRA PLUS
 *
 * Provides email sending capabilities using the Resend SDK.
 * All emails only send when RESEND_API_KEY is set — otherwise, they
 * gracefully no-op with a console log (for dev/demo mode).
 *
 * Usage:
 *   import { sendEmail } from '@/lib/email/send'
 *   await sendEmail({ to: 'user@example.com', template: 'welcome', data: { name: 'Ahmed' } })
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type EmailTemplate =
  | 'welcome'
  | 'password-reset'
  | 'verification'
  | 'plan-upgrade'
  | 'plan-downgrade'
  | 'plan-expiring'
  | 'plan-expired'
  | 'family-invite'
  | 'family-accepted'
  | 'family-removed'
  | 'payment-success'
  | 'payment-failed'
  | 'invoice-ready'
  | 'security-login-new-device'
  | 'security-password-changed'
  | 'security-two-factor-enabled'
  | 'security-two-factor-disabled'
  | 'account-deactivation-warning'
  | 'account-deactivated'
  | 'data-export-ready'
  | 'referral-invite'
  | 'referral-reward'

export interface EmailData {
  to: string | string[]
  template: EmailTemplate
  data: Record<string, unknown>
  /** Optional custom subject line (overrides template default) */
  subject?: string
  /** Optional reply-to address */
  replyTo?: string
  /** Optional CC addresses */
  cc?: string | string[]
  /** Optional BCC addresses */
  bcc?: string | string[]
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
  skipped?: boolean
}

// ─── Resend Client ──────────────────────────────────────────────────────────

let _resendClient: any = null

/**
 * Check if Resend is configured (has an API key).
 */
export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}

/**
 * Get or initialize the Resend client.
 * Returns null if not configured.
 */
async function getResendClient(): Promise<any> {
  if (_resendClient) return _resendClient

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null

  try {
    const { Resend } = await import('resend')
    _resendClient = new Resend(apiKey)
    return _resendClient
  } catch (err) {
    console.error('[Email] Failed to initialize Resend client:', err)
    return null
  }
}

// ─── Default From Address ───────────────────────────────────────────────────

function getFromAddress(): string {
  return process.env.EMAIL_FROM || 'USRA PLUS <noreply@usra.plus>'
}

// ─── Send Email ─────────────────────────────────────────────────────────────

/**
 * Send an email using the Resend SDK.
 *
 * If RESEND_API_KEY is not set, the email is not sent and a
 * console log is written instead (graceful no-op for dev/demo).
 *
 * @param params - Email parameters including template and data
 * @returns Result indicating success, error, or skip status
 */
export async function sendEmail(params: EmailData): Promise<EmailResult> {
  // Check if Resend is configured
  if (!isResendConfigured()) {
    console.info(
      `[Email] Skipped (RESEND_API_KEY not set): template="${params.template}" to="${params.to}"`
    )
    return { success: true, skipped: true }
  }

  const client = await getResendClient()
  if (!client) {
    console.warn('[Email] Resend client not available, skipping email')
    return { success: true, skipped: true }
  }

  try {
    const { renderTemplate } = await import('./templates')
    const { subject, html, text } = renderTemplate(params.template, params.data)

    const result = await client.emails.send({
      from: getFromAddress(),
      to: params.to,
      subject: params.subject || subject,
      html,
      text,
      replyTo: params.replyTo,
      cc: params.cc,
      bcc: params.bcc,
    })

    if (result.error) {
      console.error('[Email] Send error:', result.error)
      return { success: false, error: result.error.message || 'Unknown email error' }
    }

    return { success: true, messageId: result.data?.id }
  } catch (err) {
    console.error('[Email] Send failed:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error sending email',
    }
  }
}

/**
 * Send multiple emails in batch.
 * Non-critical — errors are logged but don't throw.
 */
export async function sendBatchEmails(emails: EmailData[]): Promise<EmailResult[]> {
  const results: EmailResult[] = []

  for (const email of emails) {
    const result = await sendEmail(email)
    results.push(result)
  }

  return results
}

/**
 * Send a simple plain-text email (not using templates).
 * Useful for internal notifications and admin alerts.
 */
export async function sendPlainTextEmail(params: {
  to: string | string[]
  subject: string
  body: string
  replyTo?: string
}): Promise<EmailResult> {
  if (!isResendConfigured()) {
    console.info(`[Email] Skipped plain-text (RESEND_API_KEY not set): to="${params.to}"`)
    return { success: true, skipped: true }
  }

  const client = await getResendClient()
  if (!client) {
    return { success: true, skipped: true }
  }

  try {
    const result = await client.emails.send({
      from: getFromAddress(),
      to: params.to,
      subject: params.subject,
      text: params.body,
      replyTo: params.replyTo,
    })

    if (result.error) {
      return { success: false, error: result.error.message || 'Unknown email error' }
    }

    return { success: true, messageId: result.data?.id }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error sending email',
    }
  }
}
