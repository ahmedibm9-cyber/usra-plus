'use client'

/**
 * Cookie Consent Component — GDPR/PDPL Compliance
 *
 * Shows a cookie consent banner at the bottom of the page.
 * - User can accept all, reject non-essential, or customize
 * - Stores consent in localStorage + calls /api/consent to record
 * - Only shows if consent hasn't been given yet
 * - Supports Arabic/English
 * - Uses USRA PLUS brand styling (teal theme)
 */

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cookie, Shield, Settings, Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useI18n } from '@/i18n/use-translation'

const CONSENT_STORAGE_KEY = 'usra-cookie-consent'

interface CookieCategories {
  necessary: boolean
  functional: boolean
  analytics: boolean
  marketing: boolean
}

const DEFAULT_CATEGORIES: CookieCategories = {
  necessary: true, // Always true
  functional: false,
  analytics: false,
  marketing: false,
}

function getStoredConsent(): CookieCategories | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored) as CookieCategories
  } catch {
    return null
  }
}

function storeConsent(categories: CookieCategories): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(categories))
  } catch {
    // localStorage not available
  }
}

async function recordConsent(categories: CookieCategories): Promise<void> {
  try {
    const ip = undefined // Will be captured server-side from headers
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : undefined

    // Record each consent type
    const consentTypes = [
      { type: 'cookies', granted: true }, // Overall cookie consent
      { type: 'marketing', granted: categories.marketing },
    ]

    await Promise.allSettled(
      consentTypes.map((consent) =>
        fetch('/api/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: consent.type,
            granted: consent.granted,
            version: '1.0',
            ipAddress: ip,
            userAgent: ua,
          }),
        })
      )
    )
  } catch {
    // Non-blocking — consent is stored locally even if API call fails
  }
}

export function CookieConsent() {
  const { isRTL, t } = useI18n()
  const [visible, setVisible] = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)
  const [categories, setCategories] = useState<CookieCategories>(DEFAULT_CATEGORIES)

  useEffect(() => {
    const stored = getStoredConsent()
    if (!stored) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAcceptAll = useCallback(async () => {
    const allAccepted: CookieCategories = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    }
    storeConsent(allAccepted)
    await recordConsent(allAccepted)
    setVisible(false)
  }, [])

  const handleRejectNonEssential = useCallback(async () => {
    const onlyNecessary: CookieCategories = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    }
    storeConsent(onlyNecessary)
    await recordConsent(onlyNecessary)
    setVisible(false)
  }, [])

  const handleSavePreferences = useCallback(async () => {
    storeConsent(categories)
    await recordConsent(categories)
    setVisible(false)
  }, [categories])

  const toggleCategory = useCallback((key: keyof CookieCategories) => {
    if (key === 'necessary') return // Can't disable necessary
    setCategories((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  if (!visible) return null

  const categoryLabels: { key: keyof CookieCategories; labelEn: string; labelAr: string; descEn: string; descAr: string }[] = [
    {
      key: 'necessary',
      labelEn: 'Necessary',
      labelAr: 'ضروري',
      descEn: 'Essential for the service to function. Cannot be disabled.',
      descAr: 'ضرورية لعمل الخدمة. لا يمكن تعطيلها.',
    },
    {
      key: 'functional',
      labelEn: 'Functional',
      labelAr: 'وظيفي',
      descEn: 'Enable enhanced features and personalization.',
      descAr: 'تفعيل الميزات المحسنة والتخصيص.',
    },
    {
      key: 'analytics',
      labelEn: 'Analytics',
      labelAr: 'تحليلات',
      descEn: 'Help us understand how you use our service so we can improve it.',
      descAr: 'ساعدنا في فهم كيفية استخدامك لخدمتنا لتحسينها.',
    },
    {
      key: 'marketing',
      labelEn: 'Marketing',
      labelAr: 'تسويق',
      descEn: 'Used to deliver relevant advertisements and track campaign effectiveness.',
      descAr: 'تُستخدم لتقديم إعلانات ذات صولة وتتبع فعالية الحملات.',
    },
  ]

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div className="mx-auto max-w-3xl rounded-2xl border border-teal-600/30 bg-card/95 backdrop-blur-xl shadow-2xl">
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="size-10 rounded-xl bg-teal-600/10 flex items-center justify-center shrink-0">
                  <Cookie className="size-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-foreground text-sm font-semibold">
                    {isRTL ? 'نستخدم ملفات تعريف الارتباط' : 'We use cookies'}
                  </h3>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {isRTL
                      ? 'نستخدم ملفات تعريف الارتباط لتحسين تجربتك وتحليل الاستخدام وتقديم محتوى تسويقي بإذنك.'
                      : 'We use cookies to enhance your experience, analyze usage, and deliver marketing content with your permission.'}
                  </p>
                </div>
                <button
                  onClick={handleRejectNonEssential}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors shrink-0"
                  aria-label={isRTL ? 'إغلاق' : 'Close'}
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Customize Panel */}
              <AnimatePresence>
                {showCustomize && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden mb-3"
                  >
                    <div className="space-y-2 p-3 rounded-xl bg-muted/50 border border-border">
                      {categoryLabels.map(({ key, labelEn, labelAr, descEn, descAr }) => (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground text-sm font-medium">
                              {isRTL ? labelAr : labelEn}
                            </p>
                            <p className="text-muted-foreground text-xs mt-0.5">
                              {isRTL ? descAr : descEn}
                            </p>
                          </div>
                          <Switch
                            checked={categories[key]}
                            onCheckedChange={() => toggleCategory(key)}
                            disabled={key === 'necessary'}
                            className="data-[state=checked]:bg-teal-600 data-[state=disabled]:opacity-50 data-[state=disabled]:cursor-not-allowed"
                          />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={handleAcceptAll}
                  className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl"
                >
                  <Check className="size-3.5 mr-1.5" />
                  {isRTL ? 'قبول الكل' : 'Accept All'}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRejectNonEssential}
                  className="border-border text-foreground hover:bg-muted rounded-xl"
                >
                  <Shield className="size-3.5 mr-1.5" />
                  {isRTL ? 'رفض غير الضروري' : 'Reject Non-Essential'}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCustomize(!showCustomize)}
                  className="text-muted-foreground hover:text-foreground rounded-xl"
                >
                  <Settings className="size-3.5 mr-1.5" />
                  {isRTL ? 'تخصيص' : 'Customize'}
                  {showCustomize ? (
                    <ChevronUp className="size-3.5 ml-1" />
                  ) : (
                    <ChevronDown className="size-3.5 ml-1" />
                  )}
                </Button>

                {showCustomize && (
                  <Button
                    size="sm"
                    onClick={handleSavePreferences}
                    className="bg-teal-600/80 hover:bg-teal-700 text-white rounded-xl ml-auto"
                  >
                    {isRTL ? 'حفظ التفضيلات' : 'Save Preferences'}
                  </Button>
                )}
              </div>

              {/* Footer Link */}
              <p className="text-muted-foreground text-[10px] mt-2">
                {isRTL ? 'لمزيد من المعلومات، راجع ' : 'For more information, see our '}
                <a
                  href="/api/legal?type=cookies"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 dark:text-teal-400 hover:underline"
                >
                  {isRTL ? 'سياسة ملفات تعريف الارتباط' : 'Cookie Policy'}
                </a>
                {' & '}
                <a
                  href="/api/legal?type=privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 dark:text-teal-400 hover:underline"
                >
                  {isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
