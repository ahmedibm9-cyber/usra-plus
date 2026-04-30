'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Shield, FileText, Scale } from 'lucide-react'
import { useI18n } from '@/i18n/use-translation'
import { useAuthStore } from '@/stores/auth-store'

export function TermsModal() {
  const { showTermsModal, setShowTermsModal } = useAuthStore()
  const { t, isRTL } = useI18n()
  const [hasScrolled, setHasScrolled] = useState(false)

  const handleAccept = () => {
    setShowTermsModal(false)
    setHasScrolled(false)
  }

  const handleDecline = () => {
    setShowTermsModal(false)
    setHasScrolled(false)
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop - clientHeight < 50) {
      setHasScrolled(true)
    }
  }

  const termsContent = isRTL ? {
    title: 'شروط الخدمة وسياسة الخصوصية',
    subtitle: 'USRA PLUS — آخر تحديث: 1 مارس 2026',
    sections: [
      {
        title: '1. قبول الشروط',
        content: `باستخدامك لمنصة USRA PLUS ("المنصة")، فإنك توافق على الالتزام بشروط الخدمة هذه ("الشروط"). إذا كنت لا توافق على أي جزء من هذه الشروط، يجب عليك التوقف عن استخدام المنصة فورًا. تستند هذه الشروط إلى الأنظمة واللوائح المعمول بها في المملكة العربية السعودية، بما في ذلك نظام المعاملات الإلكترونية ونظام حماية البيانات الشخصية.`
      },
      {
        title: '2. التعريفات',
        content: `"USRA PLUS" تعني المنصة الرقمية لإدارة وتنسيق شؤون العائلة، بما في ذلك تطبيقات الويب والهاتف المحمول وواجهات برمجة التطبيقات المرتبطة بها. "المستخدم" يعني أي فرد يقوم بإنشاء حساب أو استخدام المنصة. "العائلة" تعني مجموعة من المستخدمين المرتبطين ضمن نفس مساحة العمل العائلية. "المحتوى" يعني أي بيانات أو معلومات أو مواد يتم تحميلها أو إنشاؤها أو مشاركتها عبر المنصة.`
      },
      {
        title: '3. التسجيل والحسابات',
        content: `يجب أن يكون عمرك 18 عامًا على الأقل لإنشاء حساب. أنت مسؤول عن دقة المعلومات المقدمة أثناء التسجيل. يجب عليك الحفاظ على سرية بيانات اعتماد حسابك وعدم مشاركتها مع أي طرف ثالث. يجب عليك إبلاغنا فورًا عن أي استخدام غير مصرح به لحسابك. يحتفظ USRA PLUS بالحق في تعليق أو إنهاء الحسابات التي تنتهك هذه الشروط.`
      },
      {
        title: '4. الخصوصية وحماية البيانات',
        content: `نحن نلتزم بنظام حماية البيانات الشخصية الصادر بالمرسوم الملكي رقم م/29 وتاريخ 9/2/1443هـ في المملكة العربية السعودية. يتم تخزين البيانات ومعالجتها وفقًا لأعلى معايير الأمان. لن نشارك بياناتك الشخصية مع أطراف ثالثة إلا بموافقتك الصريحة أو كما يقتضي القانون. لديك الحق في الوصول إلى بياناتك وتصحيحها وحذفها وفقًا للأنظمة المعمول بها. نستخدم تقنيات التشفير المتقدمة لحماية بياناتك أثناء النقل والتخزين.`
      },
      {
        title: '5. خدمات المنصة',
        content: `توفر المنصة خدمات إدارة المهام والتقويم وقوائم البقالة والمحادثة العائلية وتبادل الملفات وميزات أخرى ذات صلة. نحن نسعى لتوفير المنصة على مدار الساعة ولكن لا نضمن التواصل دون انقطاع. نحتفظ بالحق في تعديل أو إيقاف أي ميزة من ميزات المنصة مع إشعار مسبق معقول.`
      },
      {
        title: '6. خطط الاشتراك والمدفوعات',
        content: `تقدم المنصة خطط اشتراك مجانية ومدفوعة. جميع الأسعار معروضة بالريال السعودي وتشمل ضريبة القيمة المضافة المعمول بها. يتم تجديد الاشتراكات تلقائيًا ما لم يتم إلغاؤها قبل نهاية الفترة الحالية. سياسة الاسترداد: يمكنك طلب استرداد كامل خلال 14 يومًا من تاريخ الشراء. المعاملات المالية تخضع لأنظمة مؤسسة النقد العربي السعودي.`
      },
      {
        title: '7. المحتوى والملكية الفكرية',
        content: `تحتفظ بملكية المحتوى الذي تنشئه وتشاركه على المنصة. بمنحك لنا ترخيصًا محدودًا لاستضافة وعرض ومعالجة محتواك لأغراض تقدي الخدمة. لا يجوز لك تحميل محتوى ينتهك حقوق الملكية الفكرية للآخرين. USRA PLUS وعناصره المرئية والتصميمية هي ملكية فكرية محمية بموجب الأنظمة السعودية والاتفاقيات الدولية.`
      },
      {
        title: '8. السلوك المقبول',
        content: `تتعهد باستخدام المنصة بشكل قانوني وأخلاقي ويتوافق مع الشريعة الإسلامية والأنظمة السعودية. يحظر استخدام المنصة لإرسال محتوى مسيء أو ضار أو غير قانوني. يحظر محاولة الوصول غير المصرح به إلى أنظمة المنصة أو حسابات المستخدمين الآخرين. يحظر استخدام أي أدوات آلية للوصول إلى المنصة دون إذن كتابي.`
      },
      {
        title: '9. الحد من المسؤولية',
        content: `تُقدم المنصة "كما هي" و"حسب التوفر" دون ضمانات من أي نوع. في الحد الأقصى المسموح به بموجب القانون السعودي، لا تكون مسؤوليتنا تجاهك أكبر من المبلغ الذي دفعته لنا خلال الأشهر الاثني عشر السابقة. لا نتحمل مسؤولية أي أضرار غير مباشرة أو عرضية أو تبعية ناشئة عن استخدام المنصة.`
      },
      {
        title: '10. تسوية المنازعات والقانون الحاكم',
        content: `تخضع هذه الشروط وتفسر وفقًا لأنظمة المملكة العربية السعودية. أي نزاع ينشأ عن هذه الشروط يحال أولاً إلى التسوية الودية، وفي حال تعذر ذلك، إلى المحاكم المختصة في مدينة الرياض. يجوز لك أيضًا رفع شكوى إلى الهيئة العامة للمنافسة أو أي جهة رقابية مختصة.`
      },
      {
        title: '11. التعديلات',
        content: `نحتفظ بالحق في تعديل هذه الشروط في أي وقت مع إشعار مسبق لا يقل عن 30 يومًا. استمرارك في استخدام المنصة بعد نشر التعديلات يُعد موافقة ضمنية على الشروط المعدلة. سيتم إخطارك بالتغييرات الجوهرية عبر البريد الإلكتروني أو إشعار داخل المنصة.`
      },
      {
        title: '12. الاتصال',
        content: `لأي استفسارات بخصوص شروط الخدمة، يمكنك التواصل معنا عبر: البريد الإلكتروني: legal@usraplus.com العنوان: الرياض، المملكة العربية السعودية.`
      }
    ]
  } : {
    title: 'Terms of Service & Privacy Policy',
    subtitle: 'USRA PLUS — Last Updated: March 1, 2026',
    sections: [
      {
        title: '1. Acceptance of Terms',
        content: `By accessing and using the USRA PLUS platform ("Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to any part of these terms, you must discontinue use of the Platform immediately. These Terms are governed by and construed in accordance with the laws and regulations applicable in the Kingdom of Saudi Arabia (KSA), including the Electronic Transactions Law and the Personal Data Protection Law.`
      },
      {
        title: '2. Definitions',
        content: `"USRA PLUS" means the digital platform for family coordination and household management, including web applications, mobile applications, and associated APIs. "User" means any individual who creates an account or uses the Platform. "Family" means a group of Users associated within the same family workspace. "Content" means any data, information, or materials uploaded, created, or shared through the Platform.`
      },
      {
        title: '3. Registration & Accounts',
        content: `You must be at least 18 years of age to create an account. You are responsible for the accuracy of information provided during registration. You must maintain the confidentiality of your account credentials and not share them with any third party. You must notify us immediately of any unauthorized use of your account. USRA PLUS reserves the right to suspend or terminate accounts that violate these Terms.`
      },
      {
        title: '4. Privacy & Data Protection',
        content: `We comply with the Personal Data Protection Law issued by Royal Decree No. M/29 dated 9/2/1443H in the Kingdom of Saudi Arabia. Data is stored and processed in accordance with the highest security standards. We will not share your personal data with third parties except with your explicit consent or as required by law. You have the right to access, correct, and delete your data in accordance with applicable regulations. We employ advanced encryption technologies to protect your data in transit and at rest.`
      },
      {
        title: '5. Platform Services',
        content: `The Platform provides task management, calendar, grocery lists, family chat, file sharing, and other related features. We strive to provide the Platform on a 24/7 basis but do not guarantee uninterrupted availability. We reserve the right to modify or discontinue any Platform feature with reasonable prior notice.`
      },
      {
        title: '6. Subscription Plans & Payments',
        content: `The Platform offers free and paid subscription plans. All prices are displayed in Saudi Riyals (SAR) and include applicable Value Added Tax (VAT). Subscriptions renew automatically unless cancelled before the end of the current period. Refund policy: You may request a full refund within 14 days of purchase. Financial transactions are subject to Saudi Central Bank (SAMA) regulations.`
      },
      {
        title: '7. Content & Intellectual Property',
        content: `You retain ownership of Content you create and share on the Platform. By uploading Content, you grant us a limited license to host, display, and process your Content for the purpose of providing the Service. You may not upload Content that infringes on the intellectual property rights of others. USRA PLUS and its visual and design elements are protected intellectual property under Saudi laws and international conventions.`
      },
      {
        title: '8. Acceptable Use',
        content: `You agree to use the Platform in a lawful, ethical manner consistent with Islamic Sharia principles and Saudi regulations. It is prohibited to use the Platform to send abusive, harmful, or illegal Content. It is prohibited to attempt unauthorized access to Platform systems or other Users' accounts. It is prohibited to use any automated tools to access the Platform without written permission.`
      },
      {
        title: '9. Limitation of Liability',
        content: `The Platform is provided "AS IS" and "AS AVAILABLE" without warranties of any kind. To the maximum extent permitted by Saudi law, our liability to you shall not exceed the amount you paid us in the twelve (12) months preceding the claim. We are not liable for any indirect, incidental, or consequential damages arising from the use of the Platform.`
      },
      {
        title: '10. Dispute Resolution & Governing Law',
        content: `These Terms are governed by and construed in accordance with the laws of the Kingdom of Saudi Arabia. Any dispute arising from these Terms shall first be referred to amicable settlement, and failing that, to the competent courts in the city of Riyadh. You may also file a complaint with the General Authority for Competition or any competent regulatory authority.`
      },
      {
        title: '11. Amendments',
        content: `We reserve the right to amend these Terms at any time with at least 30 days' prior notice. Your continued use of the Platform after the amendments are published constitutes implied acceptance of the amended Terms. You will be notified of material changes via email or in-Platform notification.`
      },
      {
        title: '12. Contact',
        content: `For any inquiries regarding these Terms of Service, you may contact us at: Email: legal@usraplus.com Address: Riyadh, Kingdom of Saudi Arabia.`
      }
    ]
  };

  return (
    <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
      <DialogContent
        className="border-white/[0.08] bg-[#0B0B0F] text-gray-200 sm:max-w-2xl rounded-2xl p-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Header with gradient accent */}
        <div className="relative bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-indigo-500/10 px-6 pt-6 pb-4">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent" />
          <DialogHeader className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <Scale className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-100">
                  {termsContent.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-400 mt-0.5">
                  {termsContent.subtitle}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Trust badges */}
          <div className="relative flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              PDPL Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-violet-400" />
              KSA Governed
            </span>
          </div>
        </div>

        <Separator className="bg-white/[0.06]" />

        {/* Scrollable content */}
        <ScrollArea className="h-[400px] px-6" onScroll={handleScroll}>
          <div className="py-4 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
            {termsContent.sections.map((section, index) => (
              <div key={index}>
                <h3 className="text-sm font-semibold text-indigo-300 mb-2">
                  {section.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-400 whitespace-pre-line">
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Separator className="bg-white/[0.06]" />

        {/* Footer with actions */}
        <DialogFooter className="px-6 py-4 flex-row items-center justify-between gap-3 sm:justify-between">
          <p className="text-xs text-gray-500 hidden sm:block">
            {isRTL
              ? (hasScrolled ? 'يمكنك الآن قبول الشروط' : 'يرجى قراءة الشروط بالكامل')
              : (hasScrolled ? 'You may now accept the terms' : 'Please read the terms in full')
            }
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              variant="ghost"
              onClick={handleDecline}
              className="flex-1 sm:flex-none text-gray-400 hover:text-gray-200 hover:bg-white/[0.05] rounded-xl"
            >
              {isRTL ? 'رفض' : 'Decline'}
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!hasScrolled}
              className="flex-1 sm:flex-none bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isRTL ? 'قبول الشروط' : 'Accept Terms'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
