'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { LegalPage } from './legal-page'
import { PRIVACY_POLICY } from '@/lib/legal/privacy-policy'
import { useI18n } from '@/i18n/use-translation'

export function PrivacyPolicyPage() {
  const { isRTL } = useI18n()

  return (
    <LegalPage
      title={isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}
      lastUpdated="2026-03-04"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {PRIVACY_POLICY}
      </ReactMarkdown>
    </LegalPage>
  )
}
