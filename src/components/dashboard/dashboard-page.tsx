'use client'

import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isToday, isTomorrow, isThisWeek, parseISO, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { CheckCircle, CalendarMonth, Group, ShoppingCart, Add, Chat, Schedule, Warning, AutoAwesome, ArrowForward, Checklist, CalendarToday, Home, DarkMode, TrendingUp, TrendingDown, Dashboard, BarChart, LocalFireDepartment, EmojiEvents, FormatQuote } from '@mui/icons-material'
import { ShoppingBag } from 'lucide-react'
import {
  Chip,
  Button,
  LinearProgress,
  Skeleton as MuiSkeleton,
  Avatar,
  Box,
  Container,
  Divider,
  Typography,
  IconButton,
  Stack,
  Grid,
  Paper,
  Tooltip,
  SvgIcon,
  alpha,
  useTheme,
  CircularProgress,
} from '@mui/material'
import { BarChart as RechartsBarChart, Bar, ResponsiveContainer } from 'recharts'

import { createClient } from '@/lib/supabase/client'
import { safeJsonResponse } from '@/lib/safe-fetch'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useTaskStore } from '@/stores/task-store'
import { useGroceryStore } from '@/stores/grocery-store'
import { useCurrentFamily, useCurrentUser, useIsDarkMode } from '@/stores/selectors'
import { useI18n } from '@/i18n/use-translation'
import type {
  Task,
  CalendarEvent,
  GroceryItem,
  FamilyMember,
  DashboardStats,
  TaskPriority,
} from '@/types'

import { AISummaryWidget } from '@/components/dashboard/ai-summary-widget'
import { WeatherWidget } from '@/components/dashboard/weather-widget'
import { ActivityTimelineWidget } from '@/components/dashboard/activity-timeline-widget'

// ─── Prayer Times Interface ──────────────────────────────────────

interface PrayerTimeData {
  name: string
  nameAr: string
  time: string
  hour: number
  minute: number
}

// ─── Productivity Ring (SvgIcon-based, uses theme) ───────────────

function ProductivityRing({ value, size = 80, strokeWidth = 6 }: { value: number; size?: number; strokeWidth?: number }) {
  const theme = useTheme()
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <SvgIcon
      sx={{ width: size, height: size, transform: 'rotate(-90deg)' }}
      viewBox={`0 0 ${size} ${size}`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={alpha(theme.palette.primary.main, 0.12)}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={theme.palette.primary.main}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        sx={{ transition: 'all 0.7s ease-out' }}
      />
    </SvgIcon>
  )
}

// ─── Animated Card Wrapper (uses Paper + motion) ─────────────────

function DashCard({
  children,
  delay = 0,
  variant = 'elevated',
  sx,
}: {
  children: React.ReactNode
  delay?: number
  variant?: 'elevated' | 'outlined' | 'filled'
  sx?: object
}) {
  const theme = useTheme()

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(delay, 0.15), ease: 'easeOut' }}
    >
      <Paper
        variant={variant === 'outlined' ? 'outlined' : undefined}
        elevation={variant === 'outlined' ? 0 : 1}
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': variant === 'elevated' ? {
            transform: 'translateY(-2px)',
            boxShadow: `0 8px 25px -5px ${alpha(theme.palette.primary.main, 0.12)}, 0 4px 10px -4px ${alpha(theme.palette.primary.main, 0.06)}`,
            borderColor: alpha(theme.palette.primary.main, 0.15),
          } : {},
          ...sx,
        }}
      >
        {children}
      </Paper>
    </motion.div>
  )
}

// ─── Stat Card ───────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  value,
  label,
  subValue,
  delay = 0,
  isLoading,
  trend,
  trendLabel,
}: {
  icon: React.ElementType
  value: string | number
  label: string
  subValue?: string
  delay?: number
  isLoading?: boolean
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
}) {
  const theme = useTheme()
  const [displayValue, setDisplayValue] = useState<string | number>(0)
  const [bounceScale, setBounceScale] = useState(1)
  const hasAnimated = useRef(false)

  const numericValue = useMemo(() => {
    if (typeof value === 'number') return value
    const parsed = parseInt(String(value), 10)
    return isNaN(parsed) ? 0 : parsed
  }, [value])

  const isFraction = typeof value === 'string' && value.includes('/')

  useEffect(() => {
    if (isLoading || hasAnimated.current) return

    let rafId: number | null = null
    let bounceTimeoutId: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    function cleanup() {
      if (rafId !== null) cancelAnimationFrame(rafId)
      if (bounceTimeoutId !== null) clearTimeout(bounceTimeoutId)
    }

    if (isFraction) {
      const parts = String(value).split('/')
      const num = parseInt(parts[0], 10) || 0
      const den = parseInt(parts[1], 10) || 0
      const duration = 800
      const startTime = Date.now()

      function animate() {
        if (cancelled) return
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        const currentNum = Math.round(eased * num)
        const currentDen = Math.round(eased * den)
        setDisplayValue(`${currentNum}/${currentDen}`)
        if (progress < 1) {
          rafId = requestAnimationFrame(animate)
        } else {
          setDisplayValue(value)
          setBounceScale(1.05)
          bounceTimeoutId = setTimeout(() => setBounceScale(1.0), 150)
        }
      }

      hasAnimated.current = true
      rafId = requestAnimationFrame(animate)
    } else {
      const duration = 800
      const startTime = Date.now()

      function animate() {
        if (cancelled) return
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setDisplayValue(Math.round(eased * numericValue))
        if (progress < 1) {
          rafId = requestAnimationFrame(animate)
        } else {
          setDisplayValue(numericValue)
          setBounceScale(1.05)
          bounceTimeoutId = setTimeout(() => setBounceScale(1.0), 150)
        }
      }

      hasAnimated.current = true
      rafId = requestAnimationFrame(animate)
    }

    return () => {
      cancelled = true
      cleanup()
    }
  }, [isLoading, numericValue, value, isFraction])

  useEffect(() => {
    hasAnimated.current = false
  }, [value])

  return (
    <DashCard delay={delay} sx={{ p: 2.5 }}>
      {isLoading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <MuiSkeleton variant="rounded" width={40} height={40} sx={{ borderRadius: 3 }} />
          <Box sx={{ flex: 1 }}>
            <MuiSkeleton width="40%" height={20} />
            <MuiSkeleton width="60%" height={12} sx={{ mt: 0.5 }} />
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 3,
              bgcolor: 'primary.light',
              opacity: 0.85,
            }}
          >
            <Icon sx={{ fontSize: 18, color: 'primary.dark' }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {label}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
              <motion.div animate={{ scale: bounceScale }} transition={{ duration: 0.15, ease: 'easeOut' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {displayValue}
                </Typography>
              </motion.div>
              {trend && trend !== 'neutral' && (
                <Chip
                  size="small"
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                      {trend === 'up' ? <TrendingUp sx={{ fontSize: 10 }} /> : <TrendingDown sx={{ fontSize: 10 }} />}
                      {trendLabel}
                    </Box>
                  }
                  sx={{
                    height: 18,
                    fontSize: 9,
                    fontWeight: 600,
                    px: 0.5,
                    bgcolor: trend === 'up' ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.primary.main, 0.08),
                    color: 'primary.main',
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
              )}
            </Box>
            {subValue && (
              <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7, mt: 0.25, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {subValue}
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </DashCard>
  )
}

// ─── Priority Badge (theme-based) ────────────────────────────────

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const theme = useTheme()
  const config: Record<TaskPriority, { label: string; opacity: number }> = {
    low: { label: 'Low', opacity: 0.3 },
    medium: { label: 'Medium', opacity: 0.55 },
    high: { label: 'High', opacity: 0.78 },
    urgent: { label: 'Urgent', opacity: 1 },
  }
  const { label, opacity: bgOpacity } = config[priority]
  return (
    <Chip
      size="small"
      label={label}
      variant="outlined"
      sx={{
        height: 18,
        fontSize: 10,
        px: 0.5,
        bgcolor: alpha(theme.palette.primary.main, bgOpacity * 0.15),
        color: alpha(theme.palette.primary.main, 0.4 + bgOpacity * 0.6),
        borderColor: alpha(theme.palette.primary.main, bgOpacity * 0.25),
        '& .MuiChip-label': { px: 0.75 },
      }}
    />
  )
}

function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    const date = parseISO(dateStr)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    if (isThisWeek(date)) return format(date, 'EEE')
    return format(date, 'MMM d')
  } catch {
    return ''
  }
}

function formatEventTime(dateStr: string): string {
  try {
    const date = parseISO(dateStr)
    return format(date, 'h:mm a')
  } catch {
    return ''
  }
}

// ─── Empty State ─────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4 }}>
      <Box sx={{ width: 64, height: 64, borderRadius: 3, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
        <Icon sx={{ fontSize: 32, color: 'text.secondary' }} />
      </Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>{title}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', maxWidth: 280 }}>{description}</Typography>
    </Box>
  )
}

// ─── Prayer Times: Dynamic Fetch from Aladhan API ───────────────

const FALLBACK_PRAYER_TIMES: PrayerTimeData[] = [
  { name: 'Fajr', nameAr: 'الفجر', time: '4:30', hour: 4, minute: 30 },
  { name: 'Dhuhr', nameAr: 'الظهر', time: '12:00', hour: 12, minute: 0 },
  { name: 'Asr', nameAr: 'العصر', time: '3:30', hour: 15, minute: 30 },
  { name: 'Maghrib', nameAr: 'المغرب', time: '6:15', hour: 18, minute: 15 },
  { name: 'Isha', nameAr: 'العشاء', time: '7:45', hour: 19, minute: 45 },
]

function usePrayerTimes() {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimeData[]>(FALLBACK_PRAYER_TIMES)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPrayerTimes() {
      try {
        const today = new Date()
        const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`
        const response = await fetch(
          `https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=Riyadh&country=Saudi Arabia&method=4`
        )
        if (!response.ok) throw new Error('API error')
        const data = await safeJsonResponse<{ data?: { timings?: Record<string, string> } }>(response)
        const timings = data?.data?.timings
        if (!timings) throw new Error('No timings data')

        const parseTime = (timeStr: string): { hour: number; minute: number; formatted: string } => {
          const clean = timeStr.split(' ')[0]
          const [h, m] = clean.split(':').map(Number)
          const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h
          return { hour: h, minute: m, formatted: `${hour12}:${m.toString().padStart(2, '0')}` }
        }

        const names = [
          { key: 'Fajr', nameAr: 'الفجر' },
          { key: 'Dhuhr', nameAr: 'الظهر' },
          { key: 'Asr', nameAr: 'العصر' },
          { key: 'Maghrib', nameAr: 'المغرب' },
          { key: 'Isha', nameAr: 'العشاء' },
        ]

        const times: PrayerTimeData[] = names.map(({ key, nameAr }) => {
          const parsed = parseTime(timings[key] || '0:00')
          return { name: key, nameAr, time: parsed.formatted, hour: parsed.hour, minute: parsed.minute }
        })

        setPrayerTimes(times)
      } catch {
        setPrayerTimes(FALLBACK_PRAYER_TIMES)
      } finally {
        setLoading(false)
      }
    }
    fetchPrayerTimes()
  }, [])

  return { prayerTimes, loading }
}

// ─── Weekly Activity Data (derived from task store) ──────────────

const DAY_LABELS = [
  { en: 'Mon', ar: 'إثنين' },
  { en: 'Tue', ar: 'ثلاثاء' },
  { en: 'Wed', ar: 'أربعاء' },
  { en: 'Thu', ar: 'خميس' },
  { en: 'Fri', ar: 'جمعة' },
  { en: 'Sat', ar: 'سبت' },
  { en: 'Sun', ar: 'أحد' },
]

function useWeeklyActivityData(tasks: Task[], isRTL: boolean) {
  return useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

    return days.map((day, idx) => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const completed = tasks.filter(
        (t) => t.status === 'done' && t.completed_at && format(parseISO(t.completed_at), 'yyyy-MM-dd') === dayStr
      ).length
      return {
        day: DAY_LABELS[idx]?.en || '',
        dayAr: DAY_LABELS[idx]?.ar || '',
        tasks: completed,
      }
    })
  }, [tasks, isRTL])
}

// ─── Motivational Quotes (Bilingual) ────────────────────────────────

const MOTIVATIONAL_QUOTES = [
  { en: 'The best time to plant a tree was 20 years ago. The second best time is now.', ar: 'خير وقت لزراعة شجرة كان قبل 20 عاماً. ثاني أفضل وقت هو الآن.' },
  { en: 'A smooth sea never made a skilled sailor.', ar: 'البحر الهادئ لا يصنع بحاراً ماهراً.' },
  { en: 'Small daily improvements lead to stunning results.', ar: 'التحسينات اليومية الصغيرة تؤدي لنتائج مذهلة.' },
  { en: 'Family is not an important thing. It\'s everything.', ar: 'العائلة ليست شيئاً مهماً. إنها كل شيء.' },
  { en: 'The secret of getting ahead is getting started.', ar: 'سر التقدم هو البدء.' },
] as const

// ─── Main Dashboard Component ───────────────────────────────────

export default function DashboardPage() {
  const theme = useTheme()
  const { t, isRTL } = useI18n()
  const user = useCurrentUser()
  const currentFamily = useCurrentFamily()
  const setCurrentPage = useAppStore((state) => state.setCurrentPage)
  const setShowOnboarding = useAppStore((state) => state.setShowOnboarding)
  const familyMembers = useAppStore((state) => state.familyMembers)
  const setFamilyMembers = useAppStore((state) => state.setFamilyMembers)

  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { prayerTimes } = usePrayerTimes()
  const weeklyActivityData = useWeeklyActivityData(tasks, isRTL)

  const [visibleWidgets, setVisibleWidgets] = useState<'primary' | 'secondary' | 'tertiary'>('primary')

  useEffect(() => {
    if (!isLoading) {
      const secondaryTimer = setTimeout(() => setVisibleWidgets('secondary'), 300)
      const tertiaryTimer = setTimeout(() => setVisibleWidgets('tertiary'), 600)
      return () => {
        clearTimeout(secondaryTimer)
        clearTimeout(tertiaryTimer)
      }
    }
  }, [isLoading])

  const supabase = useMemo(() => createClient(), [])

  // ─── Fetch Data ─────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!currentFamily) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const familyId = currentFamily.id

      const storeTasks = useTaskStore.getState().tasks
      const storeGrocery = useGroceryStore.getState().items

      if (storeTasks.length > 0) {
        setTasks(storeTasks)
      }
      if (storeGrocery.length > 0) {
        setGroceryItems(storeGrocery)
      }

      const needTasksFetch = storeTasks.length === 0
      const needGroceryFetch = storeGrocery.length === 0
      const needEventsFetch = true
      const needMembersFetch = familyMembers.length === 0

      const queries: Promise<unknown>[] = []
      const queryKeys: string[] = []

      if (needTasksFetch) {
        queries.push(supabase.from('tasks').select('*').eq('family_id', familyId))
        queryKeys.push('tasks')
      }
      if (needEventsFetch) {
        queries.push(
          supabase
            .from('calendar_events')
            .select('*')
            .eq('family_id', familyId)
            .gte('start_time', new Date().toISOString())
            .order('start_time', { ascending: true })
        )
        queryKeys.push('events')
      }
      if (needGroceryFetch) {
        queries.push(supabase.from('grocery_items').select('*').eq('family_id', familyId))
        queryKeys.push('grocery')
      }
      if (needMembersFetch) {
        queries.push(
          supabase
            .from('family_members')
            .select('*, profiles(*)')
            .eq('family_id', familyId)
        )
        queryKeys.push('members')
      }

      if (queries.length > 0) {
        const results = await Promise.allSettled(queries)

        let resultIdx = 0
        for (const key of queryKeys) {
          const res = results[resultIdx]
          resultIdx++

          if (res.status !== 'fulfilled') continue
          const data = (res.value as { data?: unknown[] })?.data

          if (key === 'tasks' && data && data.length > 0) {
            setTasks(data as Task[])
          } else if (key === 'events' && data) {
            setEvents(data as CalendarEvent[])
          } else if (key === 'grocery' && data && data.length > 0) {
            setGroceryItems(data as GroceryItem[])
          } else if (key === 'members' && data && data.length > 0) {
            setFamilyMembers(data as FamilyMember[])
          }
        }
      }
    } catch {
      if (tasks.length === 0 && groceryItems.length === 0) {
        setError(t.common.error)
      }
    } finally {
      setIsLoading(false)
    }
  }, [currentFamily, supabase, setFamilyMembers])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ─── Computed Stats ─────────────────────────────────────────

  const stats: DashboardStats = useMemo(() => {
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t) => t.status === 'done').length
    const pendingTasks = tasks.filter((t) => t.status !== 'done').length
    const now = new Date()
    const overdueTasks = tasks.filter(
      (t) => t.status !== 'done' && t.due_date && parseISO(t.due_date) < now
    ).length
    const upcomingEvents = events.length
    const members = familyMembers.length
    const groceryTotal = groceryItems.length
    const groceryChecked = groceryItems.filter((i) => i.checked).length
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    const productivityScore = Math.min(100, Math.round(completionRate * 0.7 + (groceryTotal > 0 ? (groceryChecked / groceryTotal) * 30 : 15)))

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      familyMembers: members,
      upcomingEvents,
      groceryItems: groceryTotal,
      groceryChecked,
      completionRate,
      productivityScore,
    }
  }, [tasks, events, groceryItems, familyMembers])

  const upcomingTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'done')
      .sort((a, b) => {
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return parseISO(a.due_date).getTime() - parseISO(b.due_date).getTime()
      })
      .slice(0, 5)
  }, [tasks])

  const upcomingEvents = useMemo(() => {
    return events.slice(0, 3)
  }, [events])

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  const currentDate = useMemo(() => format(new Date(), 'EEEE, MMMM d'), [])

  const userName = useMemo(() => {
    if (user?.first_name) return user.first_name
    return ''
  }, [user])

  const nextPrayers = useMemo(() => {
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    let nextIndex = prayerTimes.findIndex(p => p.hour * 60 + p.minute > currentMinutes)
    if (nextIndex === -1) nextIndex = 0
    const result: { name: string; nameAr: string; time: string; hour: number; minute: number; isNext: boolean }[] = []
    for (let i = 0; i < 3; i++) {
      const idx = (nextIndex + i) % prayerTimes.length
      result.push({ ...prayerTimes[idx], isNext: i === 0 })
    }
    return result
  }, [prayerTimes])

  const dailyQuote = useMemo(() => {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
    return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length]
  }, [])

  const streak = useMemo(() => {
    return stats.completionRate > 0 ? Math.max(1, Math.min(30, Math.floor(stats.completionRate / 10) + 3)) : 0
  }, [stats.completionRate])

  const quickActions = [
    { label: t.dashboard.addTask, icon: Add, onClick: () => setCurrentPage('tasks') },
    { label: t.dashboard.addEvent, icon: CalendarMonth, onClick: () => setCurrentPage('calendar') },
    { label: t.dashboard.addGrocery, icon: ShoppingCart, onClick: () => setCurrentPage('grocery') },
    { label: 'Send Message', icon: Chat, onClick: () => setCurrentPage('chat') },
  ]

  // ─── No Family Onboarding ───────────────────────────────────

  if (!currentFamily) {
    return (
      <Container maxWidth="sm" sx={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ textAlign: 'center', maxWidth: 400, mx: 'auto' }}>
            <Box sx={{ mx: 'auto', mb: 3, width: 80, height: 80, borderRadius: 4, bgcolor: alpha(theme.palette.primary.main, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Home sx={{ fontSize: 40, color: 'primary.main' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>{t.onboarding.welcome}</Typography>
            <Typography sx={{ color: 'text.secondary', mb: 4, lineHeight: 1.6 }}>
              Create or join a family to start managing your household together. Track tasks, plan
              events, share grocery lists, and more.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'center' }}>
              <Button variant="contained" onClick={() => setShowOnboarding(true)} startIcon={<Add />}>
                {t.onboarding.createFamily}
              </Button>
              <Button variant="outlined" onClick={() => setShowOnboarding(true)}>
                {t.onboarding.joinFamily}
              </Button>
            </Stack>
          </Box>
        </motion.div>
      </Container>
    )
  }

  // ─── Error State ────────────────────────────────────────────

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Box sx={{ textAlign: 'center', maxWidth: 360, mx: 'auto' }}>
            <Box sx={{ mx: 'auto', mb: 2, width: 64, height: 64, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Warning sx={{ fontSize: 32, color: 'primary.main' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{t.common.error}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>{error}</Typography>
            <Button variant="contained" onClick={fetchData}>
              {t.common.retry}
            </Button>
          </Box>
        </motion.div>
      </Container>
    )
  }

  // ─── Dashboard Layout ───────────────────────────────────────

  return (
    <Container maxWidth="lg" sx={{ bgcolor: 'background.default', overflowX: 'hidden', py: { xs: 1, lg: 2 } }}>
      <Stack spacing={{ xs: 1.5, lg: 2.5 }}>

        {/* ─── Welcome Section ──────── */}
        <Box sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 4,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)}, ${alpha(theme.palette.primary.dark, 0.04)}, ${alpha(theme.palette.secondary.light, 0.06)})`,
          border: '1px solid',
          borderColor: alpha(theme.palette.primary.main, 0.1),
        }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { md: 'center' },
              justifyContent: { md: 'space-between' },
              gap: 2,
              px: { xs: 2, lg: 3 },
              py: { xs: 2, lg: 2.5 },
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {/* Productivity Ring */}
                {!isLoading && (
                  <Box sx={{ position: 'relative', flexShrink: 0 }}>
                    <ProductivityRing value={stats.productivityScore} size={64} strokeWidth={5} />
                    <Box sx={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'primary.main' }}>
                        {stats.productivityScore}
                      </Typography>
                    </Box>
                  </Box>
                )}
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '1.875rem' } }}>
                    {greeting}{userName ? `, ` : ''}{userName && (
                      <Box
                        component="span"
                        sx={{
                          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.light})`,
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        {userName}
                      </Box>
                    )} 👋
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {currentDate} · <Box component="span" sx={{ color: 'primary.main', fontWeight: 500 }}>{currentFamily.name}</Box>
                    </Typography>
                    {streak > 0 && (
                      <Chip
                        size="small"
                        icon={<LocalFireDepartment sx={{ fontSize: 12 }} />}
                        label={`${streak} day streak`}
                        sx={{
                          height: 22,
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          bgcolor: alpha(theme.palette.warning.main, 0.1),
                          color: theme.palette.warning.dark,
                          border: '1px solid',
                          borderColor: alpha(theme.palette.warning.main, 0.2),
                          '& .MuiChip-icon': { color: theme.palette.warning.main },
                        }}
                      />
                    )}
                  </Box>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  variant="text"
                  startIcon={<AutoAwesome sx={{ color: 'primary.main', fontSize: 16 }} />}
                  onClick={() => setCurrentPage('settings')}
                  sx={{ mt: { xs: 1, md: 0 }, alignSelf: { xs: 'flex-start', md: 'auto' }, borderRadius: 2, textTransform: 'none', color: 'text.secondary' }}
                >
                  {currentFamily.name}
                </Button>
              </Box>
            </Box>

            {/* Motivational Quote */}
            {!isLoading && (
              <Box sx={{ px: { xs: 2, lg: 3 }, pb: { xs: 2, lg: 2.5 }, pt: 0 }}>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  p: 1.5,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  border: '1px solid',
                  borderColor: alpha(theme.palette.primary.main, 0.06),
                }}>
                  <FormatQuote sx={{ fontSize: 16, color: 'primary.main', opacity: 0.6, mt: 0.25, flexShrink: 0 }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic', lineHeight: 1.6, display: 'block' }}>
                      {isRTL ? dailyQuote.ar : dailyQuote.en}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </motion.div>
        </Box>

        {/* ─── Stat Cards Row ── */}
        <Grid container spacing={{ xs: 1.5, lg: 2 }}>
          <Grid size={{ xs: 6, lg: 3 }}>
            <StatCard
              icon={CheckCircle}
              value={isLoading ? '' : `${stats.completedTasks}/${stats.totalTasks}`}
              label={t.dashboard.tasksCompleted}
              subValue={
                !isLoading && stats.overdueTasks > 0
                  ? `${stats.overdueTasks} ${t.dashboard.overdue.toLowerCase()}`
                  : undefined
              }
              delay={0.05}
              isLoading={isLoading}
              trend="up"
              trendLabel="+12%"
            />
          </Grid>
          <Grid size={{ xs: 6, lg: 3 }}>
            <StatCard
              icon={CalendarMonth}
              value={isLoading ? '' : stats.upcomingEvents}
              label={t.dashboard.upcomingEvents}
              delay={0.1}
              isLoading={isLoading}
              trend="neutral"
            />
          </Grid>
          <Grid size={{ xs: 6, lg: 3 }}>
            <StatCard
              icon={Group}
              value={isLoading ? '' : stats.familyMembers}
              label={t.dashboard.members}
              delay={0.15}
              isLoading={isLoading}
              trend="up"
              trendLabel="+1"
            />
          </Grid>
          <Grid size={{ xs: 6, lg: 3 }}>
            <StatCard
              icon={ShoppingCart}
              value={isLoading ? '' : `${stats.groceryChecked}/${stats.groceryItems}`}
              label={t.dashboard.groceryReminders}
              delay={0.2}
              isLoading={isLoading}
              trend="up"
              trendLabel="+3"
            />
          </Grid>
        </Grid>

        {/* ─── AI Summary ── Secondary ──── */}
        <Box>
          {visibleWidgets === 'primary' ? (
            <DashCard sx={{ p: 2.5 }}>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MuiSkeleton variant="rounded" width={20} height={20} />
                  <MuiSkeleton width="30%" height={16} />
                </Box>
                <MuiSkeleton height={80} />
              </Stack>
            </DashCard>
          ) : (
            <AISummaryWidget tasks={tasks} groceryItems={groceryItems} events={events} members={familyMembers} isLoading={isLoading} />
          )}
        </Box>

        {/* ─── Weekly Chart + Prayer Times + Weather ── */}
        <Grid container spacing={{ xs: 2, lg: 3 }}>
          {/* Weekly Activity Bar Chart */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <DashCard delay={0.22} sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
                  <BarChart sx={{ fontSize: 16, color: 'primary.main' }} />
                  {isRTL ? 'هذا الأسبوع' : 'This Week'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {isRTL ? 'المهام المنجزة' : 'Tasks completed'}
                </Typography>
              </Box>
              <Box sx={{ height: { xs: 180, lg: 200 }, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={weeklyActivityData}
                    margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                  >
                    <Bar
                      dataKey="tasks"
                      fill={theme.palette.primary.main}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={32}
                      animationBegin={200}
                      animationDuration={600}
                    />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5, mt: 1 }}>
                {weeklyActivityData.map((d) => (
                  <Typography key={d.day} variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
                    {isRTL ? d.dayAr : d.day}
                  </Typography>
                ))}
              </Box>
            </DashCard>
          </Grid>

          {/* Prayer Times + Weather */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Stack spacing={{ xs: 2, lg: 3 }}>
              {/* Prayer Times Widget */}
              <DashCard delay={0.24} variant="filled" sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <DarkMode sx={{ fontSize: 16, color: 'secondary.main' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {isRTL ? 'أوقات الصلاة' : 'Prayer Times'}
                  </Typography>
                </Box>
                <Stack spacing={1}>
                  {nextPrayers.map((prayer) => (
                    <Box
                      key={prayer.name}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: prayer.isNext ? alpha(theme.palette.primary.main, 0.3) : 'divider',
                        bgcolor: prayer.isNext ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.text.primary, 0.02),
                        p: 1.25,
                        transition: 'background-color 0.2s',
                        '&:hover': {
                          bgcolor: prayer.isNext ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.text.primary, 0.04),
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 1.5,
                            bgcolor: prayer.isNext ? alpha(theme.palette.primary.main, 0.15) : 'action.hover',
                          }}
                        >
                          <DarkMode sx={{ fontSize: 12, color: prayer.isNext ? 'primary.main' : 'text.secondary' }} />
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500, color: prayer.isNext ? 'text.primary' : 'text.secondary' }}
                        >
                          {isRTL ? prayer.nameAr : prayer.name}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, color: prayer.isNext ? 'primary.main' : 'text.primary' }}
                        >
                          {prayer.time}
                        </Typography>
                        {prayer.isNext && (
                          <Chip
                            size="small"
                            label={isRTL ? 'التالي' : 'Next'}
                            sx={{
                              height: 18,
                              fontSize: 9,
                              fontWeight: 500,
                              bgcolor: alpha(theme.palette.primary.main, 0.12),
                              color: 'primary.main',
                              '& .MuiChip-label': { px: 0.75 },
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  ))}
                </Stack>
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 1, color: 'text.secondary', opacity: 0.6, fontSize: 10 }}>
                  {isRTL ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia'}
                </Typography>
              </DashCard>

              {/* Weather Widget ── Secondary */}
              {visibleWidgets === 'primary' ? (
                <DashCard sx={{ p: 2.5 }}>
                  <Stack spacing={1.5}>
                    <MuiSkeleton width="40%" height={16} />
                    <MuiSkeleton width="25%" height={32} />
                    <MuiSkeleton height={16} />
                  </Stack>
                </DashCard>
              ) : (
                <WeatherWidget />
              )}
            </Stack>
          </Grid>
        </Grid>

        {/* ─── Activity Timeline + Quick Actions + Upcoming ── */}
        <Grid container spacing={{ xs: 2, lg: 3 }}>
          {/* Activity Timeline ── Tertiary */}
          <Grid size={{ xs: 12, lg: 6 }}>
            {visibleWidgets === 'tertiary' ? (
              <ActivityTimelineWidget />
            ) : (
              <DashCard sx={{ p: 2.5 }}>
                <Stack spacing={1.5}>
                  <MuiSkeleton width="30%" height={16} />
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <MuiSkeleton variant="circular" width={32} height={32} />
                      <Box sx={{ flex: 1 }}>
                        <MuiSkeleton width="75%" height={12} />
                        <MuiSkeleton width="50%" height={8} sx={{ mt: 0.5 }} />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </DashCard>
            )}
          </Grid>

          {/* Right Column: Quick Actions + Upcoming Tasks/Events/Grocery */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Stack spacing={{ xs: 2, lg: 3 }}>
              {/* Quick Actions */}
              <DashCard delay={0.3} variant="outlined" sx={{ p: 2.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                  {t.dashboard.quickActions}
                </Typography>
                {isLoading ? (
                  <Grid container spacing={1}>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Grid key={i} size={{ xs: 6, sm: 3 }}>
                        <MuiSkeleton variant="rounded" height={64} sx={{ borderRadius: 3 }} />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Grid container spacing={1}>
                    {quickActions.map((action) => (
                      <Grid key={action.label} size={{ xs: 6, sm: 3 }}>
                        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                          <Button
                            fullWidth
                            onClick={action.onClick}
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 0.75,
                              borderRadius: 3,
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: alpha(theme.palette.text.primary, 0.02),
                              py: 1.5,
                              px: 1,
                              textTransform: 'none',
                              color: 'text.secondary',
                              '&:hover': {
                                bgcolor: alpha(theme.palette.primary.main, 0.06),
                                borderColor: alpha(theme.palette.primary.main, 0.2),
                              },
                            }}
                          >
                            <Box sx={{
                              width: 40,
                              height: 40,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 2.5,
                              bgcolor: alpha(theme.palette.primary.main, 0.12),
                              transition: 'all 0.2s',
                              '.MuiButton-root:hover &': { transform: 'scale(1.1)', bgcolor: alpha(theme.palette.primary.main, 0.18) },
                            }}>
                              <action.icon sx={{ fontSize: 18, color: 'primary.main' }} />
                            </Box>
                            <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 500, lineHeight: 1.2 }}>
                              {action.label}
                            </Typography>
                          </Button>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                )}

                {/* Family Members Avatars Row */}
                {!isLoading && familyMembers.length > 0 && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t.dashboard.members}:</Typography>
                      <Box sx={{ display: 'flex', '& > *:not(:first-of-type)': { ml: -0.5 } }}>
                        {familyMembers.slice(0, 5).map((member) => (
                          <Tooltip key={member.id} title={member.profiles?.first_name || member.nickname || ''}>
                            <Avatar
                              src={member.profiles?.avatar_url || undefined}
                              sx={{
                                width: 24,
                                height: 24,
                                border: '2px solid',
                                borderColor: 'background.paper',
                                fontSize: 9,
                                bgcolor: alpha(theme.palette.primary.main, 0.15),
                                color: 'primary.main',
                              }}
                            >
                              {member.profiles?.first_name?.[0] || member.nickname?.[0] || '?'}
                            </Avatar>
                          </Tooltip>
                        ))}
                        {familyMembers.length > 5 && (
                          <Avatar sx={{
                            width: 24,
                            height: 24,
                            border: '2px solid',
                            borderColor: 'background.paper',
                            fontSize: 9,
                            bgcolor: 'action.hover',
                            color: 'text.secondary',
                          }}>
                            +{familyMembers.length - 5}
                          </Avatar>
                        )}
                      </Box>
                    </Box>
                  </>
                )}
              </DashCard>

              {/* Upcoming Tasks */}
              <DashCard delay={0.35} variant="outlined" sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{t.dashboard.upcomingTasks}</Typography>
                  <Button
                    variant="text"
                    size="small"
                    endIcon={<ArrowForward sx={{ fontSize: 12 }} />}
                    onClick={() => setCurrentPage('tasks')}
                    sx={{ fontSize: 12, textTransform: 'none', color: 'text.secondary', minWidth: 0 }}
                  >
                    {t.dashboard.viewAll}
                  </Button>
                </Box>
                <Box sx={{ maxHeight: 256, overflowY: 'auto' }}>
                  {isLoading ? (
                    <Stack spacing={1}>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <MuiSkeleton variant="rounded" width={20} height={20} sx={{ borderRadius: 1 }} />
                          <Box sx={{ flex: 1 }}>
                            <MuiSkeleton width="75%" height={16} />
                            <MuiSkeleton width="33%" height={12} sx={{ mt: 0.5 }} />
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  ) : upcomingTasks.length === 0 ? (
                    <EmptyState
                      icon={Dashboard}
                      title="Welcome to your dashboard"
                      description="Start by creating your first task or adding family members"
                    />
                  ) : (
                    <Stack spacing={0.75}>
                      <AnimatePresence>
                        {upcomingTasks.map((task, index) => {
                          const priorityOpacity = task.priority === 'urgent' ? 1 : task.priority === 'high' ? 0.78 : task.priority === 'medium' ? 0.55 : 0.3
                          return (
                            <motion.div
                              key={task.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1.25,
                                  borderRadius: 3,
                                  border: '1px solid',
                                  borderColor: 'divider',
                                  bgcolor: alpha(theme.palette.text.primary, 0.02),
                                  p: 1.25,
                                  transition: 'background-color 0.2s',
                                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 1.5,
                                    flexShrink: 0,
                                    bgcolor: alpha(theme.palette.primary.main, priorityOpacity * 0.1),
                                  }}
                                >
                                  <Checklist sx={{ fontSize: 14, color: alpha(theme.palette.primary.main, 0.4 + priorityOpacity * 0.6) }} />
                                </Box>
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {task.title}
                                  </Typography>
                                  {task.due_date && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                                      <Schedule sx={{ fontSize: 12, color: 'text.secondary' }} />
                                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
                                        {formatDueDate(task.due_date)}
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                                <PriorityBadge priority={task.priority} />
                              </Box>
                            </motion.div>
                          )
                        })}
                      </AnimatePresence>
                    </Stack>
                  )}
                </Box>
              </DashCard>

              {/* Upcoming Events */}
              <DashCard delay={0.4} sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{t.dashboard.upcomingEvents}</Typography>
                  <Button
                    variant="text"
                    size="small"
                    endIcon={<ArrowForward sx={{ fontSize: 12 }} />}
                    onClick={() => setCurrentPage('calendar')}
                    sx={{ fontSize: 12, textTransform: 'none', color: 'text.secondary', minWidth: 0 }}
                  >
                    {t.dashboard.viewAll}
                  </Button>
                </Box>
                {isLoading ? (
                  <Stack spacing={1.5}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <MuiSkeleton variant="circular" width={12} height={12} />
                        <Box sx={{ flex: 1 }}>
                          <MuiSkeleton width="75%" height={16} />
                          <MuiSkeleton width="33%" height={12} sx={{ mt: 0.5 }} />
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                ) : upcomingEvents.length === 0 ? (
                  <EmptyState
                    icon={CalendarToday}
                    title={t.dashboard.noEvents}
                    description="Schedule your first event"
                  />
                ) : (
                  <Stack spacing={1.25}>
                    <AnimatePresence>
                      {upcomingEvents.map((event, index) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.5,
                              borderRadius: 3,
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: alpha(theme.palette.text.primary, 0.02),
                              p: 1.5,
                              transition: 'background-color 0.2s',
                              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
                            }}
                          >
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                flexShrink: 0,
                                bgcolor: event.color || theme.palette.primary.main,
                              }}
                            />
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {event.title}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                                <Schedule sx={{ fontSize: 12, color: 'text.secondary' }} />
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
                                  {formatEventTime(event.start_time)}
                                </Typography>
                                {event.all_day && (
                                  <Chip
                                    size="small"
                                    label="All day"
                                    variant="outlined"
                                    sx={{ height: 16, fontSize: 9, '& .MuiChip-label': { px: 0.5 } }}
                                  />
                                )}
                              </Box>
                            </Box>
                          </Box>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </Stack>
                )}
              </DashCard>

              {/* Grocery Reminders */}
              <DashCard delay={0.45} sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{t.dashboard.groceryReminders}</Typography>
                  <Button
                    variant="text"
                    size="small"
                    endIcon={<ArrowForward sx={{ fontSize: 12 }} />}
                    onClick={() => setCurrentPage('grocery')}
                    sx={{ fontSize: 12, textTransform: 'none', color: 'text.secondary', minWidth: 0 }}
                  >
                    {t.dashboard.viewAll}
                  </Button>
                </Box>
                {isLoading ? (
                  <Stack spacing={1.5}>
                    <MuiSkeleton height={12} sx={{ borderRadius: 5 }} />
                    <MuiSkeleton width="50%" height={16} />
                  </Stack>
                ) : (
                  <>
                    <Stack spacing={1}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {stats.groceryChecked} of {stats.groceryItems} items
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 500 }}>
                          {stats.groceryItems > 0
                            ? Math.round((stats.groceryChecked / stats.groceryItems) * 100)
                            : 0}
                          %
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={
                          stats.groceryItems > 0
                            ? Math.round((stats.groceryChecked / stats.groceryItems) * 100)
                            : 0
                        }
                        sx={{
                          height: 10,
                          borderRadius: 5,
                          bgcolor: 'action.hover',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 5,
                            bgcolor: 'secondary.main',
                          },
                        }}
                      />
                    </Stack>
                    {stats.groceryItems - stats.groceryChecked > 0 ? (
                      <Typography variant="caption" sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                        <ShoppingCart sx={{ fontSize: 12 }} />
                        {stats.groceryItems - stats.groceryChecked} items still needed
                      </Typography>
                    ) : stats.groceryItems > 0 ? (
                      <Typography variant="caption" sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.5, color: 'primary.main' }}>
                        <CheckCircle sx={{ fontSize: 12 }} />
                        All items checked off!
                      </Typography>
                    ) : (
                      <EmptyState
                        icon={ShoppingBag}
                        title={t.grocery.noItems}
                        description={t.grocery.noItemsDesc}
                      />
                    )}
                  </>
                )}
              </DashCard>
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </Container>
  )
}
