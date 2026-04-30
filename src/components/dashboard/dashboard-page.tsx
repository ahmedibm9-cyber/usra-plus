'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns'
import {
  CheckCircle2,
  CalendarDays,
  Users,
  ShoppingCart,
  Plus,
  MessageSquare,
  Clock,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ListTodo,
  Calendar,
  ShoppingBag,
  Activity,
  Home,
  UserPlus,
  Moon,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar } from 'recharts'

import { createClient } from '@/lib/supabase/client'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useTaskStore } from '@/stores/task-store'
import { useGroceryStore } from '@/stores/grocery-store'
import { useI18n } from '@/i18n/use-translation'
import type {
  Task,
  CalendarEvent,
  GroceryItem,
  FamilyMember,
  DashboardStats,
  TaskPriority,
} from '@/types'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'

// ─── Sub-components ─────────────────────────────────────────────

function CircularProgress({
  value,
  size = 80,
  strokeWidth = 6,
  color = '#6366F1',
  trackColor = 'rgba(255,255,255,0.06)',
}: {
  value: number
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-700 ease-out"
      />
    </svg>
  )
}

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
        className={`glass rounded-2xl border border-white/[0.08] bg-[#111117] ${className}`}
      >
        {children}
      </div>
    </motion.div>
  )
}

function StatCard({
  icon: Icon,
  value,
  label,
  subValue,
  progress,
  progressColor = '#6366F1',
  delay = 0,
  isLoading,
  trend,
  trendLabel,
}: {
  icon: React.ElementType
  value: string | number
  label: string
  subValue?: string
  progress?: number
  progressColor?: string
  delay?: number
  isLoading?: boolean
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
}) {
  return (
    <GlassCard delay={delay} className="stat-card-wrapper p-5">
      {isLoading ? (
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          {progress !== undefined ? (
            <div className="relative flex items-center justify-center">
              <CircularProgress value={progress} size={56} strokeWidth={5} color={progressColor} />
              <Icon className="absolute size-5" style={{ color: progressColor }} />
            </div>
          ) : (
            <div
              className="flex size-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${progressColor}15` }}
            >
              <Icon className="size-5" style={{ color: progressColor }} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold tracking-tight text-[#E5E7EB]">{value}</p>
              {trend && trend !== 'neutral' && (
                <span className={`flex items-center text-[10px] font-medium ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {trend === 'up' ? (
                    <TrendingUp className="size-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="size-3 mr-0.5" />
                  )}
                  {trendLabel}
                </span>
              )}
            </div>
            <p className="text-sm text-[#6B7280] truncate">{label}</p>
            {subValue && (
              <p className="mt-0.5 text-xs text-[#6B7280]/70 truncate">{subValue}</p>
            )}
          </div>
        </div>
      )}
    </GlassCard>
  )
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const config: Record<TaskPriority, { label: string; className: string }> = {
    low: {
      label: 'Low',
      className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    },
    medium: {
      label: 'Medium',
      className: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    },
    high: {
      label: 'High',
      className: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    },
    urgent: {
      label: 'Urgent',
      className: 'bg-red-500/15 text-red-400 border-red-500/20',
    },
  }
  const { label, className } = config[priority]
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${className}`}>
      {label}
    </Badge>
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

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-white/[0.04]">
        <Icon className="size-6 text-[#6B7280]" />
      </div>
      <p className="text-sm font-medium text-[#6B7280]">{title}</p>
      <p className="mt-1 text-xs text-[#6B7280]/60">{description}</p>
    </div>
  )
}

// ─── Activity Feed Item Types ───────────────────────────────────

interface ActivityItem {
  id: string
  type: 'task_completed' | 'task_created' | 'event_created' | 'grocery_added' | 'member_joined'
  message: string
  timestamp: string
  icon: React.ElementType
  color: string
}

// ─── Prayer Times Data (Static - Riyadh) ───────────────────────

const PRAYER_TIMES = [
  { name: 'Fajr', nameAr: 'الفجر', time: '4:30', hour: 4, minute: 30 },
  { name: 'Dhuhr', nameAr: 'الظهر', time: '12:00', hour: 12, minute: 0 },
  { name: 'Asr', nameAr: 'العصر', time: '3:30', hour: 15, minute: 30 },
  { name: 'Maghrib', nameAr: 'المغرب', time: '6:15', hour: 18, minute: 15 },
  { name: 'Isha', nameAr: 'العشاء', time: '8:00', hour: 20, minute: 0 },
]

// ─── Weekly Activity Data (Mock) ────────────────────────────────

const WEEKLY_ACTIVITY_DATA = [
  { day: 'Mon', dayAr: 'إثنين', tasks: 2 },
  { day: 'Tue', dayAr: 'ثلاثاء', tasks: 3 },
  { day: 'Wed', dayAr: 'أربعاء', tasks: 1 },
  { day: 'Thu', dayAr: 'خميس', tasks: 4 },
  { day: 'Fri', dayAr: 'جمعة', tasks: 2 },
  { day: 'Sat', dayAr: 'سبت', tasks: 5 },
  { day: 'Sun', dayAr: 'أحد', tasks: 3 },
]

// ─── Main Dashboard Component ───────────────────────────────────

export default function DashboardPage() {
  const { t, isRTL } = useI18n()
  const { user } = useAuthStore()
  const { currentFamily, setCurrentPage, setShowOnboarding, familyMembers, setFamilyMembers } =
    useAppStore()
  const taskStore = useTaskStore()
  const groceryStore = useGroceryStore()

  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

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

      // First, try to use Zustand store data (populated by demo mode or realtime)
      const storeTasks = taskStore.tasks
      const storeGrocery = groceryStore.items

      if (storeTasks.length > 0) {
        setTasks(storeTasks)
      }
      if (storeGrocery.length > 0) {
        setGroceryItems(storeGrocery)
      }

      // Then try Supabase (may fail if tables don't exist)
      const [tasksRes, eventsRes, groceryRes, membersRes] = await Promise.allSettled([
        supabase.from('tasks').select('*').eq('family_id', familyId),
        supabase
          .from('calendar_events')
          .select('*')
          .eq('family_id', familyId)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true }),
        supabase.from('grocery_items').select('*').eq('family_id', familyId),
        supabase
          .from('family_members')
          .select('*, profiles(*)')
          .eq('family_id', familyId),
      ])

      // Override with Supabase data if available (it's the source of truth)
      if (tasksRes.status === 'fulfilled' && tasksRes.value.data && tasksRes.value.data.length > 0) {
        setTasks(tasksRes.value.data as Task[])
      }
      if (eventsRes.status === 'fulfilled' && eventsRes.value.data) {
        setEvents(eventsRes.value.data as CalendarEvent[])
      }
      if (groceryRes.status === 'fulfilled' && groceryRes.value.data && groceryRes.value.data.length > 0) {
        setGroceryItems(groceryRes.value.data as GroceryItem[])
      }
      if (membersRes.status === 'fulfilled' && membersRes.value.data && membersRes.value.data.length > 0) {
        setFamilyMembers(membersRes.value.data as FamilyMember[])
      }
    } catch {
      // Don't set error if we have store data - just use what we have
      if (tasks.length === 0 && groceryItems.length === 0) {
        setError(t.common.error)
      }
    } finally {
      setIsLoading(false)
    }
  }, [currentFamily, supabase, setFamilyMembers, t.common.error, taskStore.tasks, groceryStore.items])

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

  // ─── Upcoming Tasks (next 5, not done) ──────────────────────

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

  // ─── Upcoming Events (next 3) ───────────────────────────────

  const upcomingEvents = useMemo(() => {
    return events.slice(0, 3)
  }, [events])

  // ─── Recent Activity ────────────────────────────────────────

  const recentActivity: ActivityItem[] = useMemo(() => {
    const activities: ActivityItem[] = []

    // Recent completed tasks
    tasks
      .filter((t) => t.status === 'done' && t.completed_at)
      .sort((a, b) => parseISO(b.completed_at!).getTime() - parseISO(a.completed_at!).getTime())
      .slice(0, 2)
      .forEach((task) => {
        activities.push({
          id: `task-done-${task.id}`,
          type: 'task_completed',
          message: `"${task.title}" completed`,
          timestamp: task.completed_at!,
          icon: CheckCircle2,
          color: '#22C55E',
        })
      })

    // Recent created tasks
    tasks
      .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime())
      .slice(0, 2)
      .forEach((task) => {
        if (task.status !== 'done') {
          activities.push({
            id: `task-created-${task.id}`,
            type: 'task_created',
            message: `"${task.title}" created`,
            timestamp: task.created_at,
            icon: ListTodo,
            color: '#6366F1',
          })
        }
      })

    // Recent events
    events.slice(0, 2).forEach((event) => {
      activities.push({
        id: `event-${event.id}`,
        type: 'event_created',
        message: `"${event.title}" upcoming`,
        timestamp: event.created_at,
        icon: Calendar,
        color: '#A78BFA',
      })
    })

    // Recent grocery items
    groceryItems
      .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime())
      .slice(0, 2)
      .forEach((item) => {
        activities.push({
          id: `grocery-${item.id}`,
          type: 'grocery_added',
          message: `"${item.name}" added to grocery list`,
          timestamp: item.created_at,
          icon: ShoppingBag,
          color: '#F59E0B',
        })
      })

    // Member joins
    familyMembers
      .sort((a, b) => parseISO(b.joined_at).getTime() - parseISO(a.joined_at).getTime())
      .slice(0, 1)
      .forEach((member) => {
        const name = member.profiles?.first_name || member.nickname || 'A member'
        activities.push({
          id: `member-${member.id}`,
          type: 'member_joined',
          message: `${name} joined the family`,
          timestamp: member.joined_at,
          icon: UserPlus,
          color: '#22C55E',
        })
      })

    // Sort all activities by timestamp
    return activities
      .sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime())
      .slice(0, 8)
  }, [tasks, events, groceryItems, familyMembers])

  // ─── Productivity Chart Data ────────────────────────────────

  const productivityChartData = useMemo(() => {
    return [
      { name: 'Score', value: stats.productivityScore },
      { name: 'Remaining', value: 100 - stats.productivityScore },
    ]
  }, [stats.productivityScore])

  // ─── Greeting ───────────────────────────────────────────────

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

  // ─── Prayer Times Logic ─────────────────────────────────────

  const nextPrayers = useMemo(() => {
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    // Find next upcoming prayer
    let nextIndex = PRAYER_TIMES.findIndex(p => p.hour * 60 + p.minute > currentMinutes)
    if (nextIndex === -1) nextIndex = 0 // wrap to next day (Fajr)

    // Return next 3 prayers
    const result = []
    for (let i = 0; i < 3; i++) {
      const idx = (nextIndex + i) % PRAYER_TIMES.length
      result.push({
        ...PRAYER_TIMES[idx],
        isNext: i === 0,
      })
    }
    return result
  }, [])

  // ─── Quick Actions ──────────────────────────────────────────

  const quickActions = [
    {
      label: t.dashboard.addTask,
      icon: Plus,
      page: 'tasks' as const,
      color: '#6366F1',
      onClick: () => setCurrentPage('tasks'),
    },
    {
      label: t.dashboard.addEvent,
      icon: CalendarDays,
      page: 'calendar' as const,
      color: '#A78BFA',
      onClick: () => setCurrentPage('calendar'),
    },
    {
      label: t.dashboard.addGrocery,
      icon: ShoppingCart,
      page: 'grocery' as const,
      color: '#22C55E',
      onClick: () => setCurrentPage('grocery'),
    },
    {
      label: 'Send Message',
      icon: MessageSquare,
      page: 'chat' as const,
      color: '#F59E0B',
      onClick: () => setCurrentPage('chat'),
    },
  ]

  // ─── No Family Onboarding ───────────────────────────────────

  if (!currentFamily) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md"
        >
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/20">
            <Home className="size-10 text-[#6366F1]" />
          </div>
          <h2 className="text-2xl font-bold text-[#E5E7EB] mb-2">{t.onboarding.welcome}</h2>
          <p className="text-[#6B7280] mb-8 leading-relaxed">
            Create or join a family to start managing your household together. Track tasks, plan
            events, share grocery lists, and more.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              onClick={() => setShowOnboarding(true)}
              className="bg-[#6366F1] hover:bg-[#6366F1]/90 text-white rounded-xl h-11 px-6"
            >
              <Plus className="size-4 mr-2" />
              {t.onboarding.createFamily}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowOnboarding(true)}
              className="border-white/[0.08] bg-[#111117] hover:bg-white/[0.04] text-[#E5E7EB] rounded-xl h-11 px-6"
            >
              {t.onboarding.joinFamily}
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ─── Error State ────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="size-8 text-red-500" />
          </div>
          <p className="text-lg font-semibold text-[#E5E7EB] mb-2">{t.common.error}</p>
          <p className="text-sm text-[#6B7280] mb-6">{error}</p>
          <Button
            onClick={fetchData}
            className="bg-[#6366F1] hover:bg-[#6366F1]/90 text-white rounded-xl"
          >
            {t.common.retry}
          </Button>
        </motion.div>
      </div>
    )
  }

  // ─── Dashboard Layout ───────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0B0B0F] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ─── Welcome Section with Animated Background ───────── */}
        <div className="relative overflow-hidden rounded-2xl">
          {/* Animated gradient mesh blobs */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="animate-float-blob-1 absolute -left-20 -top-10 h-60 w-60 rounded-full bg-indigo-500/[0.04] blur-3xl" />
            <div className="animate-float-blob-2 absolute -right-16 top-5 h-48 w-48 rounded-full bg-violet-500/[0.05] blur-3xl" />
            <div className="animate-float-blob-3 absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-indigo-400/[0.03] blur-3xl" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between px-2 py-3"
          >
            <div>
              <h1 className="text-2xl font-bold text-[#E5E7EB] sm:text-3xl">
                {greeting}
                {userName ? `, ${userName}` : ''} 👋
              </h1>
              <p className="mt-1 text-sm text-[#6B7280]">
                {currentDate} &middot; ١٤٤٦ هـ &middot; {currentFamily.name}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 self-start text-[#6B7280] hover:text-[#E5E7EB] sm:mt-0"
              onClick={() => setCurrentPage('settings')}
            >
              <Sparkles className="mr-1.5 size-4 text-[#6366F1]" />
              {currentFamily.name}
            </Button>
          </motion.div>
        </div>

        {/* ─── Stats Cards Row ────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            icon={CheckCircle2}
            value={isLoading ? '' : `${stats.completedTasks}/${stats.totalTasks}`}
            label={t.dashboard.tasksCompleted}
            subValue={
              !isLoading && stats.overdueTasks > 0
                ? `${stats.overdueTasks} ${t.dashboard.overdue.toLowerCase()}`
                : undefined
            }
            progress={isLoading ? 0 : stats.completionRate}
            progressColor="#6366F1"
            delay={0.05}
            isLoading={isLoading}
            trend="up"
            trendLabel="+12%"
          />
          <StatCard
            icon={CalendarDays}
            value={isLoading ? '' : stats.upcomingEvents}
            label={t.dashboard.upcomingEvents}
            progressColor="#A78BFA"
            delay={0.1}
            isLoading={isLoading}
            trend="neutral"
          />
          <StatCard
            icon={Users}
            value={isLoading ? '' : stats.familyMembers}
            label={t.dashboard.members}
            progressColor="#22C55E"
            delay={0.15}
            isLoading={isLoading}
            trend="up"
            trendLabel="+1"
          />
          <StatCard
            icon={ShoppingCart}
            value={isLoading ? '' : `${stats.groceryChecked}/${stats.groceryItems}`}
            label={t.dashboard.groceryReminders}
            progress={
              isLoading
                ? 0
                : stats.groceryItems > 0
                  ? Math.round((stats.groceryChecked / stats.groceryItems) * 100)
                  : 0
            }
            progressColor="#F59E0B"
            delay={0.2}
            isLoading={isLoading}
            trend="up"
            trendLabel="+3"
          />
        </div>

        {/* ─── Weekly Activity + Prayer Times Row ────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Weekly Activity Bar Chart */}
          <GlassCard delay={0.22} className="p-5 sm:col-span-1 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#E5E7EB]">
                {isRTL ? 'هذا الأسبوع' : 'This Week'}
              </h3>
              <span className="text-xs text-[#6B7280]">
                {isRTL ? 'المهام المنجزة' : 'Tasks completed'}
              </span>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={WEEKLY_ACTIVITY_DATA}
                  margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                >
                  <Bar
                    dataKey="tasks"
                    fill="#6366F1"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                    animationBegin={200}
                    animationDuration={600}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex justify-between px-1">
              {WEEKLY_ACTIVITY_DATA.map((d) => (
                <span key={d.day} className="text-[10px] text-[#6B7280]">
                  {isRTL ? d.dayAr : d.day}
                </span>
              ))}
            </div>
          </GlassCard>

          {/* Prayer Times Widget */}
          <GlassCard delay={0.24} className="p-5 sm:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <Moon className="size-4 text-[#A78BFA]" />
              <h3 className="text-sm font-semibold text-[#E5E7EB]">
                {isRTL ? 'أوقات الصلاة' : 'Prayer Times'}
              </h3>
            </div>
            <div className="space-y-2.5">
              {nextPrayers.map((prayer) => (
                <div
                  key={prayer.name}
                  className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                    prayer.isNext
                      ? 'border-[#6366F1]/30 bg-[#6366F1]/10'
                      : 'border-white/[0.04] bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex size-7 items-center justify-center rounded-md ${
                        prayer.isNext
                          ? 'bg-[#6366F1]/20'
                          : 'bg-white/[0.04]'
                      }`}
                    >
                      <Moon
                        className={`size-3.5 ${
                          prayer.isNext ? 'text-[#6366F1]' : 'text-[#6B7280]'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        prayer.isNext ? 'text-[#E5E7EB]' : 'text-[#6B7280]'
                      }`}
                    >
                      {isRTL ? prayer.nameAr : prayer.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold ${
                        prayer.isNext ? 'text-[#6366F1]' : 'text-[#E5E7EB]'
                      }`}
                    >
                      {prayer.time}
                    </span>
                    {prayer.isNext && (
                      <span className="rounded-full bg-[#6366F1]/20 px-2 py-0.5 text-[9px] font-medium text-[#6366F1]">
                        {isRTL ? 'التالي' : 'Next'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-[#6B7280]/60 text-center">
              {isRTL ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia'}
            </p>
          </GlassCard>
        </div>

        {/* ─── Middle Row: Productivity + Quick Actions ───────── */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Productivity Score Widget */}
          <GlassCard delay={0.25} className="p-6 lg:col-span-1">
            {isLoading ? (
              <div className="flex flex-col items-center">
                <Skeleton className="h-[140px] w-[140px] rounded-full" />
                <Skeleton className="mt-4 h-5 w-32" />
                <Skeleton className="mt-2 h-4 w-24" />
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="relative">
                  <PieChart width={160} height={160}>
                    <Pie
                      data={productivityChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={72}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                      animationBegin={200}
                      animationDuration={800}
                    >
                      <Cell fill="#6366F1" />
                      <Cell fill="rgba(255,255,255,0.04)" />
                    </Pie>
                  </PieChart>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-[#E5E7EB]">
                      {stats.productivityScore}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-[#6B7280]">
                      Score
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-sm font-semibold text-[#E5E7EB]">
                  {t.dashboard.productivityScore}
                </p>
                <p className="mt-1 text-xs text-[#6B7280] text-center">
                  Based on task completion &amp; grocery progress
                </p>
              </div>
            )}
          </GlassCard>

          {/* Quick Actions */}
          <GlassCard delay={0.3} className="p-6 lg:col-span-2">
            <h3 className="mb-4 text-sm font-semibold text-[#E5E7EB]">
              {t.dashboard.quickActions}
            </h3>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {quickActions.map((action) => (
                  <motion.button
                    key={action.label}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={action.onClick}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/[0.12] hover:bg-white/[0.04]"
                  >
                    <div
                      className="flex size-10 items-center justify-center rounded-lg transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${action.color}15` }}
                    >
                      <action.icon className="size-5" style={{ color: action.color }} />
                    </div>
                    <span className="text-xs font-medium text-[#E5E7EB]">{action.label}</span>
                  </motion.button>
                ))}
              </div>
            )}

            {/* Family Members Avatars Row */}
            {!isLoading && familyMembers.length > 0 && (
              <div className="mt-5 flex items-center gap-3 border-t border-white/[0.06] pt-4">
                <span className="text-xs text-[#6B7280]">{t.dashboard.members}:</span>
                <div className="flex -space-x-2">
                  {familyMembers.slice(0, 5).map((member) => (
                    <Avatar key={member.id} className="size-7 border-2 border-[#111117]">
                      <AvatarImage src={member.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="bg-[#6366F1]/20 text-[10px] text-[#A78BFA]">
                        {member.profiles?.first_name?.[0] || member.nickname?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {familyMembers.length > 5 && (
                    <div className="flex size-7 items-center justify-center rounded-full border-2 border-[#111117] bg-white/[0.06] text-[10px] text-[#6B7280]">
                      +{familyMembers.length - 5}
                    </div>
                  )}
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        {/* ─── Bottom Row: Tasks, Events, Grocery, Activity ──── */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Upcoming Tasks */}
          <GlassCard delay={0.35} className="p-5 lg:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#E5E7EB]">{t.dashboard.upcomingTasks}</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-[#6B7280] hover:text-[#6366F1]"
                onClick={() => setCurrentPage('tasks')}
              >
                {t.dashboard.viewAll}
                <ArrowRight className="ml-1 size-3" />
              </Button>
            </div>
            <ScrollArea className="max-h-72">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-lg" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : upcomingTasks.length === 0 ? (
                <EmptyState
                  icon={ListTodo}
                  title={t.dashboard.noTasks}
                  description="Create a task to get started"
                />
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {upcomingTasks.map((task, index) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] p-3 transition-colors hover:border-white/[0.08] hover:bg-white/[0.04]"
                      >
                        <div
                          className={`flex size-8 items-center justify-center rounded-lg ${
                            task.priority === 'urgent'
                              ? 'bg-red-500/10'
                              : task.priority === 'high'
                                ? 'bg-orange-500/10'
                                : task.priority === 'medium'
                                  ? 'bg-amber-500/10'
                                  : 'bg-emerald-500/10'
                          }`}
                        >
                          <ListTodo
                            className={`size-4 ${
                              task.priority === 'urgent'
                                ? 'text-red-400'
                                : task.priority === 'high'
                                  ? 'text-orange-400'
                                  : task.priority === 'medium'
                                    ? 'text-amber-400'
                                    : 'text-emerald-400'
                            }`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[#E5E7EB]">
                            {task.title}
                          </p>
                          <div className="mt-0.5 flex items-center gap-2">
                            {task.due_date && (
                              <span className="flex items-center gap-1 text-[10px] text-[#6B7280]">
                                <Clock className="size-3" />
                                {formatDueDate(task.due_date)}
                              </span>
                            )}
                          </div>
                        </div>
                        <PriorityBadge priority={task.priority} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>
          </GlassCard>

          {/* Upcoming Events + Grocery Reminders */}
          <div className="flex flex-col gap-4 lg:col-span-1">
            {/* Upcoming Events */}
            <GlassCard delay={0.4} className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#E5E7EB]">
                  {t.dashboard.upcomingEvents}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-[#6B7280] hover:text-[#A78BFA]"
                  onClick={() => setCurrentPage('calendar')}
                >
                  {t.dashboard.viewAll}
                  <ArrowRight className="ml-1 size-3" />
                </Button>
              </div>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-3 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : upcomingEvents.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title={t.dashboard.noEvents}
                  description="Schedule your first event"
                />
              ) : (
                <div className="space-y-2.5">
                  <AnimatePresence>
                    {upcomingEvents.map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] p-3 transition-colors hover:border-white/[0.08] hover:bg-white/[0.04]"
                      >
                        <div
                          className="size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: event.color || '#6366F1' }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[#E5E7EB]">
                            {event.title}
                          </p>
                          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[#6B7280]">
                            <Clock className="size-3" />
                            <span>{formatEventTime(event.start_time)}</span>
                            {event.all_day && (
                              <Badge
                                variant="outline"
                                className="border-white/[0.06] bg-white/[0.02] px-1 py-0 text-[9px] text-[#6B7280]"
                              >
                                All day
                              </Badge>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </GlassCard>

            {/* Grocery Reminders */}
            <GlassCard delay={0.45} className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#E5E7EB]">
                  {t.dashboard.groceryReminders}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-[#6B7280] hover:text-[#22C55E]"
                  onClick={() => setCurrentPage('grocery')}
                >
                  {t.dashboard.viewAll}
                  <ArrowRight className="ml-1 size-3" />
                </Button>
              </div>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-3 w-full rounded-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#6B7280]">
                        {stats.groceryChecked} of {stats.groceryItems} items
                      </span>
                      <span className="font-medium text-[#E5E7EB]">
                        {stats.groceryItems > 0
                          ? Math.round((stats.groceryChecked / stats.groceryItems) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        stats.groceryItems > 0
                          ? Math.round((stats.groceryChecked / stats.groceryItems) * 100)
                          : 0
                      }
                      className="h-2.5 bg-white/[0.06] [&>div]:bg-[#22C55E]"
                    />
                  </div>
                  {stats.groceryItems - stats.groceryChecked > 0 ? (
                    <p className="mt-3 text-xs text-[#6B7280]">
                      <ShoppingCart className="mr-1 inline size-3" />
                      {stats.groceryItems - stats.groceryChecked} items still needed
                    </p>
                  ) : stats.groceryItems > 0 ? (
                    <p className="mt-3 text-xs text-[#22C55E]">
                      <CheckCircle2 className="mr-1 inline size-3" />
                      All items checked off!
                    </p>
                  ) : (
                    <EmptyState
                      icon={ShoppingBag}
                      title={t.grocery.noItems}
                      description={t.grocery.noItemsDesc}
                    />
                  )}
                </>
              )}
            </GlassCard>
          </div>

          {/* Recent Activity */}
          <GlassCard delay={0.5} className="p-5 lg:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#E5E7EB]">{t.dashboard.recentActivity}</h3>
              <Activity className="size-4 text-[#6B7280]" />
            </div>
            <ScrollArea className="max-h-80">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-lg" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No recent activity"
                  description="Activity will appear here as your family uses USRA PLUS"
                />
              ) : (
                <div className="space-y-1">
                  <AnimatePresence>
                    {recentActivity.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-white/[0.02]"
                      >
                        <div
                          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${item.color}15` }}
                        >
                          <item.icon className="size-3.5" style={{ color: item.color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-[#E5E7EB]">{item.message}</p>
                          <p className="mt-0.5 text-[10px] text-[#6B7280]/60">
                            {format(parseISO(item.timestamp), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
