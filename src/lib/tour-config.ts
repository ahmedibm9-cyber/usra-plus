'use client'

import {
  LayoutDashboard,
  Search,
  Bell,
  BarChart3,
  Moon,
  Zap,
  Sun,
  Globe,
  type LucideIcon,
} from 'lucide-react'

// ─── Tour Step Configuration ──────────────────────────────────────

export interface TourStepConfig {
  /** CSS selector for the target element */
  target: string
  /** i18n key for step title (under t.tour) */
  titleKey: string
  /** i18n key for step description (under t.tour) */
  descKey: string
  /** Lucide icon component */
  icon: LucideIcon
  /** Preferred placement override; auto-determined if omitted */
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export interface TourConfig {
  /** Unique identifier for the tour */
  id: string
  /** Human-readable name */
  name: string
  /** Ordered list of tour steps */
  steps: TourStepConfig[]
  /** i18n key for the welcome screen title (under t.tour) */
  welcomeTitleKey: string
  /** i18n key for the welcome screen description (under t.tour) */
  welcomeDescKey: string
  /** i18n key for the completion screen title (under t.tour) */
  completionTitleKey: string
  /** i18n key for the completion screen description (under t.tour) */
  completionDescKey: string
}

// ─── Default USRA PLUS Tour ───────────────────────────────────────

export const usraPlusTour: TourConfig = {
  id: 'usra-plus-main',
  name: 'USRA PLUS Main Tour',
  welcomeTitleKey: 'welcomeTitle',
  welcomeDescKey: 'welcomeDesc',
  completionTitleKey: 'completionTitle',
  completionDescKey: 'completionDesc',
  steps: [
    {
      target: '[data-tour="sidebar"]',
      titleKey: 'sidebarTitle',
      descKey: 'sidebarDesc',
      icon: LayoutDashboard,
    },
    {
      target: '[data-tour="header-search"]',
      titleKey: 'searchTitle',
      descKey: 'searchDesc',
      icon: Search,
    },
    {
      target: '[data-tour="header-notifications"]',
      titleKey: 'notifTitle',
      descKey: 'notifDesc',
      icon: Bell,
    },
    {
      target: '[data-tour="dashboard-stats"]',
      titleKey: 'statsTitle',
      descKey: 'statsDesc',
      icon: BarChart3,
    },
    {
      target: '[data-tour="dashboard-prayer"]',
      titleKey: 'prayerTitle',
      descKey: 'prayerDesc',
      icon: Moon,
    },
    {
      target: '[data-tour="quick-actions"]',
      titleKey: 'actionsTitle',
      descKey: 'actionsDesc',
      icon: Zap,
    },
    {
      target: '[data-tour="theme-toggle"]',
      titleKey: 'themeTitle',
      descKey: 'themeDesc',
      icon: Sun,
    },
    {
      target: '[data-tour="language-switch"]',
      titleKey: 'langTitle',
      descKey: 'langDesc',
      icon: Globe,
    },
  ],
}
