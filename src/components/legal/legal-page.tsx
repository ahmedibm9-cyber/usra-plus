'use client'

import React from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/use-translation'

interface LegalPageProps {
  title: string
  lastUpdated: string
  children: React.ReactNode
}

export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  const { isRTL } = useI18n()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className={`size-4 ${isRTL ? 'rotate-180' : ''}`} />
            {isRTL ? 'رجوع' : 'Back'}
          </Button>
          <h1 className="text-3xl font-bold text-foreground font-display">{title}</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {isRTL ? `آخر تحديث: ${lastUpdated}` : `Last updated: ${lastUpdated}`}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none
          prose-headings:text-foreground prose-headings:font-semibold
          prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-border
          prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3
          prose-p:text-muted-foreground prose-p:leading-relaxed
          prose-li:text-muted-foreground
          prose-strong:text-foreground
          prose-a:text-primary prose-a:no-underline hover:prose-a:underline
          prose-table:text-sm prose-table:border prose-table:border-border
          prose-th:bg-muted prose-th:p-2 prose-th:border prose-th:border-border prose-th:text-foreground prose-th:text-left
          prose-td:p-2 prose-td:border prose-td:border-border prose-td:text-muted-foreground
          prose-hr:border-border
          prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
          prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground
        ">
          {children}
        </div>
      </div>
    </div>
  )
}
