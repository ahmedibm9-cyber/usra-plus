/**
 * USRA PLUS Email Service
 * 
 * Email infrastructure powered by Resend.
 * Supports bilingual (English/Arabic) templates with professional HTML formatting.
 * All functions handle errors gracefully — never crashes the app if email fails.
 */

import { Resend } from 'resend'
import {
  otpTemplate,
  welcomeTemplate,
  passwordResetTemplate,
  subscriptionConfirmationTemplate,
  paymentFailedTemplate,
  trialEndingTemplate,
} from './email/templates'

type Language = 'en' | 'ar'

const EMAIL_FROM = process.env.EMAIL_FROM || 'USRA PLUS <noreply@usraplus.com>'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || ''

/**
 * Check if Resend email service is properly configured.
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}

// Lazy-initialize Resend to avoid startup crashes if API key is missing
let _resend: Resend | null = null
function getResend(): Resend | null {
  if (!isEmailConfigured()) return null
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send an email using Resend. Returns result indicating success/failure.
 * Never throws — errors are caught and returned.
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
): Promise<EmailResult> {
  const resend = getResend()
  if (!resend) {
    return { success: false, error: 'Resend API key not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text,
    })

    if (error) {
      console.error('[Email] Resend error:', error.message)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown email error'
    console.error('[Email] Send failed:', message)
    return { success: false, error: message }
  }
}

// ─── Public Email Functions ────────────────────────────────────────────────────

/**
 * Send OTP verification email.
 */
export async function sendOTP(
  email: string,
  code: string,
  userName?: string,
  language: Language = 'en',
): Promise<EmailResult> {
  const { html, text } = otpTemplate(code, userName, language)
  const subject = language === 'ar'
    ? `رمز التحقق - USRA PLUS`
    : `Your Verification Code - USRA PLUS`
  return sendEmail(email, subject, html, text)
}

/**
 * Send welcome email after signup.
 */
export async function sendWelcome(
  email: string,
  userName: string,
  language: Language = 'en',
): Promise<EmailResult> {
  const { html, text } = welcomeTemplate(userName, language)
  const subject = language === 'ar'
    ? `مرحباً بك في USRA PLUS!`
    : `Welcome to USRA PLUS!`
  return sendEmail(email, subject, html, text)
}

/**
 * Send password reset email with a reset link.
 */
export async function sendPasswordReset(
  email: string,
  resetUrl: string,
  language: Language = 'en',
): Promise<EmailResult> {
  const { html, text } = passwordResetTemplate(resetUrl, language)
  const subject = language === 'ar'
    ? `إعادة تعيين كلمة المرور - USRA PLUS`
    : `Reset Your Password - USRA PLUS`
  return sendEmail(email, subject, html, text)
}

/**
 * Send subscription confirmation email (receipt-style).
 */
export async function sendSubscriptionConfirmation(
  email: string,
  planName: string,
  amount: string,
  language: Language = 'en',
): Promise<EmailResult> {
  const { html, text } = subscriptionConfirmationTemplate(planName, amount, language)
  const subject = language === 'ar'
    ? `تأكيد الاشتراك - ${planName} - USRA PLUS`
    : `Subscription Confirmed - ${planName} - USRA PLUS`
  return sendEmail(email, subject, html, text)
}

/**
 * Send payment failure notification.
 */
export async function sendPaymentFailed(
  email: string,
  planName: string,
  language: Language = 'en',
): Promise<EmailResult> {
  const { html, text } = paymentFailedTemplate(planName, language)
  const subject = language === 'ar'
    ? `فشل عملية الدفع - USRA PLUS`
    : `Payment Failed - USRA PLUS`
  return sendEmail(email, subject, html, text)
}

/**
 * Send trial expiring warning.
 */
export async function sendTrialEndingSoon(
  email: string,
  daysLeft: number,
  planName: string,
  language: Language = 'en',
): Promise<EmailResult> {
  const { html, text } = trialEndingTemplate(daysLeft, planName, language)
  const subject = language === 'ar'
    ? `تنتهي فترة التجربة خلال ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'} - USRA PLUS`
    : `Trial Ending in ${daysLeft} Day${daysLeft === 1 ? '' : 's'} - USRA PLUS`
  return sendEmail(email, subject, html, text)
}

/**
 * Send admin alert notification.
 * Sends to the ADMIN_EMAIL configured in environment variables.
 */
export async function sendAdminAlert(
  alertType: string,
  message: string,
): Promise<EmailResult> {
  if (!ADMIN_EMAIL) {
    return { success: false, error: 'ADMIN_EMAIL not configured' }
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: monospace; padding: 20px; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: white; padding: 24px; border-radius: 8px; border-left: 4px solid #DC2626;">
        <h2 style="margin: 0 0 12px; color: #DC2626; font-size: 18px;">⚠️ Admin Alert: ${alertType}</h2>
        <p style="margin: 0 0 12px; color: #374151; font-size: 14px; white-space: pre-wrap;">${message}</p>
        <p style="margin: 0; color: #9CA3AF; font-size: 12px;">${new Date().toISOString()}</p>
      </div>
    </body>
    </html>
  `

  const text = `[ADMIN ALERT] ${alertType}\n\n${message}\n\n${new Date().toISOString()}`

  return sendEmail(ADMIN_EMAIL, `[ALERT] ${alertType} - USRA PLUS`, html, text)
}
