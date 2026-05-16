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
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

import { useI18n } from '@/i18n/use-translation'

import { SectionCard, SectionTitle, SectionDescription } from '../settings-helpers'

export function PrivacyTab() {
  const { isRTL } = useI18n()
  const [exporting, setExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [consents, setConsents] = useState<Array<{ type: string; granted: boolean; createdAt: string }>>([])
  const [loadingConsents, setLoadingConsents] = useState(false)

  // Fetch consent history on mount
  React.useEffect(() => {
    const fetchConsents = async () => {
      setLoadingConsents(true)
      try {
        const res = await fetch('/api/consent', { credentials: 'include' })
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
      const res = await fetch('/api/user/export', { credentials: 'include' })
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

  const handleDeleteAccount = useCallback(async () => {
    setIsDeleting(true)
    try {
      const res = await fetch('/api/user/delete', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        toast.success(isRTL ? 'تم حذف حسابك نهائيًا' : 'Your account has been permanently deleted')
        setTimeout(() => {
          window.location.href = '/'
        }, 2000)
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || (isRTL ? 'فشل حذف الحساب' : 'Failed to delete account'))
      }
    } catch {
      toast.error(isRTL ? 'فشل حذف الحساب' : 'Failed to delete account')
    } finally {
      setIsDeleting(false)
    }
  }, [isRTL])

  const handleUpdateConsent = useCallback(async (type: string, granted: boolean) => {
    try {
      const res = await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type, granted, version: '1.0' }),
      })
      if (!res.ok) throw new Error('Failed to update consent')
      toast.success(isRTL ? 'تم تحديث التفضيل' : 'Preference updated')
      // Refresh consent list
      const fetchRes = await fetch('/api/consent', { credentials: 'include' })
      if (fetchRes.ok) {
        const data = await fetchRes.json()
        setConsents(data.consents ?? [])
      }
    } catch {
      toast.error(isRTL ? 'فشل التحديث' : 'Failed to update')
    }
  }, [isRTL])

  // Group consents by type — get the latest consent per type
  const latestConsents = consents.reduce<Record<string, { type: string; granted: boolean; createdAt: string }>>((acc, c) => {
    if (!acc[c.type]) acc[c.type] = c
    return acc
  }, {})

  const consentTypes = [
    { type: 'terms', labelEn: 'Terms of Service', labelAr: 'شروط الخدمة', descEn: 'Agreement to terms of service', descAr: 'الموافقة على شروط استخدام الخدمة', required: true },
    { type: 'privacy', labelEn: 'Privacy Policy', labelAr: 'سياسة الخصوصية', descEn: 'Agreement to privacy policy', descAr: 'الموافقة على سياسة الخصوصية', required: true },
    { type: 'marketing', labelEn: 'Marketing', labelAr: 'التسويق', descEn: 'Receive promotional emails', descAr: 'تلقي رسائل بريد إلكتروني ترويجية', required: false },
    { type: 'cookies', labelEn: 'Cookies', labelAr: 'ملفات تعريف الارتباط', descEn: 'Accept analytics cookies', descAr: 'قبول ملفات تعريف الارتباط التحليلية', required: false },
  ]

  return (
    <div className="space-y-6">
      {/* Consent Management */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            {isRTL ? 'إدارة الموافقة' : 'Consent Management'}
          </span>
        </SectionTitle>
        <SectionDescription>
          {isRTL ? 'تحكم في بياناتك وتفضيلات الموافقة' : 'Control your data and consent preferences'}
        </SectionDescription>

        {loadingConsents ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {consentTypes.map(({ type, labelEn, labelAr, descEn, descAr, required }) => {
              const latest = latestConsents[type]
              const isChecked = latest?.granted ?? (type === 'terms' || type === 'privacy')
              return (
                <div key={type} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
                  <div className="space-y-0.5">
                    <Label className="text-foreground text-sm font-medium">
                      {isRTL ? labelAr : labelEn}
                      {required && <span className="text-muted-foreground text-xs ml-1">({isRTL ? 'مطلوب' : 'required'})</span>}
                    </Label>
                    <p className="text-xs text-muted-foreground">{isRTL ? descAr : descEn}</p>
                    {latest && (
                      <p className="text-[10px] text-muted-foreground">
                        {isRTL ? 'آخر تحديث:' : 'Last updated:'} {new Date(latest.createdAt).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={isChecked}
                    onCheckedChange={(checked) => handleUpdateConsent(type, checked)}
                    disabled={required}
                  />
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>

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
              href={`?page=${doc.type}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border hover:bg-primary/5 transition-all duration-150 cursor-pointer group"
            >
              <div className="size-9 rounded-lg bg-teal-600/10 flex items-center justify-center">
                <CheckCircle2 className="size-4 text-teal-600 dark:text-teal-400" />
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
          {isRTL ? 'قم بتنزيل جميع بياناتك بتنسيق JSON (وفقًا للائحة GDPR)' : 'Download all your data in JSON format (GDPR right to portability)'}
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

      {/* Account Deletion — Danger Zone */}
      <SectionCard className="border-[#EF4444]/20">
        <SectionTitle className="text-[#EF4444]">
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-4" /> {isRTL ? 'منطقة الخطر' : 'Danger Zone'}
          </span>
        </SectionTitle>
        <SectionDescription>
          {isRTL ? 'حذف حسابك نهائيًا وجميع بياناتك المرتبطة. هذا الإجراء لا يمكن التراجع عنه.' : 'Permanently delete your account and all associated data. This action cannot be undone.'}
        </SectionDescription>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              className="rounded-xl"
            >
              <Trash2 className="size-4" />
              {isDeleting ? (isRTL ? 'جارٍ الحذف...' : 'Deleting...') : (isRTL ? 'حذف حسابي' : 'Delete My Account')}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{isRTL ? 'تأكيد حذف الحساب' : 'Confirm Account Deletion'}</AlertDialogTitle>
              <AlertDialogDescription>
                {isRTL
                  ? 'سيتم حذف حسابك نهائيًا مع جميع بياناتك بما في ذلك العائلات والمهام والاشتراكات والموافقات. لا يمكن التراجع عن هذا الإجراء.'
                  : 'Your account will be permanently deleted along with all your data including families, tasks, subscriptions, and consents. This action cannot be undone.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{isRTL ? 'إلغاء' : 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount} className="bg-[#EF4444] hover:bg-[#DC2626]">
                {isRTL ? 'حذف نهائي' : 'Delete Permanently'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
