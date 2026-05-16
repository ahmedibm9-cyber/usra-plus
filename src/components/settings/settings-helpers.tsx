'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'

export function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <Card
      className={`bg-card border border-outline-variant rounded-2xl shadow-[var(--elevation-1)] transition-shadow duration-200 ${className ?? ''}`}
    >
      <CardContent className="p-6">
        {children}
      </CardContent>
    </Card>
  )
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`text-foreground text-base font-semibold mb-1 ${className ?? ''}`}>{children}</h3>
  )
}

export function SectionDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground text-sm mb-4">{children}</p>
}

export function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0 last:pb-0">
      <div className="flex-1 min-w-0">
        <p className="text-foreground text-sm font-medium">{label}</p>
        {description && <p className="text-muted-foreground text-xs mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
