'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { LegalPage } from './legal-page'
import { COOKIE_POLICY } from '@/lib/legal/cookie-policy'
import { useI18n } from '@/i18n/use-translation'

export function CookiePolicyPage() {
  const { isRTL } = useI18n()

  return (
    <LegalPage
      title={isRTL ? 'سياسة ملفات تعريف الارتباط' : 'Cookie Policy'}
      lastUpdated="2026-03-04"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {COOKIE_POLICY}
      </ReactMarkdown>
    </LegalPage>
  )
}
