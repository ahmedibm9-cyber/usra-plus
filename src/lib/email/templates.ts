/**
 * USRA PLUS Email Templates
 * 
 * Professional HTML email templates with bilingual support (English/Arabic).
 * Uses inline CSS for email client compatibility.
 * Brand colors: Teal #0D6B58, Emerald #10B981
 */

type Language = 'en' | 'ar'

const BRAND_NAME = 'USRA PLUS'
const BRAND_PRIMARY = '#0D6B58'
const BRAND_SECONDARY = '#10B981'
const BRAND_LIGHT = '#F0FDF9'
const BRAND_DARK = '#064E3B'
const TEXT_PRIMARY = '#1F2937'
const TEXT_SECONDARY = '#6B7280'
const BG_WHITE = '#FFFFFF'
const BG_BODY = '#F9FAFB'
const BORDER_COLOR = '#E5E7EB'

function getDirection(lang: Language): string {
  return lang === 'ar' ? 'rtl' : 'ltr'
}

function baseStyles(lang: Language): string {
  return `
    direction: ${getDirection(lang)};
    font-family: ${lang === 'ar' ? "'Segoe UI', Tahoma, 'Arial', sans-serif" : "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"};
    margin: 0;
    padding: 0;
    background-color: ${BG_BODY};
  `
}

function headerBlock(): string {
  return `
    <tr>
      <td style="background-color: ${BRAND_PRIMARY}; padding: 28px 40px; text-align: center;">
        <h1 style="margin: 0; color: ${BG_WHITE}; font-size: 28px; font-weight: 700; letter-spacing: 2px;">
          ${BRAND_NAME}
        </h1>
        <p style="margin: 6px 0 0; color: #A7F3D0; font-size: 13px; letter-spacing: 1px;">
          Family Management Platform
        </p>
      </td>
    </tr>
  `
}

function footerBlock(lang: Language): string {
  const manageAccount = lang === 'ar' ? 'إدارة الحساب' : 'Manage Account'
  const helpCenter = lang === 'ar' ? 'مركز المساعدة' : 'Help Center'
  const copyright = `&copy; ${new Date().getFullYear()} ${BRAND_NAME}. ${lang === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}`

  return `
    <tr>
      <td style="padding: 24px 40px; background-color: ${BG_WHITE}; border-top: 1px solid ${BORDER_COLOR}; text-align: center;">
        <p style="margin: 0 0 12px; font-size: 13px; color: ${TEXT_SECONDARY};">
          <a href="#" style="color: ${BRAND_PRIMARY}; text-decoration: none; margin: 0 12px;">${manageAccount}</a>
          <span style="color: ${BORDER_COLOR};">|</span>
          <a href="#" style="color: ${BRAND_PRIMARY}; text-decoration: none; margin: 0 12px;">${helpCenter}</a>
        </p>
        <p style="margin: 0; font-size: 12px; color: ${TEXT_SECONDARY};">
          ${copyright}
        </p>
      </td>
    </tr>
  `
}

function wrapBody(content: string, lang: Language): string {
  return `
    <!DOCTYPE html>
    <html lang="${lang}" dir="${getDirection(lang)}">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${BRAND_NAME}</title>
    </head>
    <body style="${baseStyles(lang)}">
      <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; width: 100%;">
        ${headerBlock()}
        <tr>
          <td style="padding: 32px 40px; background-color: ${BG_WHITE};">
            ${content}
          </td>
        </tr>
        ${footerBlock(lang)}
      </table>
    </body>
    </html>
  `
}

// ─── OTP Template ──────────────────────────────────────────────────────────────

export interface OTPTemplateData {
  code: string
  userName?: string
  language?: Language
}

export function otpTemplate(code: string, userName?: string, language: Language = 'en'): { html: string; text: string } {
  const isAr = language === 'ar'
  const greeting = userName
    ? (isAr ? `مرحباً ${userName}،` : `Hello ${userName},`)
    : (isAr ? 'مرحباً،' : 'Hello,')

  const subject = isAr ? 'رمز التحقق الخاص بك' : 'Your Verification Code'
  const instruction = isAr
    ? 'استخدم الرمز أدناه للتحقق من بريدك الإلكتروني. هذا الرمز صالح لمدة 10 دقائق فقط.'
    : 'Use the code below to verify your email address. This code expires in 10 minutes.'
  const ignoreNote = isAr
    ? 'إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان.'
    : 'If you didn\'t request this code, you can safely ignore this email.'

  const html = wrapBody(`
    <h2 style="margin: 0 0 16px; color: ${TEXT_PRIMARY}; font-size: 22px; font-weight: 600;">
      ${subject}
    </h2>
    <p style="margin: 0 0 24px; color: ${TEXT_SECONDARY}; font-size: 15px; line-height: 1.6;">
      ${greeting}<br>${instruction}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 24px; width: 100%;">
      <tr>
        <td style="background-color: ${BRAND_LIGHT}; border: 2px dashed ${BRAND_PRIMARY}; border-radius: 12px; padding: 24px; text-align: center;">
          <span style="font-size: 36px; font-weight: 700; color: ${BRAND_PRIMARY}; letter-spacing: 8px; font-family: 'Courier New', monospace;">
            ${code}
          </span>
        </td>
      </tr>
    </table>
    <p style="margin: 0; color: ${TEXT_SECONDARY}; font-size: 13px; line-height: 1.5;">
      ${ignoreNote}
    </p>
  `, language)

  const text = `${greeting}\n\n${instruction}\n\nYour code: ${code}\n\n${ignoreNote}`

  return { html, text }
}

// ─── Welcome Template ──────────────────────────────────────────────────────────

export interface WelcomeTemplateData {
  userName: string
  language?: Language
}

export function welcomeTemplate(userName: string, language: Language = 'en'): { html: string; text: string } {
  const isAr = language === 'ar'
  const greeting = isAr ? `مرحباً ${userName}! 🎉` : `Welcome ${userName}! 🎉`
  const subtitle = isAr
    ? 'شكراً لانضمامك إلى USRA PLUS — منصة إدارة العائلة الذكية.'
    : 'Thanks for joining USRA PLUS — the smart family management platform.'

  const tips = isAr
    ? [
        { icon: '👨‍👩‍👧‍👦', title: 'أنشئ عائلتك', desc: 'أضف أفراد العائلة وادعُهم للانضمام' },
        { icon: '📋', title: 'نظّم المهام', desc: 'أنشئ قوائم مهام وقسّم المسؤوليات' },
        { icon: '🛒', title: 'قائمة التسوق', desc: 'أنشئ قوائم تسوق مشتركة مع العائلة' },
        { icon: '📅', title: 'التقويم العائلي', desc: 'تتبع الأحداث والمناسبات المهمة' },
      ]
    : [
        { icon: '👨‍👩‍👧‍👦', title: 'Create Your Family', desc: 'Add family members and invite them to join' },
        { icon: '📋', title: 'Organize Tasks', desc: 'Create task lists and share responsibilities' },
        { icon: '🛒', title: 'Shopping Lists', desc: 'Build shared grocery lists with your family' },
        { icon: '📅', title: 'Family Calendar', desc: 'Track important events and occasions' },
      ]

  const ctaText = isAr ? 'ابدأ الآن' : 'Get Started'
  const ctaUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://usra-plus.vercel.app'

  const tipsHtml = tips.map(tip => `
    <tr>
      <td style="padding: 12px 0; vertical-align: top;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
          <tr>
            <td style="width: 48px; vertical-align: top; padding-top: 2px;">
              <span style="font-size: 28px;">${tip.icon}</span>
            </td>
            <td style="padding-${isAr ? 'right' : 'left'}: 12px;">
              <p style="margin: 0 0 4px; font-size: 15px; font-weight: 600; color: ${TEXT_PRIMARY};">${tip.title}</p>
              <p style="margin: 0; font-size: 13px; color: ${TEXT_SECONDARY};">${tip.desc}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('')

  const html = wrapBody(`
    <h2 style="margin: 0 0 8px; color: ${TEXT_PRIMARY}; font-size: 24px; font-weight: 600;">
      ${greeting}
    </h2>
    <p style="margin: 0 0 28px; color: ${TEXT_SECONDARY}; font-size: 15px; line-height: 1.6;">
      ${subtitle}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 28px;">
      ${tipsHtml}
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
      <tr>
        <td style="text-align: center;">
          <a href="${ctaUrl}" style="display: inline-block; background-color: ${BRAND_PRIMARY}; color: ${BG_WHITE}; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 16px; font-weight: 600;">
            ${ctaText}
          </a>
        </td>
      </tr>
    </table>
  `, language)

  const textTips = tips.map(tip => `- ${tip.icon} ${tip.title}: ${tip.desc}`).join('\n')
  const text = `${greeting}\n\n${subtitle}\n\n${textTips}\n\n${ctaText}: ${ctaUrl}`

  return { html, text }
}

// ─── Password Reset Template ───────────────────────────────────────────────────

export interface PasswordResetTemplateData {
  resetUrl: string
  language?: Language
}

export function passwordResetTemplate(resetUrl: string, language: Language = 'en'): { html: string; text: string } {
  const isAr = language === 'ar'
  const title = isAr ? 'إعادة تعيين كلمة المرور' : 'Reset Your Password'
  const instruction = isAr
    ? 'لقد تلقينا طلباً لإعادة تعيين كلمة مرورك. اضغط على الزر أدناه لإنشاء كلمة مرور جديدة.'
    : 'We received a request to reset your password. Click the button below to create a new password.'
  const expiry = isAr
    ? 'هذا الرابط صالح لمدة ساعة واحدة فقط. إذا انتهت صلاحيته، يمكنك طلب رابط جديد.'
    : 'This link expires in 1 hour. If it has expired, you can request a new one.'
  const ignoreNote = isAr
    ? 'إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان. لن يتم تغيير كلمة مرورك.'
    : 'If you didn\'t request a password reset, you can safely ignore this email. Your password will not be changed.'
  const ctaText = isAr ? 'إعادة تعيين كلمة المرور' : 'Reset Password'

  const html = wrapBody(`
    <h2 style="margin: 0 0 16px; color: ${TEXT_PRIMARY}; font-size: 22px; font-weight: 600;">
      ${title}
    </h2>
    <p style="margin: 0 0 24px; color: ${TEXT_SECONDARY}; font-size: 15px; line-height: 1.6;">
      ${instruction}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 20px;">
      <tr>
        <td style="text-align: center;">
          <a href="${resetUrl}" style="display: inline-block; background-color: ${BRAND_PRIMARY}; color: ${BG_WHITE}; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 16px; font-weight: 600;">
            ${ctaText}
          </a>
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 12px; color: ${TEXT_SECONDARY}; font-size: 13px; line-height: 1.5;">
      ${expiry}
    </p>
    <p style="margin: 0; padding: 16px; background-color: #FEF3C7; border-radius: 8px; font-size: 13px; color: #92400E; line-height: 1.5;">
      ${ignoreNote}
    </p>
  `, language)

  const text = `${title}\n\n${instruction}\n\n${ctaText}: ${resetUrl}\n\n${expiry}\n\n${ignoreNote}`

  return { html, text }
}

// ─── Subscription Confirmation Template ────────────────────────────────────────

export interface SubscriptionConfirmationTemplateData {
  planName: string
  amount: string
  language?: Language
}

export function subscriptionConfirmationTemplate(planName: string, amount: string, language: Language = 'en'): { html: string; text: string } {
  const isAr = language === 'ar'
  const title = isAr ? 'تأكيد الاشتراك' : 'Subscription Confirmed'
  const congrats = isAr
    ? 'تهانينا! تم تفعيل اشتراكك بنجاح.'
    : 'Congratulations! Your subscription has been activated successfully.'
  const planLabel = isAr ? 'الخطة' : 'Plan'
  const amountLabel = isAr ? 'المبلغ' : 'Amount'
  const statusLabel = isAr ? 'الحالة' : 'Status'
  const activeLabel = isAr ? 'نشط ✅' : 'Active ✅'
  const nextSteps = isAr
    ? 'يمكنك الآن الاستمتاع بجميع ميزات الخطة. قم بزيارة لوحة التحكم لاستكشاف الميزات الجديدة.'
    : 'You can now enjoy all the features of your plan. Visit your dashboard to explore new features.'

  const html = wrapBody(`
    <h2 style="margin: 0 0 16px; color: ${TEXT_PRIMARY}; font-size: 22px; font-weight: 600;">
      ${title}
    </h2>
    <p style="margin: 0 0 24px; color: ${TEXT_SECONDARY}; font-size: 15px; line-height: 1.6;">
      ${congrats}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px; border: 1px solid ${BORDER_COLOR}; border-radius: 12px; overflow: hidden;">
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid ${BORDER_COLOR}; background-color: ${BRAND_LIGHT};">
          <p style="margin: 0; font-size: 13px; color: ${TEXT_SECONDARY};">${planLabel}</p>
          <p style="margin: 4px 0 0; font-size: 18px; font-weight: 600; color: ${BRAND_PRIMARY};">${planName}</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid ${BORDER_COLOR};">
          <p style="margin: 0; font-size: 13px; color: ${TEXT_SECONDARY};">${amountLabel}</p>
          <p style="margin: 4px 0 0; font-size: 18px; font-weight: 600; color: ${TEXT_PRIMARY};">${amount}</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 20px;">
          <p style="margin: 0; font-size: 13px; color: ${TEXT_SECONDARY};">${statusLabel}</p>
          <p style="margin: 4px 0 0; font-size: 18px; font-weight: 600; color: ${BRAND_SECONDARY};">${activeLabel}</p>
        </td>
      </tr>
    </table>
    <p style="margin: 0; color: ${TEXT_SECONDARY}; font-size: 14px; line-height: 1.6;">
      ${nextSteps}
    </p>
  `, language)

  const text = `${title}\n\n${congrats}\n\n${planLabel}: ${planName}\n${amountLabel}: ${amount}\n${statusLabel}: ${activeLabel}\n\n${nextSteps}`

  return { html, text }
}

// ─── Payment Failed Template ───────────────────────────────────────────────────

export interface PaymentFailedTemplateData {
  planName: string
  language?: Language
}

export function paymentFailedTemplate(planName: string, language: Language = 'en'): { html: string; text: string } {
  const isAr = language === 'ar'
  const title = isAr ? 'فشل عملية الدفع' : 'Payment Failed'
  const message = isAr
    ? `لم نتمكن من معالجة الدفع لخطة ${planName}. لا تقلق — لا يزال بإمكانك تحديث طريقة الدفع الخاصة بك.`
    : `We were unable to process the payment for your ${planName} plan. Don't worry — you can still update your payment method.`
  const retryInstruction = isAr
    ? 'يرجى تحديث طريقة الدفع الخاصة بك لتجنب انقطاع الخدمة. سيتم إعادة محاولة الدفع تلقائياً خلال 3 أيام.'
    : 'Please update your payment method to avoid service interruption. We\'ll automatically retry the payment in 3 days.'
  const ctaText = isAr ? 'تحديث طريقة الدفع' : 'Update Payment Method'
  const ctaUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://usra-plus.vercel.app'}/settings/billing`

  const html = wrapBody(`
    <h2 style="margin: 0 0 16px; color: #DC2626; font-size: 22px; font-weight: 600;">
      ⚠️ ${title}
    </h2>
    <p style="margin: 0 0 20px; color: ${TEXT_SECONDARY}; font-size: 15px; line-height: 1.6;">
      ${message}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 20px;">
      <tr>
        <td style="padding: 16px; background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px; color: #991B1B; line-height: 1.5;">
            ${retryInstruction}
          </p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
      <tr>
        <td style="text-align: center;">
          <a href="${ctaUrl}" style="display: inline-block; background-color: ${BRAND_PRIMARY}; color: ${BG_WHITE}; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 16px; font-weight: 600;">
            ${ctaText}
          </a>
        </td>
      </tr>
    </table>
  `, language)

  const text = `${title}\n\n${message}\n\n${retryInstruction}\n\n${ctaText}: ${ctaUrl}`

  return { html, text }
}

// ─── Trial Ending Template ─────────────────────────────────────────────────────

export interface TrialEndingTemplateData {
  daysLeft: number
  planName: string
  language?: Language
}

export function trialEndingTemplate(daysLeft: number, planName: string, language: Language = 'en'): { html: string; text: string } {
  const isAr = language === 'ar'
  const title = isAr
    ? `تنتهي فترة التجربة خلال ${daysLeft} ${daysLeft === 1 ? 'يوم' : 'أيام'}`
    : `Trial Ending in ${daysLeft} Day${daysLeft === 1 ? '' : 's'}`
  const message = isAr
    ? `ستنتهي فترة التجربة المجانية لخطة ${planName} قريباً. قم بالترقية الآن للاستمرار في الاستمتاع بجميع الميزات.`
    : `Your free trial for the ${planName} plan is ending soon. Upgrade now to keep enjoying all features.`
  const ctaText = isAr ? 'ترقية الآن' : 'Upgrade Now'
  const ctaUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://usra-plus.vercel.app'}/settings/billing`
  const benefitsTitle = isAr ? 'ما ستفقده:' : 'What you\'ll miss:'
  const benefits = isAr
    ? ['مهام غير محدودة', 'خطط وجبات ذكية بالذكاء الاصطناعي', 'تخزين سحابي أكبر', 'دعم أولوية']
    : ['Unlimited tasks', 'AI-powered meal plans', 'More cloud storage', 'Priority support']

  const benefitsHtml = benefits.map(b => `
    <li style="margin-bottom: 6px; font-size: 14px; color: ${TEXT_PRIMARY}; padding-${isAr ? 'right' : 'left'}: 4px;">
      ${b}
    </li>
  `).join('')

  const html = wrapBody(`
    <h2 style="margin: 0 0 16px; color: ${BRAND_PRIMARY}; font-size: 22px; font-weight: 600;">
      ⏰ ${title}
    </h2>
    <p style="margin: 0 0 24px; color: ${TEXT_SECONDARY}; font-size: 15px; line-height: 1.6;">
      ${message}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px; background-color: ${BRAND_LIGHT}; border: 1px solid #A7F3D0; border-radius: 8px;">
          <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: ${BRAND_DARK};">
            ${benefitsTitle}
          </p>
          <ul style="margin: 0; padding-${isAr ? 'right' : 'left'}: 20px;">
            ${benefitsHtml}
          </ul>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%;">
      <tr>
        <td style="text-align: center;">
          <a href="${ctaUrl}" style="display: inline-block; background-color: ${BRAND_SECONDARY}; color: ${BG_WHITE}; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 16px; font-weight: 600;">
            ${ctaText}
          </a>
        </td>
      </tr>
    </table>
  `, language)

  const text = `${title}\n\n${message}\n\n${benefitsTitle}\n${benefits.map(b => `- ${b}`).join('\n')}\n\n${ctaText}: ${ctaUrl}`

  return { html, text }
}
