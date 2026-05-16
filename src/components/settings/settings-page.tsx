'use client'

import React, { useState } from 'react'
import {
  Users,
  User,
  Lock,
  Bell,
  ShieldCheck,
  Crown,
  SlidersHorizontal,
  KeyRound,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import dynamic from 'next/dynamic'

import { ScrollArea } from '@/components/ui/scroll-area'
import { useI18n } from '@/i18n/use-translation'
import { OtpActivation } from '@/components/settings/otp-activation'

// ─── Lazy-loaded Tab Components ──────────────────────────────────────────────
// Tabs are loaded on demand so the initial bundle only includes the active tab.
const ProfileTab = dynamic(() => import('./tabs/profile-tab').then(m => ({ default: m.ProfileTab })), { ssr: false, loading: () => <TabSkeleton /> })
const SubscriptionTab = dynamic(() => import('./tabs/subscription-tab').then(m => ({ default: m.SubscriptionTab })), { ssr: false, loading: () => <TabSkeleton /> })
const FamilyTab = dynamic(() => import('./tabs/family-tab').then(m => ({ default: m.FamilyTab })), { ssr: false, loading: () => <TabSkeleton /> })
const NotificationsTab = dynamic(() => import('./tabs/notifications-tab').then(m => ({ default: m.NotificationsTab })), { ssr: false, loading: () => <TabSkeleton /> })
const PrivacyTab = dynamic(() => import('./tabs/privacy-tab').then(m => ({ default: m.PrivacyTab })), { ssr: false, loading: () => <TabSkeleton /> })
const SecurityTab = dynamic(() => import('./tabs/security-tab').then(m => ({ default: m.SecurityTab })), { ssr: false, loading: () => <TabSkeleton /> })
const AdvancedTab = dynamic(() => import('./tabs/advanced-tab').then(m => ({ default: m.AdvancedTab })), { ssr: false, loading: () => <TabSkeleton /> })

function TabSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="h-8 bg-muted rounded-lg w-1/3" />
      <div className="h-32 bg-muted rounded-xl" />
      <div className="h-24 bg-muted rounded-xl" />
    </div>
  )
}

// ─── Tab Configuration ───────────────────────────────────────────────────────

const settingsTabs = [
  { id: 'profile', icon: User, labelKey: 'user' as const },
  { id: 'family', icon: Users, labelKey: 'family' as const },
  { id: 'subscription', icon: Crown, labelKey: 'premium' as const },
  { id: 'notifications', icon: Bell, labelKey: 'notifications' as const },
  { id: 'security', icon: Lock, labelKey: 'security' as const },
  { id: 'privacy', icon: ShieldCheck, labelKey: 'privacy' as const },
  { id: 'advanced', icon: SlidersHorizontal, labelKey: 'preferences' as const },
  { id: 'otp', icon: KeyRound, labelKey: 'otp' as const },
]

// ─── Tab Content Map ─────────────────────────────────────────────────────────

const tabComponents: Record<string, React.ComponentType> = {
  profile: ProfileTab,
  family: FamilyTab,
  subscription: SubscriptionTab,
  notifications: NotificationsTab,
  security: SecurityTab,
  privacy: PrivacyTab,
  advanced: AdvancedTab,
  otp: OtpActivation as unknown as React.ComponentType,
}

// ─── Main Settings Page ──────────────────────────────────────────────────────

export default function SettingsPage() {
  const { t } = useI18n()
  const [activeTab, setActiveTab] = useState('profile')

  const ActiveTabComponent = tabComponents[activeTab] ?? ProfileTab

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-foreground text-2xl sm:text-3xl font-bold font-display">{t.settings.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your account, family, and preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Navigation - Desktop */}
          <div className="hidden lg:block w-64 shrink-0">
            <nav role="tablist" aria-label="Settings tabs" className="bg-card border border-border rounded-2xl p-2 sticky top-6">
              {settingsTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                    activeTab === tab.id
                      ? 'bg-primary/15 text-primary border-b-2 border-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <tab.icon className={`size-4 ${activeTab === tab.id ? 'text-primary' : ''}`} />
                  {t.settings[tab.labelKey]}
                </button>
              ))}
            </nav>
          </div>

          {/* Mobile Tabs - Horizontal Scroll */}
          <div className="lg:hidden w-full">
            <ScrollArea className="w-full">
              <div role="tablist" aria-label="Settings tabs" className="flex gap-1 pb-2 mb-4 border-b border-border">
                {settingsTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                      activeTab === tab.id
                        ? 'bg-primary/15 text-primary border-b-2 border-primary'
                        : 'text-muted-foreground bg-muted border border-border hover:text-foreground'
                    }`}
                  >
                    <tab.icon className={`size-3.5 ${activeTab === tab.id ? 'text-primary' : ''}`} />
                    {t.settings[tab.labelKey]}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0" role="tabpanel" aria-label={`${t.settings[settingsTabs.find(tb => tb.id === activeTab)?.labelKey || 'user']} settings`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <ActiveTabComponent />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
