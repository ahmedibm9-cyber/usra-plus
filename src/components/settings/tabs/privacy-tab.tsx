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

import Stack from '@mui/material/Stack'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Switch from '@mui/material/Switch'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import FormControlLabel from '@mui/material/FormControlLabel'

import { useI18n } from '@/i18n/use-translation'

import { SectionCard, SectionTitle, SectionDescription } from '../settings-helpers'

export function PrivacyTab() {
  const { isRTL } = useI18n()
  const [exporting, setExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [consents, setConsents] = useState<Array<{ type: string; granted: boolean; createdAt: string }>>([])
  const [loadingConsents, setLoadingConsents] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

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
        setTimeout(() => { window.location.href = '/' }, 2000)
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
      const fetchRes = await fetch('/api/consent', { credentials: 'include' })
      if (fetchRes.ok) {
        const data = await fetchRes.json()
        setConsents(data.consents ?? [])
      }
    } catch {
      toast.error(isRTL ? 'فشل التحديث' : 'Failed to update')
    }
  }, [isRTL])

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

  const legalDocs = [
    { type: 'privacy', labelEn: 'Privacy Policy', labelAr: 'سياسة الخصوصية', descEn: 'How we collect, use, and protect your data (GDPR & PDPL compliant)', descAr: 'كيفية جمع واستخدام وحماية بياناتك (متوافق مع GDPR و PDPL)' },
    { type: 'terms', labelEn: 'Terms of Service', labelAr: 'شروط الخدمة', descEn: 'Terms and conditions for using USRA PLUS', descAr: 'الشروط والأحكام لاستخدام USRA PLUS' },
    { type: 'cookies', labelEn: 'Cookie Policy', labelAr: 'سياسة ملفات تعريف الارتباط', descEn: 'How we use cookies and tracking technologies', descAr: 'كيفية استخدامنا لملفات تعريف الارتباط وتقنيات التتبع' },
  ]

  const retentionData = [
    { type: isRTL ? 'بيانات المستخدم' : 'User profile', period: isRTL ? 'مدة الحساب + 30 يومًا' : 'Account duration + 30 days' },
    { type: isRTL ? 'الجلسات' : 'Sessions', period: isRTL ? '90 يومًا بعد الانتهاء' : '90 days after expiry' },
    { type: isRTL ? 'رموز التحقق' : 'Verification codes', period: isRTL ? '30 يومًا بعد الاستخدام' : '30 days after use' },
    { type: isRTL ? 'سجلات الموافقة' : 'Consent records', period: isRTL ? '7 سنوات (متطلب قانوني)' : '7 years (legal requirement)' },
    { type: isRTL ? 'المعاملات المالية' : 'Revenue transactions', period: isRTL ? '7 سنوات (متطلب ضريبي)' : '7 years (tax requirement)' },
    { type: isRTL ? 'سجلات المراجعة' : 'Audit logs', period: isRTL ? '3 سنوات' : '3 years' },
    { type: isRTL ? 'الاشتراكات' : 'Subscriptions', period: isRTL ? '7 سنوات بعد الإلغاء' : '7 years after cancellation' },
  ]

  return (
    <Stack spacing={3}>
      {/* Consent Management */}
      <SectionCard>
        <SectionTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <ShieldCheck size={16} color="primary" />
            {isRTL ? 'إدارة الموافقة' : 'Consent Management'}
          </Stack>
        </SectionTitle>
        <SectionDescription>
          {isRTL ? 'تحكم في بياناتك وتفضيلات الموافقة' : 'Control your data and consent preferences'}
        </SectionDescription>

        {loadingConsents ? (
          <Stack alignItems="center" sx={{ py: 4 }}>
            <Loader2 size={20} className="animate-spin" color="primary" />
          </Stack>
        ) : (
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            {consentTypes.map(({ type, labelEn, labelAr, descEn, descAr, required }) => {
              const latest = latestConsents[type]
              const isChecked = latest?.granted ?? (type === 'terms' || type === 'privacy')
              return (
                <Paper key={type} elevation={0} variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {isRTL ? labelAr : labelEn}
                        {required && (
                          <Typography variant="caption" color="text.secondary" component="span" sx={{ ml: 0.5 }}>
                            ({isRTL ? 'مطلوب' : 'required'})
                          </Typography>
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{isRTL ? descAr : descEn}</Typography>
                      {latest && (
                        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.25 }}>
                          {isRTL ? 'آخر تحديث:' : 'Last updated:'} {new Date(latest.createdAt).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                        </Typography>
                      )}
                    </Box>
                    <Switch
                      checked={isChecked}
                      onChange={(e) => handleUpdateConsent(type, e.target.checked)}
                      disabled={required}
                      size="small"
                    />
                  </Stack>
                </Paper>
              )
            })}
          </Stack>
        )}
      </SectionCard>

      {/* Legal Documents */}
      <SectionCard>
        <SectionTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <FileJson size={16} color="primary" />
            {isRTL ? 'الوثائق القانونية' : 'Legal Documents'}
          </Stack>
        </SectionTitle>
        <SectionDescription>
          {isRTL ? 'الوصول إلى سياسة الخصوصية وشروط الخدمة وسياسة ملفات تعريف الارتباط' : 'Access our Privacy Policy, Terms of Service, and Cookie Policy'}
        </SectionDescription>

        <Stack spacing={1}>
          {legalDocs.map((doc) => (
            <Paper
              key={doc.type}
              elevation={0}
              variant="outlined"
              component="a"
              href={`?page=${doc.type}`}
              sx={{ p: 1.5, borderRadius: 3, textDecoration: 'none', display: 'block', transition: 'all 0.15s', '&:hover': { bgcolor: 'action.hover' } }}
            >
              <Stack direction="row" alignItems="center" gap={1.5}>
                <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'secondary.main', opacity: 0.1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle2 size={16} color="secondary" />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{isRTL ? doc.labelAr : doc.labelEn}</Typography>
                  <Typography variant="caption" color="text.secondary">{isRTL ? doc.descAr : doc.descEn}</Typography>
                </Box>
                <ChevronRight size={16} color="text.secondary" />
              </Stack>
            </Paper>
          ))}
        </Stack>
      </SectionCard>

      {/* Data Export */}
      <SectionCard>
        <SectionTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <Download size={16} color="primary" />
            {isRTL ? 'تصدير البيانات' : 'Data Export'}
          </Stack>
        </SectionTitle>
        <SectionDescription>
          {isRTL ? 'قم بتنزيل جميع بياناتك بتنسيق JSON (وفقًا للائحة GDPR)' : 'Download all your data in JSON format (GDPR right to portability)'}
        </SectionDescription>

        <Paper elevation={0} variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {isRTL ? 'تصدير بياناتي' : 'Export My Data'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isRTL ? 'ملف JSON يحتوي على جميع بياناتك' : 'JSON file containing all your data'}
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="secondary"
              size="small"
              onClick={handleExportData}
              disabled={exporting}
              startIcon={exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            >
              {isRTL ? 'تصدير' : 'Export'}
            </Button>
          </Stack>
        </Paper>

        <Typography variant="caption" color="text.disabled" sx={{ mt: 1 }}>
          {isRTL ? 'محدود بطلب واحد في الساعة. البيانات تشمل: الملف الشخصي، الجلسات، الاشتراكات، العائلة، القسائم، الإحالات، الموافقات.'
            : 'Limited to 1 request per hour. Data includes: profile, sessions, subscriptions, family, coupons, referrals, consents.'}
        </Typography>
      </SectionCard>

      {/* Account Deletion */}
      <SectionCard sx={{ borderColor: 'error.light' }}>
        <SectionTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <AlertTriangle size={16} color="error" /> {isRTL ? 'منطقة الخطر' : 'Danger Zone'}
          </Stack>
        </SectionTitle>
        <SectionDescription>
          {isRTL ? 'حذف حسابك نهائيًا وجميع بياناتك المرتبطة. هذا الإجراء لا يمكن التراجع عنه.' : 'Permanently delete your account and all associated data. This action cannot be undone.'}
        </SectionDescription>

        <Button
          variant="contained"
          color="error"
          size="small"
          disabled={isDeleting}
          startIcon={<Trash2 size={16} />}
          onClick={() => setDeleteDialogOpen(true)}
        >
          {isDeleting ? (isRTL ? 'جارٍ الحذف...' : 'Deleting...') : (isRTL ? 'حذف حسابي' : 'Delete My Account')}
        </Button>

        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>{isRTL ? 'تأكيد حذف الحساب' : 'Confirm Account Deletion'}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {isRTL
                ? 'سيتم حذف حسابك نهائيًا مع جميع بياناتك بما في ذلك العائلات والمهام والاشتراكات والموافقات. لا يمكن التراجع عن هذا الإجراء.'
                : 'Your account will be permanently deleted along with all your data including families, tasks, subscriptions, and consents. This action cannot be undone.'}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
            <Button
              color="error"
              variant="contained"
              onClick={() => { handleDeleteAccount(); setDeleteDialogOpen(false) }}
            >
              {isRTL ? 'حذف نهائي' : 'Delete Permanently'}
            </Button>
          </DialogActions>
        </Dialog>
      </SectionCard>

      {/* Data Retention Info */}
      <SectionCard>
        <SectionTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <Clock size={16} color="primary" />
            {isRTL ? 'فترات الاحتفاظ بالبيانات' : 'Data Retention Periods'}
          </Stack>
        </SectionTitle>
        <SectionDescription>
          {isRTL ? 'كم من الوقت نحتفظ ببياناتك' : 'How long we retain your data'}
        </SectionDescription>

        <Stack>
          {retentionData.map((item, idx) => (
            <Stack
              key={item.type}
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{
                py: 1,
                borderBottom: idx < retentionData.length - 1 ? 1 : 0,
                borderColor: 'divider',
              }}
            >
              <Typography variant="body2">{item.type}</Typography>
              <Typography variant="caption" color="text.secondary">{item.period}</Typography>
            </Stack>
          ))}
        </Stack>
      </SectionCard>

      {/* Contact */}
      <SectionCard>
        <SectionTitle>
          <Stack direction="row" alignItems="center" gap={1}>
            <Mail size={16} color="primary" />
            {isRTL ? 'اتصل بنا' : 'Contact Us'}
          </Stack>
        </SectionTitle>
        <SectionDescription>
          {isRTL ? 'للاستفسارات المتعلقة بالخصوصية وطلبات البيانات' : 'For privacy-related inquiries and data requests'}
        </SectionDescription>

        <Paper elevation={0} variant="outlined" sx={{ p: 1.5, borderRadius: 3, borderColor: 'secondary.light' }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>privacy@usraplus.com</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            {isRTL ? 'سنرد خلال 30 يومًا من استلام طلبك' : 'We will respond within 30 days of receiving your request'}
          </Typography>
        </Paper>

        <Stack direction="row" gap={1} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
          <Chip label="GDPR Compliant" size="small" variant="outlined" color="secondary" />
          <Chip label="PDPL Compliant" size="small" variant="outlined" color="secondary" />
          <Chip label="SOC 2 Aligned" size="small" variant="outlined" color="secondary" />
        </Stack>
      </SectionCard>
    </Stack>
  )
}
