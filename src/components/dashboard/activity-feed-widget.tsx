'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  Plus,
  Check,
  Calendar,
  ShoppingCart,
  CheckSquare,
  UserPlus,
  MessageCircle,
} from 'lucide-react'

import { useActivityStore, type ActivityItem, type ActivityType } from '@/stores/activity-store'
import { usePresenceStore } from '@/stores/presence-store'
import { useI18n } from '@/i18n/use-translation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/stores/app-store'

// ─── Activity Type Config ────────────────────────────────────────

const ACTIVITY_TYPE_CONFIG: Record<ActivityType, {
  icon: React.ElementType
  bgColor: string
  iconColor: string
}> = {
  task_created: {
    icon: Plus,
    bgColor: 'bg-orange-500/20',
    iconColor: 'text-orange-400',
  },
  task_completed: {
    icon: Check,
    bgColor: 'bg-[#E50914]/20',
    iconColor: 'text-[#E50914]',
  },
  event_created: {
    icon: Calendar,
    bgColor: 'bg-[#E50914]/20',
    iconColor: 'text-[#E50914]',
  },
  event_added: {
    icon: Calendar,
    bgColor: 'bg-[#E50914]/20',
    iconColor: 'text-[#E50914]',
  },
  grocery_added: {
    icon: ShoppingCart,
    bgColor: 'bg-[#F4C430]/20',
    iconColor: 'text-[#F4C430]',
  },
  grocery_checked: {
    icon: CheckSquare,
    bgColor: 'bg-[#F4C430]/20',
    iconColor: 'text-[#F4C430]',
  },
  member_joined: {
    icon: UserPlus,
    bgColor: 'bg-[#E50914]/20',
    iconColor: 'text-[#E50914]',
  },
  message_sent: {
    icon: MessageCircle,
    bgColor: 'bg-gray-500/20',
    iconColor: 'text-[--text-muted]',
  },
}

// ─── Relative Time Formatter ─────────────────────────────────────

function getRelativeTime(dateStr: string, _isRTL: boolean, t: { justNow: string; minutesAgo: string; hoursAgo: string; yesterday: string; daysAgo: string }): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return t.justNow
  if (diffMinutes < 60) return t.minutesAgo.replace('{n}', String(diffMinutes))
  if (diffHours < 24) return t.hoursAgo.replace('{n}', String(diffHours))
  if (diffDays === 1) return t.yesterday
  return t.daysAgo.replace('{n}', String(diffDays))
}

// ─── Activity Feed Item Component ────────────────────────────────

function ActivityFeedItem({
  item,
  index,
  isLast,
  isRTL,
  relativeTime,
}: {
  item: ActivityItem
  index: number
  isLast: boolean
  isRTL: boolean
  relativeTime: string
}) {
  const isOnline = usePresenceStore((s) => s.isUserOnline(item.actor.id))
  const config = ACTIVITY_TYPE_CONFIG[item.type]
  const TypeIcon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className={`relative flex items-start gap-3 rounded-lg p-2.5 transition-colors hover:bg-[--border-subtle] ${!isLast ? 'pb-4' : ''}`}
    >
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-4 top-8 bottom-0 w-px bg-[--border-subtle]" />
      )}

      {/* Actor avatar with online indicator */}
      <div className="relative mt-0.5 shrink-0">
        <Avatar className="h-8 w-8 rounded-full ring-2 ring-[var(--bg-surface)]">
          <AvatarImage src={item.actor.avatar_url || undefined} />
          <AvatarFallback className="bg-[#E50914]/20 text-[10px] text-[#E50914]">
            {item.actor.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-green-400 ring-2 ring-[var(--bg-surface)] led-indicator led-indicator-active online-dot-pulse" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-[--text-primary] truncate">
            {item.actor.name}
          </span>
        </div>
        <p className="text-sm text-[--text-muted] truncate mt-0.5">
          {item.description}
        </p>
        <span className="text-xs text-[--text-muted] mt-1 block">
          {relativeTime}
        </span>
      </div>

      {/* Activity type badge */}
      <div className={`mt-1 shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${config.bgColor}`}>
        <TypeIcon className={`size-3.5 ${config.iconColor}`} />
      </div>
    </motion.div>
  )
}

// ─── Main Activity Feed Widget ───────────────────────────────────

export function ActivityFeedWidget() {
  const { t, isRTL } = useI18n()
  const activities = useActivityStore((s) => s.activities)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)

  const recentActivities = useMemo(() => {
    return activities.slice(0, 10)
  }, [activities])

  return (
    <GlassCard delay={0.5} className="p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-[#E50914]" />
          <h3 className="text-sm font-semibold text-[--text-primary]">
            {t.activityFeed.activity}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-[--text-muted] hover:text-[#E50914]"
          onClick={() => setCurrentPage('dashboard')}
        >
          {t.activityFeed.viewAll}
        </Button>
      </div>

      {/* Activity List */}
      <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
        {recentActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="size-8 text-[--text-muted]/40 mb-2" />
            <p className="text-sm text-[--text-muted]">
              {isRTL ? 'لا يوجد نشاط حتى الآن' : 'No activity yet'}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {recentActivities.map((item, index) => (
              <ActivityFeedItem
                key={item.id}
                item={item}
                index={index}
                isLast={index === recentActivities.length - 1}
                isRTL={isRTL}
                relativeTime={getRelativeTime(item.created_at, isRTL, t.activityFeed)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </GlassCard>
  )
}

// ─── GlassCard helper (local copy for this component) ────────────

function GlassCard({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div
        className={`glass-card rounded-2xl border border-[--border-subtle] bg-[--bg-surface] dot-grid-bg ${className}`}
      >
        {children}
      </div>
    </motion.div>
  )
}
