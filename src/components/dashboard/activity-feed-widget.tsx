'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Timeline,
  Add,
  Check,
  CalendarToday,
  ShoppingCart,
  CheckBox,
  PersonAdd,
  Chat,
} from '@mui/icons-material'
import {
  Card,
  CardContent,
  Box,
  Typography,
  Avatar,
  Button,
  alpha,
  createTheme,
  ThemeProvider,
  Stack,
} from '@mui/material'

import { useActivityStore, type ActivityItem, type ActivityType } from '@/stores/activity-store'
import { usePresenceStore } from '@/stores/presence-store'
import { useI18n } from '@/i18n/use-translation'
import { useAppStore } from '@/stores/app-store'

// ─── Teal theme ────────────────────────────────────────────────────

const tealTheme = createTheme({
  palette: {
    primary: { main: '#0D6B58' },
    secondary: { main: '#F59E0B' },
  },
  shape: { borderRadius: 16 },
})

// ─── Activity Type Config ────────────────────────────────────────

const ACTIVITY_TYPE_CONFIG: Record<ActivityType, {
  icon: React.ElementType
  bgColor: string
  iconColor: string
}> = {
  task_created: {
    icon: Add,
    bgColor: alpha('#0D6B58', 0.15),
    iconColor: '#0D6B58',
  },
  task_completed: {
    icon: Check,
    bgColor: alpha('#0D6B58', 0.15),
    iconColor: '#0D6B58',
  },
  event_created: {
    icon: CalendarToday,
    bgColor: alpha('#0D6B58', 0.15),
    iconColor: '#0D6B58',
  },
  event_added: {
    icon: CalendarToday,
    bgColor: alpha('#0D6B58', 0.15),
    iconColor: '#0D6B58',
  },
  grocery_added: {
    icon: ShoppingCart,
    bgColor: alpha('#F59E0B', 0.15),
    iconColor: '#F59E0B',
  },
  grocery_checked: {
    icon: CheckBox,
    bgColor: alpha('#F59E0B', 0.15),
    iconColor: '#F59E0B',
  },
  member_joined: {
    icon: PersonAdd,
    bgColor: alpha('#0D6B58', 0.15),
    iconColor: '#0D6B58',
  },
  message_sent: {
    icon: Chat,
    bgColor: alpha('#9E9E9E', 0.15),
    iconColor: '#9E9E9E',
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
    >
      <Box sx={{
        position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 1.5,
        borderRadius: 1, p: 1.25,
        transition: 'background-color 0.2s',
        '&:hover': { bgcolor: alpha('#000', 0.02) },
        pb: isLast ? 1.25 : 2,
      }}>
        {/* Timeline line */}
        {!isLast && (
          <Box sx={{
            position: 'absolute', left: 16, top: 32, bottom: 0, width: 1, bgcolor: 'divider',
          }} />
        )}

        {/* Actor avatar with online indicator */}
        <Box sx={{ position: 'relative', mt: 0.25, flexShrink: 0 }}>
          <Avatar
            src={item.actor.avatar_url || undefined}
            sx={{
              width: 32, height: 32,
              border: '2px solid', borderColor: 'background.paper',
              bgcolor: alpha('#0D6B58', 0.15), fontSize: 10, color: 'primary.main',
            }}
          >
            {item.actor.name.charAt(0)}
          </Avatar>
          {isOnline && (
            <Box sx={{
              position: 'absolute', bottom: -2, right: -2,
              width: 10, height: 10, borderRadius: '50%',
              bgcolor: '#4CAF50',
              border: '2px solid', borderColor: 'background.paper',
            }} />
          )}
        </Box>

        {/* Content */}
        <Box sx={{ minWidth: 0, flex: 1, pt: 0.25 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.actor.name}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mt: 0.25 }}>
            {item.description}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.25, display: 'block' }}>
            {relativeTime}
          </Typography>
        </Box>

        {/* Activity type badge */}
        <Box sx={{ mt: 0.25, flexShrink: 0, width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: config.bgColor }}>
          <TypeIcon sx={{ fontSize: 14, color: config.iconColor }} />
        </Box>
      </Box>
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
    <ThemeProvider theme={tealTheme}>
      <MUICardWrapper delay={0.5}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Timeline sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {t.activityFeed.activity}
            </Typography>
          </Box>
          <Button
            size="small"
            onClick={() => setCurrentPage('dashboard')}
            sx={{ fontSize: 12, textTransform: 'none', color: 'text.secondary', minWidth: 0 }}
          >
            {t.activityFeed.viewAll}
          </Button>
        </Box>

        {/* Activity List */}
        <Box sx={{ maxHeight: 400, overflowY: 'auto' }}>
          {recentActivities.length === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4, textAlign: 'center' }}>
              <Timeline sx={{ fontSize: 32, color: 'text.secondary', opacity: 0.4, mb: 1 }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {isRTL ? 'لا يوجد نشاط حتى الآن' : 'No activity yet'}
              </Typography>
            </Box>
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
        </Box>
      </MUICardWrapper>
    </ThemeProvider>
  )
}

// ─── MUI Card wrapper helper ────────────────────────────────────

function MUICardWrapper({
  children,
  delay = 0,
}: {
  children: React.ReactNode
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <Card sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  )
}
