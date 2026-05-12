/**
 * Email Templates for USRA PLUS
 *
 * Provides rendered HTML and plain-text content for all email templates.
 * Each template has a default subject, HTML body, and plain-text body.
 *
 * Templates support both English and Arabic based on the `language` field in data.
 */

import type { EmailTemplate } from '../send'

// ─── Template Data Type ─────────────────────────────────────────────────────

interface RenderedEmail {
  subject: string
  html: string
  text: string
}

// ─── Base Layout ────────────────────────────────────────────────────────────

function baseHtmlLayout(content: string, previewText: string): string {
  return `<!DOCTYPE html>
<html dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>USRA PLUS</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f7; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #007AFF, #0066CC); padding: 32px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; }
    .body { padding: 32px; color: #1d1d1f; line-height: 1.6; }
    .body h2 { color: #1d1d1f; font-size: 20px; margin: 0 0 16px; }
    .body p { margin: 0 0 16px; color: #424245; }
    .button { display: inline-block; background: #007AFF; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 16px 0; }
    .button:hover { background: #0066CC; }
    .footer { padding: 24px 32px; text-align: center; border-top: 1px solid #e5e5ea; }
    .footer p { color: #86868b; font-size: 12px; margin: 4px 0; }
    .footer a { color: #007AFF; text-decoration: none; }
    .code-box { background: #f5f5f7; border: 2px dashed #007AFF; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
    .code { font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #007AFF; }
    .warning { background: #FFF3E0; border-left: 4px solid #FF9500; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .success { background: #E8F5E9; border-left: 4px solid #34C759; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .info { background: #E3F2FD; border-left: 4px solid #007AFF; padding: 16px; border-radius: 8px; margin: 16px 0; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#fefefe;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${previewText}</div>
  <div class="container">
    <div class="header">
      <h1>✨ USRA PLUS</h1>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>USRA PLUS — Smart Family Finance Management</p>
      <p><a href="https://usra.plus">usra.plus</a></p>
      <p>If you did not expect this email, please ignore it.</p>
    </div>
  </div>
</body>
</html>`
}

function baseTextLayout(content: string): string {
  return `USRA PLUS
━━━━━━━━━━━━━━━━━━━━

${content}

━━━━━━━━━━━━━━━━━━━━
USRA PLUS — Smart Family Finance Management
https://usra.plus

If you did not expect this email, please ignore it.`
}

// ─── Template Renderers ─────────────────────────────────────────────────────

const templateRenderers: Record<EmailTemplate, (data: Record<string, unknown>) => RenderedEmail> = {

  // 1. Welcome
  welcome: (data) => {
    const name = String(data.firstName || data.name || 'there')
    return {
      subject: 'Welcome to USRA PLUS! 🎉',
      html: baseHtmlLayout(`
        <h2>Welcome, ${name}! 👋</h2>
        <p>We're thrilled to have you join USRA PLUS — your smart family finance companion.</p>
        <p>Here's what you can do:</p>
        <ul>
          <li>📊 Track your family's finances in real time</li>
          <li>👨‍👩‍👧‍👦 Create a family and invite members</li>
          <li>💡 Get AI-powered budget suggestions</li>
          <li>📈 Set savings goals and monitor progress</li>
        </ul>
        <a href="${data.dashboardUrl || 'https://usra.plus'}" class="button">Go to Dashboard</a>
      `, 'Welcome to USRA PLUS!'),
      text: baseTextLayout(`Welcome, ${name}!

We're thrilled to have you join USRA PLUS — your smart family finance companion.

Here's what you can do:
- Track your family's finances in real time
- Create a family and invite members
- Get AI-powered budget suggestions
- Set savings goals and monitor progress

Go to Dashboard: ${data.dashboardUrl || 'https://usra.plus'}`),
    }
  },

  // 2. Password Reset
  'password-reset': (data) => {
    const code = String(data.code || '------')
    return {
      subject: 'Reset your USRA PLUS password',
      html: baseHtmlLayout(`
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your password. Use the code below to proceed:</p>
        <div class="code-box">
          <div class="code">${code}</div>
        </div>
        <p>This code expires in <strong>15 minutes</strong>.</p>
        <div class="warning">
          <p><strong>⚠️</strong> If you did not request this reset, please ignore this email. Your account is safe.</p>
        </div>
      `, 'Your password reset code'),
      text: baseTextLayout(`Password Reset Request

We received a request to reset your password. Use the code below to proceed:

Verification Code: ${code}

This code expires in 15 minutes.

If you did not request this reset, please ignore this email. Your account is safe.`),
    }
  },

  // 3. Verification
  verification: (data) => {
    const code = String(data.code || '------')
    return {
      subject: 'Verify your email address',
      html: baseHtmlLayout(`
        <h2>Verify Your Email</h2>
        <p>Thanks for signing up! Please verify your email address with this code:</p>
        <div class="code-box">
          <div class="code">${code}</div>
        </div>
        <p>This code expires in <strong>15 minutes</strong>.</p>
      `, 'Verify your email address'),
      text: baseTextLayout(`Verify Your Email

Thanks for signing up! Please verify your email address with this code:

Verification Code: ${code}

This code expires in 15 minutes.`),
    }
  },

  // 4. Plan Upgrade
  'plan-upgrade': (data) => {
    const plan = String(data.plan || 'Pro')
    return {
      subject: `You've upgraded to USRA PLUS ${plan}! 🚀`,
      html: baseHtmlLayout(`
        <h2>Plan Upgraded! 🎉</h2>
        <p>Congratulations! You've been upgraded to <strong>USRA PLUS ${plan}</strong>.</p>
        <div class="success">
          <p><strong>Your new benefits:</strong></p>
          <p>${data.benefits || 'Unlimited tasks, more storage, family features, and AI-powered insights.'}</p>
        </div>
        <a href="${data.dashboardUrl || 'https://usra.plus'}" class="button">Explore New Features</a>
      `, `You've upgraded to USRA PLUS ${plan}!`),
      text: baseTextLayout(`Plan Upgraded!

Congratulations! You've been upgraded to USRA PLUS ${plan}.

Your new benefits:
${data.benefits || 'Unlimited tasks, more storage, family features, and AI-powered insights.'}

Explore New Features: ${data.dashboardUrl || 'https://usra.plus'}`),
    }
  },

  // 5. Plan Downgrade
  'plan-downgrade': (data) => {
    const plan = String(data.plan || 'Free')
    return {
      subject: 'Your subscription has changed',
      html: baseHtmlLayout(`
        <h2>Subscription Update</h2>
        <p>Your USRA PLUS subscription has changed to the <strong>${plan}</strong> plan.</p>
        <div class="warning">
          <p><strong>What this means:</strong></p>
          <p>${data.changes || 'Some features may no longer be available. Your data is safe and will be preserved.'}</p>
        </div>
        <p>You can upgrade anytime to regain access to all features.</p>
        <a href="${data.upgradeUrl || 'https://usra.plus'}" class="button">View Plans</a>
      `, 'Your subscription has changed'),
      text: baseTextLayout(`Subscription Update

Your USRA PLUS subscription has changed to the ${plan} plan.

What this means:
${data.changes || 'Some features may no longer be available. Your data is safe and will be preserved.'}

You can upgrade anytime to regain access to all features.

View Plans: ${data.upgradeUrl || 'https://usra.plus'}`),
    }
  },

  // 6. Plan Expiring
  'plan-expiring': (data) => {
    const days = String(data.daysRemaining || '7')
    const plan = String(data.plan || 'Pro')
    return {
      subject: `Your ${plan} plan expires in ${days} days`,
      html: baseHtmlLayout(`
        <h2>⏰ Your Plan is Expiring Soon</h2>
        <p>Your USRA PLUS <strong>${plan}</strong> subscription will expire in <strong>${days} days</strong>.</p>
        <p>Don't lose access to your favorite features! Renew now to keep everything running smoothly.</p>
        <a href="${data.renewUrl || 'https://usra.plus'}" class="button">Renew Now</a>
      `, `Your ${plan} plan expires in ${days} days`),
      text: baseTextLayout(`Your Plan is Expiring Soon

Your USRA PLUS ${plan} subscription will expire in ${days} days.

Don't lose access to your favorite features! Renew now to keep everything running smoothly.

Renew Now: ${data.renewUrl || 'https://usra.plus'}`),
    }
  },

  // 7. Plan Expired
  'plan-expired': (data) => {
    const plan = String(data.plan || 'Pro')
    return {
      subject: `Your ${plan} plan has expired`,
      html: baseHtmlLayout(`
        <h2>Subscription Expired</h2>
        <p>Your USRA PLUS <strong>${plan}</strong> subscription has expired.</p>
        <p>You've been moved to the Free plan. Don't worry — your data is safe!</p>
        <a href="${data.renewUrl || 'https://usra.plus'}" class="button">Resubscribe Now</a>
      `, `Your ${plan} plan has expired`),
      text: baseTextLayout(`Subscription Expired

Your USRA PLUS ${plan} subscription has expired.

You've been moved to the Free plan. Don't worry — your data is safe!

Resubscribe Now: ${data.renewUrl || 'https://usra.plus'}`),
    }
  },

  // 8. Family Invite
  'family-invite': (data) => {
    const familyName = String(data.familyName || 'the family')
    const inviterName = String(data.inviterName || 'someone')
    return {
      subject: `${inviterName} invited you to join ${familyName} on USRA PLUS`,
      html: baseHtmlLayout(`
        <h2>You're Invited! 🏠</h2>
        <p><strong>${inviterName}</strong> has invited you to join <strong>${familyName}</strong> on USRA PLUS.</p>
        <p>Join the family to share budgets, track expenses together, and stay on top of your finances.</p>
        <a href="${data.acceptUrl || 'https://usra.plus'}" class="button">Accept Invitation</a>
        <p style="color: #86868b; font-size: 14px;">This invitation expires in 7 days.</p>
      `, `${inviterName} invited you to join ${familyName}`),
      text: baseTextLayout(`You're Invited!

${inviterName} has invited you to join ${familyName} on USRA PLUS.

Join the family to share budgets, track expenses together, and stay on top of your finances.

Accept Invitation: ${data.acceptUrl || 'https://usra.plus'}

This invitation expires in 7 days.`),
    }
  },

  // 9. Family Accepted
  'family-accepted': (data) => {
    const memberName = String(data.memberName || 'A new member')
    const familyName = String(data.familyName || 'your family')
    return {
      subject: `${memberName} joined ${familyName}!`,
      html: baseHtmlLayout(`
        <h2>New Family Member! 🎉</h2>
        <p><strong>${memberName}</strong> has accepted your invitation and joined <strong>${familyName}</strong>.</p>
        <div class="success">
          <p>You can now collaborate on budgets and track expenses together.</p>
        </div>
        <a href="${data.dashboardUrl || 'https://usra.plus'}" class="button">View Family</a>
      `, `${memberName} joined your family!`),
      text: baseTextLayout(`New Family Member!

${memberName} has accepted your invitation and joined ${familyName}.

You can now collaborate on budgets and track expenses together.

View Family: ${data.dashboardUrl || 'https://usra.plus'}`),
    }
  },

  // 10. Family Removed
  'family-removed': (data) => {
    const familyName = String(data.familyName || 'the family')
    return {
      subject: `You've been removed from ${familyName}`,
      html: baseHtmlLayout(`
        <h2>Family Membership Update</h2>
        <p>You've been removed from <strong>${familyName}</strong> on USRA PLUS.</p>
        <p>If you believe this was a mistake, please contact the family admin.</p>
        <a href="${data.dashboardUrl || 'https://usra.plus'}" class="button">Go to Dashboard</a>
      `, `You've been removed from ${familyName}`),
      text: baseTextLayout(`Family Membership Update

You've been removed from ${familyName} on USRA PLUS.

If you believe this was a mistake, please contact the family admin.

Go to Dashboard: ${data.dashboardUrl || 'https://usra.plus'}`),
    }
  },

  // 11. Payment Success
  'payment-success': (data) => {
    const amount = String(data.amount || '$0.00')
    const plan = String(data.plan || 'Pro')
    return {
      subject: `Payment confirmed — USRA PLUS ${plan}`,
      html: baseHtmlLayout(`
        <h2>Payment Confirmed ✅</h2>
        <p>Your payment of <strong>${amount}</strong> for USRA PLUS <strong>${plan}</strong> has been processed successfully.</p>
        <div class="success">
          <p>Transaction ID: ${data.transactionId || 'N/A'}</p>
          <p>Next billing date: ${data.nextBillingDate || 'N/A'}</p>
        </div>
        <a href="${data.dashboardUrl || 'https://usra.plus'}" class="button">View Subscription</a>
      `, `Payment confirmed for USRA PLUS ${plan}`),
      text: baseTextLayout(`Payment Confirmed

Your payment of ${amount} for USRA PLUS ${plan} has been processed successfully.

Transaction ID: ${data.transactionId || 'N/A'}
Next billing date: ${data.nextBillingDate || 'N/A'}

View Subscription: ${data.dashboardUrl || 'https://usra.plus'}`),
    }
  },

  // 12. Payment Failed
  'payment-failed': (data) => {
    const amount = String(data.amount || '$0.00')
    return {
      subject: 'Payment failed — action required',
      html: baseHtmlLayout(`
        <h2>⚠️ Payment Failed</h2>
        <p>We were unable to process your payment of <strong>${amount}</strong>.</p>
        <div class="warning">
          <p><strong>Reason:</strong> ${data.reason || 'Your card was declined or has expired.'}</p>
        </div>
        <p>Please update your payment method to avoid service interruption.</p>
        <a href="${data.updateUrl || 'https://usra.plus'}" class="button">Update Payment Method</a>
      `, 'Payment failed — action required'),
      text: baseTextLayout(`Payment Failed

We were unable to process your payment of ${amount}.

Reason: ${data.reason || 'Your card was declined or has expired.'}

Please update your payment method to avoid service interruption.

Update Payment Method: ${data.updateUrl || 'https://usra.plus'}`),
    }
  },

  // 13. Invoice Ready
  'invoice-ready': (data) => {
    const amount = String(data.amount || '$0.00')
    return {
      subject: `Your invoice for ${data.period || 'this month'} is ready`,
      html: baseHtmlLayout(`
        <h2>Invoice Ready 📄</h2>
        <p>Your invoice for <strong>${data.period || 'this period'}</strong> is ready.</p>
        <p><strong>Amount:</strong> ${amount}</p>
        <a href="${data.invoiceUrl || 'https://usra.plus'}" class="button">View Invoice</a>
      `, 'Your invoice is ready'),
      text: baseTextLayout(`Invoice Ready

Your invoice for ${data.period || 'this period'} is ready.

Amount: ${amount}

View Invoice: ${data.invoiceUrl || 'https://usra.plus'}`),
    }
  },

  // 14. Security: Login from New Device
  'security-login-new-device': (data) => {
    const device = String(data.device || 'Unknown device')
    const location = String(data.location || 'Unknown location')
    return {
      subject: 'New login to your USRA PLUS account',
      html: baseHtmlLayout(`
        <h2>New Login Detected 🔐</h2>
        <p>We detected a new login to your account:</p>
        <div class="info">
          <p><strong>Device:</strong> ${device}</p>
          <p><strong>Location:</strong> ${location}</p>
          <p><strong>Time:</strong> ${data.time || new Date().toLocaleString()}</p>
        </div>
        <p>If this was you, no action is needed.</p>
        <div class="warning">
          <p>If you did not make this login, please change your password immediately.</p>
        </div>
        <a href="${data.securityUrl || 'https://usra.plus'}" class="button">Review Security</a>
      `, 'New login to your account'),
      text: baseTextLayout(`New Login Detected

We detected a new login to your account:

Device: ${device}
Location: ${location}
Time: ${data.time || new Date().toLocaleString()}

If this was you, no action is needed.

If you did not make this login, please change your password immediately.

Review Security: ${data.securityUrl || 'https://usra.plus'}`),
    }
  },

  // 15. Security: Password Changed
  'security-password-changed': (data) => {
    return {
      subject: 'Your USRA PLUS password was changed',
      html: baseHtmlLayout(`
        <h2>Password Changed 🔑</h2>
        <p>Your USRA PLUS account password was successfully changed.</p>
        <div class="info">
          <p><strong>When:</strong> ${data.time || new Date().toLocaleString()}</p>
        </div>
        <div class="warning">
          <p>If you did not make this change, please contact support immediately.</p>
        </div>
      `, 'Your password was changed'),
      text: baseTextLayout(`Password Changed

Your USRA PLUS account password was successfully changed.

When: ${data.time || new Date().toLocaleString()}

If you did not make this change, please contact support immediately.`),
    }
  },

  // 16. Security: 2FA Enabled
  'security-two-factor-enabled': (data) => {
    return {
      subject: 'Two-factor authentication enabled',
      html: baseHtmlLayout(`
        <h2>2FA Enabled ✅</h2>
        <p>Two-factor authentication has been enabled on your account. Great job keeping your account secure!</p>
        <div class="success">
          <p>Your account is now protected with an extra layer of security.</p>
        </div>
      `, 'Two-factor authentication enabled'),
      text: baseTextLayout(`2FA Enabled

Two-factor authentication has been enabled on your account. Great job keeping your account secure!

Your account is now protected with an extra layer of security.`),
    }
  },

  // 17. Security: 2FA Disabled
  'security-two-factor-disabled': (data) => {
    return {
      subject: 'Two-factor authentication disabled',
      html: baseHtmlLayout(`
        <h2>2FA Disabled ⚠️</h2>
        <p>Two-factor authentication has been disabled on your account.</p>
        <div class="warning">
          <p>Your account is less secure without 2FA. We recommend re-enabling it.</p>
        </div>
        <p>If you did not make this change, please contact support immediately.</p>
      `, 'Two-factor authentication disabled'),
      text: baseTextLayout(`2FA Disabled

Two-factor authentication has been disabled on your account.

Your account is less secure without 2FA. We recommend re-enabling it.

If you did not make this change, please contact support immediately.`),
    }
  },

  // 18. Account Deactivation Warning
  'account-deactivation-warning': (data) => {
    const days = String(data.daysRemaining || '30')
    return {
      subject: `Your account will be deactivated in ${days} days`,
      html: baseHtmlLayout(`
        <h2>Account Deactivation Notice ⚠️</h2>
        <p>Your USRA PLUS account is scheduled for deactivation in <strong>${days} days</strong> due to inactivity.</p>
        <div class="warning">
          <p>After deactivation, your data will be preserved for 90 days before permanent deletion.</p>
        </div>
        <p>Sign in now to keep your account active.</p>
        <a href="${data.loginUrl || 'https://usra.plus'}" class="button">Sign In</a>
      `, `Account deactivation in ${days} days`),
      text: baseTextLayout(`Account Deactivation Notice

Your USRA PLUS account is scheduled for deactivation in ${days} days due to inactivity.

After deactivation, your data will be preserved for 90 days before permanent deletion.

Sign in now to keep your account active.

Sign In: ${data.loginUrl || 'https://usra.plus'}`),
    }
  },

  // 19. Account Deactivated
  'account-deactivated': (data) => {
    return {
      subject: 'Your USRA PLUS account has been deactivated',
      html: baseHtmlLayout(`
        <h2>Account Deactivated</h2>
        <p>Your USRA PLUS account has been deactivated.</p>
        <p>Your data will be preserved for <strong>90 days</strong> before permanent deletion.</p>
        <p>If you'd like to reactivate your account, you can still sign in within the 90-day window.</p>
        <a href="${data.loginUrl || 'https://usra.plus'}" class="button">Reactivate Account</a>
      `, 'Your account has been deactivated'),
      text: baseTextLayout(`Account Deactivated

Your USRA PLUS account has been deactivated.

Your data will be preserved for 90 days before permanent deletion.

If you'd like to reactivate your account, you can still sign in within the 90-day window.

Reactivate Account: ${data.loginUrl || 'https://usra.plus'}`),
    }
  },

  // 20. Data Export Ready
  'data-export-ready': (data) => {
    return {
      subject: 'Your data export is ready 📦',
      html: baseHtmlLayout(`
        <h2>Data Export Ready 📦</h2>
        <p>Your data export is ready for download.</p>
        <div class="info">
          <p><strong>Format:</strong> ${data.format || 'JSON'}</p>
          <p><strong>Size:</strong> ${data.size || 'N/A'}</p>
        </div>
        <p>This download link expires in <strong>24 hours</strong>.</p>
        <a href="${data.downloadUrl || 'https://usra.plus'}" class="button">Download Export</a>
      `, 'Your data export is ready'),
      text: baseTextLayout(`Data Export Ready

Your data export is ready for download.

Format: ${data.format || 'JSON'}
Size: ${data.size || 'N/A'}

This download link expires in 24 hours.

Download Export: ${data.downloadUrl || 'https://usra.plus'}`),
    }
  },

  // 21. Referral Invite
  'referral-invite': (data) => {
    const referrerName = String(data.referrerName || 'Someone')
    return {
      subject: `${referrerName} invited you to try USRA PLUS!`,
      html: baseHtmlLayout(`
        <h2>You're Invited! 🎁</h2>
        <p><strong>${referrerName}</strong> thinks you'd love USRA PLUS — the smart family finance app.</p>
        <div class="success">
          <p>Sign up using their referral link and get a special bonus!</p>
        </div>
        <a href="${data.referralUrl || 'https://usra.plus'}" class="button">Claim Your Bonus</a>
      `, `${referrerName} invited you to USRA PLUS`),
      text: baseTextLayout(`You're Invited!

${referrerName} thinks you'd love USRA PLUS — the smart family finance app.

Sign up using their referral link and get a special bonus!

Claim Your Bonus: ${data.referralUrl || 'https://usra.plus'}`),
    }
  },

  // 22. Referral Reward
  'referral-reward': (data) => {
    const reward = String(data.reward || 'a special bonus')
    return {
      subject: `You earned ${reward}! 🎉`,
      html: baseHtmlLayout(`
        <h2>Referral Reward Earned! 🎉</h2>
        <p>Congratulations! You've earned <strong>${reward}</strong> from your referral.</p>
        <div class="success">
          <p>Keep sharing USRA PLUS with friends and family to earn more rewards!</p>
        </div>
        <a href="${data.dashboardUrl || 'https://usra.plus'}" class="button">View Reward</a>
      `, `You earned ${reward}!`),
      text: baseTextLayout(`Referral Reward Earned!

Congratulations! You've earned ${reward} from your referral.

Keep sharing USRA PLUS with friends and family to earn more rewards!

View Reward: ${data.dashboardUrl || 'https://usra.plus'}`),
    }
  },
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Render an email template with the given data.
 * Returns the subject, HTML body, and plain-text body.
 *
 * @param template - The template to render
 * @param data - Data to inject into the template
 * @returns Rendered email with subject, html, and text
 */
export function renderTemplate(
  template: EmailTemplate,
  data: Record<string, unknown>
): RenderedEmail {
  const renderer = templateRenderers[template]

  if (!renderer) {
    console.warn(`[Email Templates] Unknown template: "${template}", using welcome as fallback`)
    return templateRenderers.welcome(data)
  }

  return renderer(data)
}

/**
 * Get a list of all available template names.
 */
export function getAvailableTemplates(): EmailTemplate[] {
  return Object.keys(templateRenderers) as EmailTemplate[]
}
