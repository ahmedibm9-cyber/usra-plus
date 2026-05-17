'use client'

import React, { useState } from 'react'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Skeleton from '@mui/material/Skeleton'
import dynamic from 'next/dynamic'

import { useI18n } from '@/i18n/use-translation'
import { OtpActivation } from '@/components/settings/otp-activation'
import {
  User as UserIcon,
  Users,
  Lock,
  Bell,
  ShieldCheck,
  Crown,
  SlidersHorizontal,
  KeyRound,
} from 'lucide-react'

// ─── Lazy-loaded Tab Components ──────────────────────────────────────────────
const ProfileTab = dynamic(() => import('./tabs/profile-tab').then(m => ({ default: m.ProfileTab })), { ssr: false, loading: () => <TabSkeleton /> })
const SubscriptionTab = dynamic(() => import('./tabs/subscription-tab').then(m => ({ default: m.SubscriptionTab })), { ssr: false, loading: () => <TabSkeleton /> })
const FamilyTab = dynamic(() => import('./tabs/family-tab').then(m => ({ default: m.FamilyTab })), { ssr: false, loading: () => <TabSkeleton /> })
const NotificationsTab = dynamic(() => import('./tabs/notifications-tab').then(m => ({ default: m.NotificationsTab })), { ssr: false, loading: () => <TabSkeleton /> })
const PrivacyTab = dynamic(() => import('./tabs/privacy-tab').then(m => ({ default: m.PrivacyTab })), { ssr: false, loading: () => <TabSkeleton /> })
const SecurityTab = dynamic(() => import('./tabs/security-tab').then(m => ({ default: m.SecurityTab })), { ssr: false, loading: () => <TabSkeleton /> })
const AdvancedTab = dynamic(() => import('./tabs/advanced-tab').then(m => ({ default: m.AdvancedTab })), { ssr: false, loading: () => <TabSkeleton /> })

function TabSkeleton() {
  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Skeleton variant="rounded" width="33%" height={32} />
      <Skeleton variant="rounded" height={128} />
      <Skeleton variant="rounded" height={96} />
    </Stack>
  )
}

// ─── Tab Configuration ───────────────────────────────────────────────────────

const settingsTabs = [
  { id: 'profile', icon: UserIcon, labelKey: 'user' as const },
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
  const [activeTab, setActiveTab] = useState(settingsTabs[0].id)

  const ActiveTabComponent = tabComponents[activeTab] ?? ProfileTab

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Page Header */}
        <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
          {t.settings.title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }} sx={{ mb: 3 }}>
          Manage your account, family, and preferences
        </Typography>

        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Desktop Sidebar Nav */}
          <Paper
            variant="outlined"
            sx={{ display: { xs: 'none', md: 'block' }, width: 256, flexShrink: 0, p: 1, position: 'sticky', top: 24, alignSelf: 'flex-start' }}
          >
            <Tabs
              orientation="vertical"
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              aria-label="Settings tabs"
              sx={{
                '& .MuiTabs-indicator': {
                  left: 0,
                  width: 3,
                  borderRadius: 1,
                },
                '& .MuiTab-root': {
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  minHeight: 40,
                  textAlign: 'left',
                  px: 2,
                  py: 1.25,
                  borderRadius: 2,
                  textTransform: 'none',
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                  },
                },
              }}
            >
              {settingsTabs.map(tab => (
                <Tab
                  key={tab.id}
                  value={tab.id}
                  icon={<tab.icon size={16} />}
                  iconPosition="start"
                  label={t.settings[tab.labelKey]}
                  sx={{ '& .MuiTab-iconWrapper': { mr: 1.5, mb: 0 } }}
                />
              ))}
            </Tabs>
          </Paper>

          {/* Mobile Tabs — Horizontal Scroll */}
          <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 2 }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              aria-label="Settings tabs"
              sx={{
                '& .MuiTab-root': {
                  minHeight: 44,
                  textTransform: 'none',
                  px: 2,
                },
              }}
            >
              {settingsTabs.map(tab => (
                <Tab
                  key={tab.id}
                  value={tab.id}
                  icon={<tab.icon size={14} />}
                  iconPosition="start"
                  label={t.settings[tab.labelKey]}
                />
              ))}
            </Tabs>
          </Box>

          {/* Content Area */}
          <Box
            sx={{ flex: 1, minWidth: 0 }}
            role="tabpanel"
            aria-label={`${t.settings[settingsTabs.find(t => t.id === activeTab)?.labelKey || 'user']} settings`}
          >
            <ActiveTabComponent />
          </Box>
        </Box>
      </Container>
    </Box>
  )
}
