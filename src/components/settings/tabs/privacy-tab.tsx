'use client'

import React, { useState, useCallback } from 'react'
import {
  Download,
  Trash2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Clock,
  Mail,
  ChevronRight,
  FileJson,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

import { useI18n } from '@/i18n/use-translation'

import { SectionCard, SectionTitle, SectionDescription } from '../settings-helpers'

export function PrivacyTab() {
  const { isRTL } = useI18n()
  const [exporting, setExporting] = useState(false)
  const [consents, setConsents] = useState<Array<{ type: string; granted: boolean; createdAt: string }>>([])
  const [loadingConsents, setLoadingConsents] = useState(false)

  // Fetch consent history on mount
  React.useEffect(() => {
    const fetchConsents = async () => {
      setLoadingConsents(true)
      try {
        const res = await fetch('/api/consent')
        if (res.ok) {
          const data = await res.json()
          setConsents(data.consents ?? [])
        }
      } catch {
        // Non-blocking
      } finally {
        setLoadingConsents(false)
      }
    }
    fetchConsents()
  }, [])

  const handleExportData = useCallback(async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/user/export')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Export failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `usra-plus-data-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(isRTL ? 'تم تصدير بياناتك بنجاح' : 'Your data has been exported successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (isRTL ? 'فشل التصدير' : 'Export failed'))
    } finally {
      setExporting(false)
    }
  }, [isRTL])

  const handleUpdateConsent = useCallback(async (type: string, granted: boolean) => {
    try {
      const res = await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, granted, version: '1.0' }),
      })
      if (!res.ok) throw new Error('Failed to update consent')
      toast.success(isRTL ? 'تم تحديث التفضيل' : 'Preference updated')
      // Refresh consent list
      const fetchRes = await fetch('/api/consent')
      if (fetchRes.ok) {
        const data = await fetchRes.json()
        setConsents(data.consents ?? [])
      }
    } catch {
      toast.error(isRTL ? 'فشل التحديث' : 'Failed to update')
    }
  }, [isRTL])

  // Group consents by type
  const latestConsents = consents.reduce<Record<string, { type: string; granted: boolean; createdAt: string }>>((acc, c) => {
    if (!acc[c.type]) acc[c.type] = c
    return acc
  }, {})

  const consentTypes = [
    { type: 'terms', labelEn: 'Terms of Service', labelAr: 'شروط الخدمة' },
    { type: 'privacy', labelEn: 'Privacy Policy', labelAr: 'سياسة الخصوصية' },
    { type: 'marketing', labelEn: 'Marketing Communications', labelAr: 'التواصل التسويقي' },
    { type: 'cookies', labelEn: 'Cookie Consent', labelAr: 'موافقة ملفات تعريف الارتباط' },
  ]

  return (
    <div className="space-y-6">
      {/* Legal Documents */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <FileJson className="size-4 text-primary" />
            {isRTL ? 'الوثائق القانونية' : 'Legal Documents'}
          </span>
        </SectionTitle>
        <SectionDescription>
          {isRTL ? 'الوصول إلى سياسة الخصوصية وشروط الخدمة وسياسة ملفات تعريف الارتباط' : 'Access our Privacy Policy, Terms of Service, and Cookie Policy'}
        </SectionDescription>

        <div className="space-y-2">
          {[
            { type: 'privacy', labelEn: 'Privacy Policy', labelAr: 'سياسة الخصوصية', descEn: 'How we collect, use, and protect your data (GDPR & PDPL compliant)', descAr: 'كيفية جمع واستخدام وحماية بياناتك (متوافق مع GDPR و PDPL)' },
            { type: 'terms', labelEn: 'Terms of Service', labelAr: 'شروط الخدمة', descEn: 'Terms and conditions for using USRA PLUS', descAr: 'الشروط والأحكام لاستخدام USRA PLUS' },
            { type: 'cookies', labelEn: 'Cookie Policy', labelAr: 'سياسة ملفات تعريف الارتباط', descEn: 'How we use cookies and tracking technologies', descAr: 'كيفية استخدامنا لملفات تعريف الارتباط وتقنيات التتبع' },
          ].map((doc) => (
            <a
              key={doc.type}
              href={`/api/legal?type=${doc.type}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border hover:bg-primary-container transition-all duration-150 cursor-pointer group"
            >
              <div className="size-9 rounded-lg bg-teal-600/10 flex items-center justify-center">
                <FileJson className="size-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-medium">
                  {isRTL ? doc.labelAr : doc.labelEn}
                </p>
                <p className="text-muted-foreground text-xs">
                  {isRTL ? doc.descAr : doc.descEn}
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
          ))}
        </div>
      </SectionCard>

      {/* Data Export */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Download className="size-4 text-primary" />
            {isRTL ? 'تصدير البيانات' : 'Data Export'}
          </span>
        </SectionTitle>
        <SectionDescription>
          {isRTL ? 'قم بتنزيل نسخة من جميع بياناتك الشخصية (متوافق مع GDPR/PDPL)' : 'Download a copy of all your personal data (GDPR/PDPL compliant)'}
        </SectionDescription>

        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
          <div>
            <p className="text-foreground text-sm font-medium">
              {isRTL ? 'تصدير بياناتي' : 'Export My Data'}
            </p>
            <p className="text-muted-foreground text-xs">
              {isRTL ? 'ملف JSON يحتوي على جميع بياناتك' : 'JSON file containing all your data'}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleExportData}
            disabled={exporting}
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
          >
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {isRTL ? 'تصدير' : 'Export'}
          </Button>
        </div>

        <p className="text-muted-foreground text-[10px] mt-2">
          {isRTL ? 'محدود بطلب واحد في الساعة. البيانات تشمل: الملف الشخصي، الجلسات، الاشتراكات، العائلة، القسائم، الإحالات، الموافقات.'
            : 'Limited to 1 request per hour. Data includes: profile, sessions, subscriptions, family, coupons, referrals, consents.'}
        </p>
      </SectionCard>

      {/* Data Deletion */}
      <SectionCard className="border-[#EF4444]/20">
        <SectionTitle className="text-[#EF4444]">
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-4" /> {isRTL ? 'حذف الحساب' : 'Delete Account'}
          </span>
        </SectionTitle>
        <SectionDescription>
          {isRTL ? 'حذف حسابك نهائيًا وجميع بياناتك المرتبطة' : 'Permanently delete your account and all associated data'}
        </SectionDescription>

        <div className="flex items-center justify-between p-3 rounded-xl bg-[#EF4444]/5 border border-[#EF4444]/10">
          <div>
            <p className="text-foreground text-sm font-medium">{isRTL ? 'حذف حسابي' : 'Delete My Account'}</p>
            <p className="text-muted-foreground text-xs">
              {isRTL ? 'هذا الإجراء لا يمكن التراجع عنه' : 'This action cannot be undone'}
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              // Navigate to account tab for deletion
              toast.info(isRTL ? 'انتقل إلى علامة تبويب الحساب لحذف حسابك' : 'Go to the Account tab to delete your account')
            }}
            className="rounded-xl"
          >
            <Trash2 className="size-4" />
            {isRTL ? 'حذف' : 'Delete'}
          </Button>
        </div>
      </SectionCard>

      {/* Consent Management */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            {isRTL ? 'إدارة الموافقات' : 'Consent Management'}
          </span>
        </SectionTitle>
        <SectionDescription>
          {isRTL ? 'عرض وتحديث تفضيلات الموافقة الخاصة بك' : 'View and update your consent preferences'}
        </SectionDescription>

        {loadingConsents ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-2">
            {consentTypes.map(({ type, labelEn, labelAr }) => {
              const latest = latestConsents[type]
              return (
                <div key={type} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-foreground text-sm font-medium">{isRTL ? labelAr : labelEn}</p>
                    {latest && (
                      <p className="text-muted-foreground text-xs">
                        {isRTL ? 'آخر تحديث:' : 'Last updated:'} {new Date(latest.createdAt).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={latest?.granted ? 'outline' : 'default'}
                      onClick={() => handleUpdateConsent(type, false)}
                      className={`text-xs rounded-xl ${!latest?.granted ? 'bg-muted text-muted-foreground' : ''}`}
                    >
                      {isRTL ? 'رفض' : 'Reject'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateConsent(type, true)}
                      className={`text-xs rounded-xl ${latest?.granted ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'bg-primary hover:bg-primary/80 text-white'}`}
                    >
                      {isRTL ? 'موافقة' : 'Accept'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

      {/* Data Retention Info */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Clock className="size-4 text-primary" />
            {isRTL ? 'فترات الاحتفاظ بالبيانات' : 'Data Retention Periods'}
          </span>
        </SectionTitle>
        <SectionDescription>
          {isRTL ? 'كم من الوقت نحتفظ ببياناتك' : 'How long we retain your data'}
        </SectionDescription>

        <div className="space-y-1">
          {[
            { type: isRTL ? 'بيانات المستخدم' : 'User profile', period: isRTL ? 'مدة الحساب + 30 يومًا' : 'Account duration + 30 days' },
            { type: isRTL ? 'الجلسات' : 'Sessions', period: isRTL ? '90 يومًا بعد الانتهاء' : '90 days after expiry' },
            { type: isRTL ? 'رموز التحقق' : 'Verification codes', period: isRTL ? '30 يومًا بعد الاستخدام' : '30 days after use' },
            { type: isRTL ? 'سجلات الموافقة' : 'Consent records', period: isRTL ? '7 سنوات (متطلب قانوني)' : '7 years (legal requirement)' },
            { type: isRTL ? 'المعاملات المالية' : 'Revenue transactions', period: isRTL ? '7 سنوات (متطلب ضريبي)' : '7 years (tax requirement)' },
            { type: isRTL ? 'سجلات المراجعة' : 'Audit logs', period: isRTL ? '3 سنوات' : '3 years' },
            { type: isRTL ? 'الاشتراكات' : 'Subscriptions', period: isRTL ? '7 سنوات بعد الإلغاء' : '7 years after cancellation' },
          ].map((item) => (
            <div key={item.type} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <span className="text-foreground text-sm">{item.type}</span>
              <span className="text-muted-foreground text-xs">{item.period}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Contact */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Mail className="size-4 text-primary" />
            {isRTL ? 'اتصل بنا' : 'Contact Us'}
          </span>
        </SectionTitle>
        <SectionDescription>
          {isRTL ? 'للاستفسارات المتعلقة بالخصوصية وطلبات البيانات' : 'For privacy-related inquiries and data requests'}
        </SectionDescription>

        <div className="p-3 rounded-xl bg-teal-600/5 border border-teal-600/20">
          <p className="text-foreground text-sm font-medium">privacy@usraplus.com</p>
          <p className="text-muted-foreground text-xs mt-1">
            {isRTL ? 'سنرد خلال 30 يومًا من استلام طلبك' : 'We will respond within 30 days of receiving your request'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <Badge variant="outline" className="bg-teal-600/10 text-teal-600 dark:text-teal-400 border-teal-600/20 text-xs">
            GDPR Compliant
          </Badge>
          <Badge variant="outline" className="bg-teal-600/10 text-teal-600 dark:text-teal-400 border-teal-600/20 text-xs">
            PDPL Compliant
          </Badge>
          <Badge variant="outline" className="bg-teal-600/10 text-teal-600 dark:text-teal-400 border-teal-600/20 text-xs">
            SOC 2 Aligned
          </Badge>
        </div>
      </SectionCard>
    </div>
  )
}
