'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  Divider,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  Shield,
  Description,
  Balance,
  ExpandMore,
  CheckCircle,
  Error as ErrorOutline,
} from '@mui/icons-material'
import { useI18n } from '@/i18n/use-translation'
import { useAuthStore } from '@/stores/auth-store'
import { motion, AnimatePresence } from 'framer-motion'

export function TermsModal() {
  const { showTermsModal, setShowTermsModal } = useAuthStore()
  const { t, isRTL } = useI18n()
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [scrollPercent, setScrollPercent] = useState(0)
  const [modalKey, setModalKey] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reset state when modal opens by changing the key
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setHasScrolledToBottom(false)
      setScrollPercent(0)
      setModalKey(prev => prev + 1)
    }
    setShowTermsModal(open)
  }

  const handleAccept = () => {
    setShowTermsModal(false)
    setTimeout(() => {
      setHasScrolledToBottom(false)
      setScrollPercent(0)
    }, 300)
  }

  const handleDecline = () => {
    setShowTermsModal(false)
    setTimeout(() => {
      setHasScrolledToBottom(false)
      setScrollPercent(0)
    }, 300)
  }

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const scrollableHeight = scrollHeight - clientHeight
    if (scrollableHeight <= 0) {
      setScrollPercent(100)
      setHasScrolledToBottom(true)
      return
    }
    const percent = Math.round((scrollTop / scrollableHeight) * 100)
    setScrollPercent(percent)
    if (scrollHeight - scrollTop - clientHeight < 30) {
      setHasScrolledToBottom(true)
    }
  }, [])

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
    <Dialog
      open={showTermsModal}
      onClose={() => handleOpenChange(false)}
      key={modalKey}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
            m: { xs: 1, sm: 2 },
            maxHeight: '90vh',
          },
        },
      }}
    >
      {/* Header with teal/amber gradient accent */}
      <DialogTitle
        sx={{
          m: 0,
          p: 3,
          pb: 2,
          bgcolor: 'primary.light',
          background: 'linear-gradient(90deg, rgba(13,107,88,0.08), rgba(217,119,6,0.04), rgba(13,107,88,0.08))',
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'primary.light',
              border: '1px solid',
              borderColor: 'rgba(13,107,88,0.2)',
              flexShrink: 0,
            }}
          >
            <Balance sx={{ fontSize: 24, color: 'primary.main' }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
              {termsContent.title}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
              {termsContent.subtitle}
            </Typography>
          </Box>
        </Stack>

        {/* Trust badges */}
        <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
          <Stack
            direction="row"
            spacing={0.75}
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              alignItems: 'center',
            }}
          >
            <Shield sx={{ fontSize: 14, color: 'secondary.main' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>PDPL Compliant</Typography>
          </Stack>
          <Stack
            direction="row"
            spacing={0.75}
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              alignItems: 'center',
            }}
          >
            <Description sx={{ fontSize: 14, color: 'secondary.main' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>KSA Governed</Typography>
          </Stack>
        </Stack>
      </DialogTitle>

      <Divider />

      {/* Scroll progress indicator */}
      <Box sx={{ px: 3, pt: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ flex: 1 }}>
          <LinearProgress
            variant="determinate"
            value={scrollPercent}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                bgcolor: hasScrolledToBottom ? 'primary.main' : undefined,
                backgroundImage: hasScrolledToBottom
                  ? undefined
                  : 'linear-gradient(90deg, #0D6B58, #059669)',
              },
            }}
          />
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontWeight: 500,
            minWidth: 36,
            textAlign: 'right',
            fontFamily: '"JetBrains Mono", monospace',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {scrollPercent}%
        </Typography>
      </Box>

      {/* Mandatory reading notice */}
      <AnimatePresence mode="wait">
        {!hasScrolledToBottom ? (
          <motion.div
            key="scroll-notice"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                mx: 3,
                mt: 1,
                px: 1.5,
                py: 1,
                borderRadius: 2,
                bgcolor: 'secondary.light',
                border: '1px solid',
                borderColor: 'rgba(217,119,6,0.2)',
                alignItems: 'center',
              }}
            >
              <ErrorOutline sx={{ fontSize: 16, color: 'secondary.main', flexShrink: 0 }} />
              <Typography variant="caption" sx={{ color: 'secondary.dark' }}>
                {isRTL
                  ? 'يرجى قراءة جميع الشروط بالكامل حتى تتمكن من قبولها'
                  : 'Please read all terms in full before you can accept'}
              </Typography>
            </Stack>
          </motion.div>
        ) : (
          <motion.div
            key="ready-notice"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{
                mx: 3,
                mt: 1,
                px: 1.5,
                py: 1,
                borderRadius: 2,
                bgcolor: 'primary.light',
                border: '1px solid',
                borderColor: 'rgba(13,107,88,0.2)',
                alignItems: 'center',
              }}
            >
              <CheckCircle sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
              <Typography variant="caption" sx={{ color: 'primary.dark' }}>
                {isRTL
                  ? 'يمكنك الآن قبول الشروط'
                  : 'You have read all terms — you may now accept'}
              </Typography>
            </Stack>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable content */}
      <DialogContent
        ref={scrollRef}
        onScroll={handleScroll}
        sx={{
          height: 400,
          overflowY: 'auto',
          scrollBehavior: 'smooth',
          px: 3,
          py: 2,
          '&::-webkit-scrollbar': {
            width: 6,
          },
          '&::-webkit-scrollbar-track': {
            bgcolor: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'action.disabled',
            borderRadius: 3,
          },
        }}
      >
        <Box sx={{ py: 1 }} dir={isRTL ? 'rtl' : 'ltr'}>
          {termsContent.sections.map((section, index) => (
            <Box key={index} sx={{ mb: 2.5 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.75 }}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: 1,
                    bgcolor: 'primary.light',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, color: 'primary.main' }}>
                    {index + 1}
                  </Typography>
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {section.title.replace(/^\d+\.\s*/, '')}
                </Typography>
              </Stack>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.8,
                  whiteSpace: 'pre-line',
                  pl: 3.5,
                }}
              >
                {section.content}
              </Typography>
            </Box>
          ))}
        </Box>
      </DialogContent>

      {/* Scroll down hint */}
      <AnimatePresence>
        {!hasScrolledToBottom && scrollPercent < 10 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
          >
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ py: 0.5, color: 'text.secondary', alignItems: 'center', justifyContent: 'center' }}
            >
              <ExpandMore sx={{ fontSize: 14, animation: 'bounce 1s infinite' }} />
              <Typography variant="caption">
                {isRTL ? 'مرر للأسفل لقراءة المزيد' : 'Scroll down to read more'}
              </Typography>
            </Stack>
          </motion.div>
        )}
      </AnimatePresence>

      <Divider />

      {/* Footer with actions */}
      <DialogActions
        sx={{
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {hasScrolledToBottom ? (
            <CheckCircle sx={{ fontSize: 16, color: 'primary.main' }} />
          ) : (
            <Box sx={{ width: 16, height: 16, borderRadius: '50%', border: 2, borderColor: 'divider' }} />
          )}
          <Typography variant="caption" sx={{ color: 'text.secondary' }} className="hidden sm:block">
            {hasScrolledToBottom
              ? (isRTL ? 'تمت قراءة جميع الشروط' : 'All terms read')
              : (isRTL
                ? `${Math.min(scrollPercent, 99)}% مقروء — يجب قراءة الكل للقبول`
                : `${Math.min(scrollPercent, 99)}% read — must read all to accept`)
            }
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <Button
            onClick={handleDecline}
            sx={{
              color: 'text.secondary',
              borderRadius: 2,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {isRTL ? 'رفض' : 'Decline'}
          </Button>
          <Button
            onClick={handleAccept}
            variant="contained"
            disabled={!hasScrolledToBottom}
            sx={{
              borderRadius: 2,
              fontWeight: 600,
              '&.Mui-disabled': {
                opacity: 0.3,
              },
            }}
          >
            {hasScrolledToBottom
              ? (isRTL ? 'قبول الشروط ✓' : 'Accept Terms ✓')
              : (isRTL ? 'اقرأ الكل أولاً' : 'Read All First')
            }
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  )
}
