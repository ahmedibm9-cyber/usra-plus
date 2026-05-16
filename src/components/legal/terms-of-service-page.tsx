'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { LegalPage } from './legal-page'
import { TERMS_OF_SERVICE } from '@/lib/legal/terms-of-service'
import { useI18n } from '@/i18n/use-translation'

export function TermsOfServicePage() {
  const { isRTL } = useI18n()

  return (
    <LegalPage
      title={isRTL ? 'شروط الخدمة' : 'Terms of Service'}
      lastUpdated="2026-03-04"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {TERMS_OF_SERVICE}
      </ReactMarkdown>
    </LegalPage>
  )
}
