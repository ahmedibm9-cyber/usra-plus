import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminAuth } from '@/lib/admin-auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { db } from '@/lib/db'

// Content Management API
// Stores Terms of Service, Privacy Policy, and App Branding in SystemSetting table

const CONTENT_KEYS = [
  'terms_of_service_en',
  'terms_of_service_ar',
  'privacy_policy_en',
  'privacy_policy_ar',
  'app_branding',
  'app_config',
  'email_templates',
]

// Default content for first-time setup
const DEFAULT_CONTENT: Record<string, string> = {
  terms_of_service_en: JSON.stringify({
    title: 'Terms of Service',
    lastUpdated: new Date().toISOString().split('T')[0],
    sections: [
      { heading: '1. Acceptance of Terms', body: 'By accessing and using USRA PLUS, you accept and agree to be bound by these terms and conditions.' },
      { heading: '2. Description of Service', body: 'USRA PLUS is a family management application that helps families organize tasks, groceries, calendars, and communication.' },
      { heading: '3. User Accounts', body: 'You must create an account to use our services. You are responsible for maintaining the confidentiality of your account credentials.' },
      { heading: '4. Acceptable Use', body: 'You agree not to misuse the service or help anyone else do so. You will not use the service for any illegal or unauthorized purpose.' },
      { heading: '5. Privacy', body: 'Your privacy is important to us. Our Privacy Policy explains how we collect, use, and disclose your information.' },
      { heading: '6. Termination', body: 'We may terminate or suspend your account if you violate these Terms of Service.' },
      { heading: '7. Limitation of Liability', body: 'USRA PLUS shall not be liable for any indirect, incidental, special, or consequential damages.' },
      { heading: '8. Changes to Terms', body: 'We may update these terms from time to time. We will notify you of any material changes.' },
    ],
  }),
  terms_of_service_ar: JSON.stringify({
    title: 'شروط الخدمة',
    lastUpdated: new Date().toISOString().split('T')[0],
    sections: [
      { heading: '١. قبول الشروط', body: 'بالوصول إلى和使用 USRA PLUS، فإنك تقبل وتوافق على الالتزام بهذه الشروط والأحكام.' },
      { heading: '٢. وصف الخدمة', body: 'USRA PLUS هو تطبيق إدارة عائلية يساعد العائلات في تنظيم المهام والبقالة والتقويم والتواصل.' },
      { heading: '٣. حسابات المستخدمين', body: 'يجب عليك إنشاء حساب لاستخدام خدماتنا. أنت مسؤول عن الحفاظ على سرية بيانات حسابك.' },
      { heading: '٤. الاستخدام المقبول', body: 'توافق على عدم إساءة استخدام الخدمة أو مساعدة أي شخص آخر في القيام بذلك.' },
      { heading: '٥. الخصوصية', body: 'خصوصيتك مهمة بالنسبة لنا. تشرح سياسة الخصوصية الخاصة بنا كيفية جمع معلوماتك واستخدامها والكشف عنها.' },
      { heading: '٦. الإنهاء', body: 'يجوز لنا إنهاء أو تعليق حسابك إذا انتهكت شروط الخدمة هذه.' },
      { heading: '٧. حدود المسؤولية', body: 'لن يكون USRA PLUS مسؤولاً عن أي أضرار غير مباشرة أو عرضية أو خاصة أو تبعية.' },
      { heading: '٨. التغييرات على الشروط', body: 'قد نقوم بتحديث هذه الشروط من وقت لآخر. سنخطرك بأي تغييرات جوهرية.' },
    ],
  }),
  privacy_policy_en: JSON.stringify({
    title: 'Privacy Policy',
    lastUpdated: new Date().toISOString().split('T')[0],
    sections: [
      { heading: '1. Information We Collect', body: 'We collect information you provide directly, such as your name, email, and family details.' },
      { heading: '2. How We Use Information', body: 'We use your information to provide, maintain, and improve our services.' },
      { heading: '3. Information Sharing', body: 'We do not sell your personal information to third parties.' },
      { heading: '4. Data Security', body: 'We implement appropriate security measures to protect your personal information.' },
      { heading: '5. Your Rights', body: 'You have the right to access, correct, or delete your personal information.' },
      { heading: '6. PDPL Compliance', body: 'We comply with the Kingdom of Saudi Arabia Personal Data Protection Law (PDPL).' },
      { heading: '7. Contact Us', body: 'If you have questions about this Privacy Policy, please contact us.' },
    ],
  }),
  privacy_policy_ar: JSON.stringify({
    title: 'سياسة الخصوصية',
    lastUpdated: new Date().toISOString().split('T')[0],
    sections: [
      { heading: '١. المعلومات التي نجمعها', body: 'نجمع المعلومات التي تقدمها مباشرة، مثل اسمك وبريدك الإلكتروني وتفاصيل عائلتك.' },
      { heading: '٢. كيف نستخدم المعلومات', body: 'نستخدم معلوماتك لتقديم خدماتنا وصيانتها وتحسينها.' },
      { heading: '٣. مشاركة المعلومات', body: 'لا نبيع معلوماتك الشخصية لأطراف ثالثة.' },
      { heading: '٤. أمان البيانات', body: 'نتخذ تدابير أمنية مناسبة لحماية معلوماتك الشخصية.' },
      { heading: '٥. حقوقك', body: 'لديك الحق في الوصول إلى معلوماتك الشخصية أو تصحيحها أو حذفها.' },
      { heading: '٦. الامتثال لنظام حماية البيانات الشخصية', body: 'نلتزم بنظام حماية البيانات الشخصية في المملكة العربية السعودية.' },
      { heading: '٧. اتصل بنا', body: 'إذا كان لديك أسئلة حول سياسة الخصوصية هذه، يرجى الاتصال بنا.' },
    ],
  }),
  app_branding: JSON.stringify({
    appName: 'USRA PLUS',
    tagline: 'Your Family, Organized',
    taglineAr: 'عائلتك، منظمة',
    primaryColor: '#10B981',
    secondaryColor: '#14B8A6',
    logoUrl: '',
    faviconUrl: '',
    darkModeDefault: true,
  }),
  app_config: JSON.stringify({
    registrationEnabled: true,
    googleOAuthEnabled: false,
    maintenanceMode: false,
    maintenanceMessageEn: 'We are currently performing maintenance. Please check back shortly.',
    maintenanceMessageAr: 'نقوم حالياً بإجراء صيانة. يرجى العودة قريباً.',
    maxFamilyMembers: 10,
    maxFamiliesPerUser: 3,
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'ar'],
    maxFileUploadMB: 25,
  }),
  email_templates: JSON.stringify({
    welcomeSubject: 'Welcome to USRA PLUS!',
    welcomeBody: 'Hello {{name}},\n\nWelcome to USRA PLUS! We\'re excited to have you on board.\n\nBest regards,\nThe USRA PLUS Team',
    passwordResetSubject: 'Reset Your USRA PLUS Password',
    passwordResetBody: 'Hello {{name}},\n\nClick the link below to reset your password:\n{{resetLink}}\n\nIf you didn\'t request this, please ignore this email.',
    invitationSubject: 'You\'re Invited to Join a Family on USRA PLUS',
    invitationBody: 'Hello,\n\n{{inviterName}} has invited you to join their family on USRA PLUS.\n\nClick the link below to accept:\n{{inviteLink}}',
  }),
}

// GET: Retrieve all content settings
export async function GET(request: NextRequest) {

  try {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const settings = await db.systemSetting.findMany({
      where: { key: { in: CONTENT_KEYS } },
    })

    const content: Record<string, unknown> = {}
    for (const key of CONTENT_KEYS) {
      const setting = settings.find(s => s.key === key)
      if (setting) {
        try {
          content[key] = JSON.parse(String(setting.value))
        } catch {
          content[key] = setting.value
        }
      } else {
        // Return default content for missing keys
        try {
          content[key] = JSON.parse(DEFAULT_CONTENT[key])
        } catch {
          content[key] = DEFAULT_CONTENT[key]
        }
      }
    }

    return NextResponse.json({ source: 'live', content })
  } catch (error) {
    console.error('[Admin Content API] Error:', error)
    return NextResponse.json({
      source: 'live',
      content: Object.fromEntries(
        CONTENT_KEYS.map(key => {
          try { return [key, JSON.parse(DEFAULT_CONTENT[key])] }
          catch { return [key, DEFAULT_CONTENT[key]] }
        })
      ),
    })
  }

  } catch (error) {

    console.error('[src.app.api.admin.content] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}

// PUT: Update content settings
export async function PUT(request: NextRequest) {

  try {
  const rateLimitResponse = applyRateLimit(request, RATE_LIMITS.ADMIN_API)
  if (rateLimitResponse) return rateLimitResponse

  const auth = verifyAdminAuth(request)
  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (auth.admin?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only super_admin can edit content' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const updates: Array<{ key: string; value: string }> = []

  for (const key of CONTENT_KEYS) {
    if (body[key] !== undefined) {
      updates.push({
        key,
        value: typeof body[key] === 'string' ? body[key] : JSON.stringify(body[key]),
      })
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No valid content keys provided' }, { status: 400 })
  }

  try {
    for (const update of updates) {
      await db.systemSetting.upsert({
        where: { key: update.key },
        update: { value: String(update.value) },
        create: { key: update.key, value: String(update.value) },
      })
    }

    return NextResponse.json({
      source: 'live',
      success: true,
      updatedKeys: updates.map(u => u.key),
      message: `${updates.length} content item(s) updated`,
    })
  } catch (error) {
    console.error('[Admin Content API] Update error:', error)
    return NextResponse.json({ error: 'Failed to update content' }, { status: 500 })
  }

  } catch (error) {

    console.error('[src.app.api.admin.content] Error:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {

      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  }

}
