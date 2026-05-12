'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle,
  PlusCircle,
  CalendarPlus,
  ShoppingCart,
  MessageCircle,
  UserPlus,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

import { useActivityStore, type TimelineItem, type ActivityType } from '@/stores/activity-store'
import { useI18n } from '@/i18n/use-translation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

// ─── Activity Type Config ────────────────────────────────────────

const TIMELINE_TYPE_CONFIG: Record<ActivityType, {
  icon: React.ElementType
  dotColor: string
  bgColor: string
}> = {
  task_completed: {
    icon: CheckCircle,
    dotColor: 'bg-[#E50914]',
    bgColor: 'bg-[#E50914]/15',
  },
  task_created: {
    icon: PlusCircle,
    dotColor: 'bg-[#E50914]',
    bgColor: 'bg-[#E50914]/15',
  },
  event_added: {
    icon: CalendarPlus,
    dotColor: 'bg-[#E50914]',
    bgColor: 'bg-[#E50914]/15',
  },
  event_created: {
    icon: CalendarPlus,
    dotColor: 'bg-[#E50914]',
    bgColor: 'bg-[#E50914]/15',
  },
  grocery_added: {
    icon: ShoppingCart,
    dotColor: 'bg-[#F4C430]',
    bgColor: 'bg-[#F4C430]/15',
  },
  grocery_checked: {
    icon: ShoppingCart,
    dotColor: 'bg-[#F4C430]',
    bgColor: 'bg-[#F4C430]/15',
  },
  message_sent: {
    icon: MessageCircle,
    dotColor: 'bg-[#E50914]',
    bgColor: 'bg-[#E50914]/15',
  },
  member_joined: {
    icon: UserPlus,
    dotColor: 'bg-[#F4C430]',
    bgColor: 'bg-[#F4C430]/15',
  },
}

// ─── Filter Pill Types ──────────────────────────────────────────

type FilterType = 'all' | 'tasks' | 'events' | 'grocery' | 'chat'

const FILTER_MAP: Record<FilterType, ActivityType | 'all'> = {
  all: 'all',
  tasks: 'task_completed', // will match both task_created and task_completed
  events: 'event_added',
  grocery: 'grocery_checked',
  chat: 'message_sent',
}

const FILTER_TASK_TYPES: ActivityType[] = ['task_completed', 'task_created']

// ─── Relative Time Formatter ─────────────────────────────────────

function getRelativeTime(dateStr: string, isRTL: boolean): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)

  if (diffSeconds < 60) return isRTL ? 'الآن' : 'just now'
  if (diffMinutes < 60) {
    return isRTL ? `منذ ${diffMinutes} د` : `${diffMinutes} min ago`
  }
  if (diffHours < 24) {
    return isRTL ? `منذ ${diffHours} س` : `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  }
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return isRTL ? 'أمس' : 'Yesterday'
  return isRTL ? `منذ ${diffDays} ي` : `${diffDays} days ago`
}

// ─── Timeline Item Component ─────────────────────────────────────

function TimelineItemRow({
  item,
  index,
  isLast,
  isRTL,
}: {
  item: TimelineItem
  index: number
  isLast: boolean
  isRTL: boolean
}) {
  const config = TIMELINE_TYPE_CONFIG[item.type]
  const TypeIcon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: isRTL ? 8 : -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className="relative flex items-start gap-3 py-2.5"
    >
      {/* Timeline line */}
      {!isLast && (
        <div
          className="absolute top-8 bottom-0 w-px bg-[--border-subtle]"
          style={{ left: isRTL ? undefined : 11, right: isRTL ? 11 : undefined }}
        />
      )}

      {/* Dot + Icon */}
      <div className="relative mt-0.5 shrink-0 flex items-center justify-center">
        <div className={`size-6 rounded-full ${config.bgColor} flex items-center justify-center`}>
          <TypeIcon className="size-3.5" style={{ color: 'var(--text-primary)' }} />
        </div>
        <div
          className={`absolute -bottom-0.5 size-2 rounded-full ${config.dotColor} ring-2 ring-[--bg-surface]`}
          style={{ left: isRTL ? undefined : 14, right: isRTL ? 14 : undefined }}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 flex items-center gap-2">
        {/* Actor avatar */}
        <Avatar className="h-6 w-6 shrink-0 rounded-full">
          <AvatarImage src={item.actor.avatar_url || undefined} />
          <AvatarFallback className="bg-[#E50914]/20 text-[8px] text-[#E50914]">
            {item.actor.name.charAt(0)}
          </AvatarFallback>
        </Avatar>

        {/* Title + description */}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[--text-primary] truncate">
            <span className="font-semibold">{item.actor.name}</span>{' '}
            <span className="text-[--text-muted]">{item.description}</span>
          </p>
          {item.title && (
            <p className="text-xs text-[--text-secondary] truncate mt-0.5">{item.title}</p>
          )}
        </div>

        {/* Relative time */}
        <span className="shrink-0 text-[10px] text-[--text-muted] whitespace-nowrap">
          {getRelativeTime(item.created_at, isRTL)}
        </span>
      </div>
    </motion.div>
  )
}

// ─── Main Activity Timeline Widget ───────────────────────────────

export function ActivityTimelineWidget() {
  const { t, isRTL } = useI18n()
  const timelineItems = useActivityStore((s) => s.timelineItems)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [showAll, setShowAll] = useState(false)

  const DEFAULT_VISIBLE = 5
  const MAX_VISIBLE = 20

  // Filter items
  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return timelineItems
    if (activeFilter === 'tasks') {
      return timelineItems.filter((item) =>
        FILTER_TASK_TYPES.includes(item.type)
      )
    }
    const targetType = FILTER_MAP[activeFilter]
    if (targetType === 'all') return timelineItems
    return timelineItems.filter((item) => item.type === targetType)
  }, [timelineItems, activeFilter])

  // Group by time
  const groupedItems = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterdayStart = new Date(todayStart.getTime() - 86400000)
    const weekStart = new Date(todayStart.getTime() - 6 * 86400000)

    const groups: { label: string; items: TimelineItem[] }[] = []

    const todayItems = filteredItems.filter((item) => new Date(item.created_at) >= todayStart)
    const yesterdayItems = filteredItems.filter(
      (item) => {
        const d = new Date(item.created_at)
        return d >= yesterdayStart && d < todayStart
      }
    )
    const weekItems = filteredItems.filter((item) => {
      const d = new Date(item.created_at)
      return d >= weekStart && d < yesterdayStart
    })

    if (todayItems.length > 0) {
      groups.push({ label: t.activity.today, items: todayItems })
    }
    if (yesterdayItems.length > 0) {
      groups.push({ label: t.activity.yesterday, items: yesterdayItems })
    }
    if (weekItems.length > 0) {
      groups.push({ label: t.activity.thisWeek, items: weekItems })
    }

    return groups
  }, [filteredItems, t.activity.today, t.activity.yesterday, t.activity.thisWeek])

  // Determine visible items
  const visibleItems = useMemo(() => {
    if (showAll) {
      return groupedItems
        .flatMap((g) => g.items)
        .slice(0, MAX_VISIBLE)
    }

    let count = 0
    const result: { label: string; items: TimelineItem[] }[] = []
    for (const group of groupedItems) {
      const remaining = DEFAULT_VISIBLE - count
      if (remaining <= 0) break
      const items = group.items.slice(0, remaining)
      result.push({ label: group.label, items })
      count += items.length
    }
    return result.flatMap((g) =>
      g.items.map((item) => ({ ...item, groupLabel: g.label }))
    )
  }, [groupedItems, showAll])

  const totalItemCount = filteredItems.length
  const allFlat = groupedItems.flatMap((g) => g.items)

  // Filter pills config
  const filterPills: { key: FilterType; label: string }[] = [
    { key: 'all', label: t.activity.filterAll },
    { key: 'tasks', label: t.activity.filterTasks },
    { key: 'events', label: t.activity.filterEvents },
    { key: 'grocery', label: t.activity.filterGrocery },
    { key: 'chat', label: t.activity.filterChat },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="glass-card glass rounded-2xl border border-[--border-subtle] bg-[--bg-surface] dot-grid-bg shadow-[inset_0_1px_0_var(--border-subtle)] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 transition-all duration-200 p-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-[#E50914]" />
            <h3 className="text-sm font-semibold text-[--text-primary]">
              {t.activity.title}
            </h3>
          </div>
          <span className="text-xs text-[--text-muted]">
            {totalItemCount} {isRTL ? 'عنصر' : 'items'}
          </span>
        </div>

        {/* Filter Pills */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {filterPills.map((pill) => (
            <button
              key={pill.key}
              onClick={() => {
                setActiveFilter(pill.key)
                setShowAll(false)
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ${
                activeFilter === pill.key
                  ? 'bg-[#E50914] text-white'
                  : 'bg-[--bg-surface-2] text-[--text-muted] hover:text-[--text-primary] hover:bg-[--border-subtle]'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Timeline Content */}
        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="size-8 text-[--text-muted]/40 mb-2" />
              <p className="text-sm text-[--text-muted]">
                {t.activity.noActivity}
              </p>
            </div>
          ) : showAll ? (
            <AnimatePresence>
              {groupedItems.map((group) => (
                <div key={group.label}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[--text-muted] mb-2 mt-2 first:mt-0">
                    {group.label}
                  </p>
                  {group.items.slice(0, MAX_VISIBLE).map((item, index) => (
                    <TimelineItemRow
                      key={item.id}
                      item={item}
                      index={index}
                      isLast={index === group.items.length - 1}
                      isRTL={isRTL}
                    />
                  ))}
                </div>
              ))}
            </AnimatePresence>
          ) : (
            <AnimatePresence>
              {/* Grouped display for collapsed mode */}
              {(() => {
                let globalIndex = 0
                let remaining = DEFAULT_VISIBLE
                const elements: React.ReactNode[] = []

                for (const group of groupedItems) {
                  if (remaining <= 0) break
                  const items = group.items.slice(0, remaining)
                  elements.push(
                    <div key={group.label}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[--text-muted] mb-2 mt-2 first:mt-0">
                        {group.label}
                      </p>
                      {items.map((item, idx) => {
                        globalIndex++
                        return (
                          <TimelineItemRow
                            key={item.id}
                            item={item}
                            index={globalIndex - 1}
                            isLast={idx === items.length - 1}
                            isRTL={isRTL}
                          />
                        )
                      })}
                    </div>
                  )
                  remaining -= items.length
                }

                return elements
              })()}
            </AnimatePresence>
          )}
        </div>

        {/* Show More / Show Less */}
        {allFlat.length > DEFAULT_VISIBLE && (
          <div className="mt-3 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="h-7 text-xs text-[--text-muted] hover:text-[#E50914] gap-1"
            >
              {showAll ? (
                <>
                  {t.activity.showLess}
                  <ChevronUp className="size-3" />
                </>
              ) : (
                <>
                  {t.activity.showMore}
                  <ChevronDown className="size-3" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
