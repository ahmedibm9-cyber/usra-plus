'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle,
  AddCircle,
  CalendarMonth,
  ShoppingCart,
  Chat,
  PersonAdd,
  Timeline,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material'
import {
  Card,
  CardContent,
  Box,
  Typography,
  Avatar,
  Button,
  Chip,
  Divider,
  alpha,
  createTheme,
  ThemeProvider,
  Stack,
} from '@mui/material'

import { useActivityStore, type TimelineItem, type ActivityType } from '@/stores/activity-store'
import { useI18n } from '@/i18n/use-translation'

// ─── Teal theme ────────────────────────────────────────────────────

const tealTheme = createTheme({
  palette: {
    primary: { main: '#0D6B58' },
    secondary: { main: '#059669' },
  },
  shape: { borderRadius: 16 },
})

// ─── Activity Type Config ────────────────────────────────────────

const TIMELINE_TYPE_CONFIG: Record<ActivityType, {
  icon: React.ElementType
  dotColor: string
  bgColor: string
}> = {
  task_completed: {
    icon: CheckCircle,
    dotColor: '#0D6B58',
    bgColor: alpha('#0D6B58', 0.12),
  },
  task_created: {
    icon: AddCircle,
    dotColor: '#0D6B58',
    bgColor: alpha('#0D6B58', 0.12),
  },
  event_added: {
    icon: CalendarMonth,
    dotColor: '#0D6B58',
    bgColor: alpha('#0D6B58', 0.12),
  },
  event_created: {
    icon: CalendarMonth,
    dotColor: '#0D6B58',
    bgColor: alpha('#0D6B58', 0.12),
  },
  grocery_added: {
    icon: ShoppingCart,
    dotColor: '#059669',
    bgColor: alpha('#059669', 0.12),
  },
  grocery_checked: {
    icon: ShoppingCart,
    dotColor: '#059669',
    bgColor: alpha('#059669', 0.12),
  },
  message_sent: {
    icon: Chat,
    dotColor: '#0D6B58',
    bgColor: alpha('#0D6B58', 0.12),
  },
  member_joined: {
    icon: PersonAdd,
    dotColor: '#059669',
    bgColor: alpha('#059669', 0.12),
  },
}

// ─── Filter Pill Types ──────────────────────────────────────────

type FilterType = 'all' | 'tasks' | 'events' | 'grocery' | 'chat'

const FILTER_MAP: Record<FilterType, ActivityType | 'all'> = {
  all: 'all',
  tasks: 'task_completed',
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
    >
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1.25 }}>
        {/* Timeline line */}
        {!isLast && (
          <Box sx={{
            position: 'absolute', top: 32, bottom: 0, width: 1, bgcolor: 'divider',
            left: isRTL ? undefined : 11, right: isRTL ? 11 : undefined,
          }} />
        )}

        {/* Dot + Icon */}
        <Box sx={{ position: 'relative', mt: 0.25, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: config.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TypeIcon sx={{ fontSize: 14, color: 'text.primary' }} />
          </Box>
          <Box sx={{
            position: 'absolute', bottom: -2, width: 8, height: 8, borderRadius: '50%', bgcolor: config.dotColor,
            border: '2px solid', borderColor: 'background.paper',
            left: isRTL ? undefined : 14, right: isRTL ? 14 : undefined,
          }} />
        </Box>

        {/* Content */}
        <Box sx={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Actor avatar */}
          <Avatar
            src={item.actor.avatar_url || undefined}
            sx={{ width: 24, height: 24, flexShrink: 0, bgcolor: alpha('#0D6B58', 0.15), fontSize: 8, color: 'primary.main' }}
          >
            {item.actor.name.charAt(0)}
          </Avatar>

          {/* Title + description */}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <Box component="span" sx={{ fontWeight: 600 }}>{item.actor.name}</Box>{' '}
              <Box component="span" sx={{ color: 'text.secondary' }}>{item.description}</Box>
            </Typography>
            {item.title && (
              <Typography variant="caption" sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', mt: 0.25 }}>
                {item.title}
              </Typography>
            )}
          </Box>

          {/* Relative time */}
          <Typography variant="caption" sx={{ flexShrink: 0, color: 'text.secondary', fontSize: 10, whiteSpace: 'nowrap' }}>
            {getRelativeTime(item.created_at, isRTL)}
          </Typography>
        </Box>
      </Box>
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
    const yesterdayItems = filteredItems.filter((item) => {
      const d = new Date(item.created_at)
      return d >= yesterdayStart && d < todayStart
    })
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
    <ThemeProvider theme={tealTheme}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timeline sx={{ fontSize: 16, color: 'primary.main' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {t.activity.title}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {totalItemCount} {isRTL ? 'عنصر' : 'items'}
              </Typography>
            </Box>

            {/* Filter Pills */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
              {filterPills.map((pill) => (
                <Chip
                  key={pill.key}
                  size="small"
                  label={pill.label}
                  onClick={() => {
                    setActiveFilter(pill.key)
                    setShowAll(false)
                  }}
                  sx={{
                    borderRadius: 5,
                    fontSize: 12,
                    fontWeight: 500,
                    bgcolor: activeFilter === pill.key ? 'primary.main' : 'action.hover',
                    color: activeFilter === pill.key ? '#FFFFFF' : 'text.secondary',
                    '&:hover': {
                      bgcolor: activeFilter === pill.key ? 'primary.dark' : 'action.selected',
                    },
                    transition: 'all 0.2s',
                  }}
                />
              ))}
            </Box>

            {/* Timeline Content */}
            <Box sx={{ maxHeight: 384, overflowY: 'auto' }}>
              {filteredItems.length === 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4, textAlign: 'center' }}>
                  <Timeline sx={{ fontSize: 32, color: 'text.secondary', opacity: 0.4, mb: 1 }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {t.activity.noActivity}
                  </Typography>
                </Box>
              ) : showAll ? (
                <AnimatePresence>
                  {groupedItems.map((group) => (
                    <Box key={group.label}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, fontSize: 10, mb: 0.75, mt: 1, display: 'block' }}>
                        {group.label}
                      </Typography>
                      {group.items.slice(0, MAX_VISIBLE).map((item, index) => (
                        <TimelineItemRow
                          key={item.id}
                          item={item}
                          index={index}
                          isLast={index === group.items.length - 1}
                          isRTL={isRTL}
                        />
                      ))}
                    </Box>
                  ))}
                </AnimatePresence>
              ) : (
                <AnimatePresence>
                  {(() => {
                    let globalIndex = 0
                    let remaining = DEFAULT_VISIBLE
                    const elements: React.ReactNode[] = []

                    for (const group of groupedItems) {
                      if (remaining <= 0) break
                      const items = group.items.slice(0, remaining)
                      elements.push(
                        <Box key={group.label}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, fontSize: 10, mb: 0.75, mt: 1, display: 'block' }}>
                            {group.label}
                          </Typography>
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
                        </Box>
                      )
                      remaining -= items.length
                    }

                    return elements
                  })()}
                </AnimatePresence>
              )}
            </Box>

            {/* Show More / Show Less */}
            {allFlat.length > DEFAULT_VISIBLE && (
              <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center' }}>
                <Button
                  size="small"
                  onClick={() => setShowAll(!showAll)}
                  endIcon={showAll ? <ExpandLess sx={{ fontSize: 12 }} /> : <ExpandMore sx={{ fontSize: 12 }} />}
                  sx={{ fontSize: 12, textTransform: 'none', color: 'text.secondary' }}
                >
                  {showAll ? t.activity.showLess : t.activity.showMore}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </ThemeProvider>
  )
}
