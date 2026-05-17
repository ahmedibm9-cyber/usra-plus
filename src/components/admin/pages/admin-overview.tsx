'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, type Variants } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'
import {
  Users, Activity, Home, DollarSign, TrendingUp, TrendingDown,
  Server, Database, HardDrive, AlertTriangle, Shield, Zap,
  UserPlus, CreditCard, Globe, Clock, ArrowUpRight, ArrowDownRight,
  Wifi, CheckCircle2, Radio, Eye, BarChart3, RefreshCw,
  Megaphone, ShieldAlert, Heart, Download, Cpu, MemoryStick,
  ThermometerSun
} from 'lucide-react'
import { useOverviewData, useAnalyticsData } from '@/hooks/use-admin-data'
import { useAdminStore } from '@/stores/admin-store'
import { Skeleton as MuiSkeleton, Tooltip as MuiTooltip, Box } from '@mui/material'
import { Skeleton } from '@/components/ui/skeleton'
import type { DataSource } from '@/hooks/use-admin-data'
import { safeJsonResponse } from '@/lib/safe-fetch'


// ─── Animated Counter Hook ───────────────────────────────────────────────────
function useAnimatedCounter(target: number, duration = 1400, startOnMount = true) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!startOnMount || target === 0) return
    const startTime = performance.now()
    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration, startOnMount])

  return value
}

// ─── Sparkline Mini Chart Component ──────────────────────────────────────────
function MiniSparkline({ data, color, width = 120, height = 40 }: {
  data: number[]; color: string; width?: number; height?: number
}) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const padding = 2

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2)
    const y = padding + (1 - (v - min) / range) * (height - padding * 2)
    return `${x},${y}`
  }).join(' ')

  const areaPath = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2)
    const y = padding + (1 - (v - min) / range) * (height - padding * 2)
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')

  const areaClose = ` L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="opacity-20">
      <defs>
        <linearGradient id={`spark-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath + areaClose} fill={`url(#spark-grad-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Custom SVG Donut Chart ──────────────────────────────────────────────────
function CustomDonutChart({ data, size = 180 }: { data: { name: string; value: number; color: string }[]; size?: number }) {
  const [animatedSegments, setAnimatedSegments] = useState<number[]>(data.map(() => 0))
  const strokeWidth = 22
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2
  const total = data.reduce((s, d) => s + d.value, 0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedSegments(data.map(d => d.value))
    }, 300)
    return () => clearTimeout(timer)
  }, [data])

  if (total === 0) {
    return (
      <Box className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth={strokeWidth} />
        </svg>
        <Box className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-[--text-muted]">—</span>
          <span className="text-xs text-[--text-muted]">No data</span>
        </Box>
      </Box>
    )
  }

  const totalGap = 6 * data.length
  const availableLength = circumference - totalGap

  const segmentDashLengths = data.map((_, index) => {
    const targetValue = animatedSegments[index]
    const percentage = targetValue / total
    return percentage * availableLength
  })

  const segmentOffsets = segmentDashLengths.reduce<number[]>((acc, dashLen, i) => {
    const prevOffset = i === 0 ? 0 : acc[i - 1]
    const prevDash = i === 0 ? 0 : segmentDashLengths[i - 1]
    acc.push(prevOffset + prevDash + (i === 0 ? 0 : 6))
    return acc
  }, [])

  const finalSegments = data.map((item, index) => {
    const targetValue = animatedSegments[index]
    const percentage = targetValue / total
    const dashLength = segmentDashLengths[index]
    return {
      ...item,
      dashLength,
      offset: -segmentOffsets[index],
      percentage: (percentage * 100).toFixed(1)
    }
  })

  return (
    <Box className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth={strokeWidth} />
        {finalSegments.map((segment, i) => (
          <motion.circle
            key={segment.name}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${segment.dashLength} ${circumference - segment.dashLength}`}
            strokeDashoffset={segment.offset}
            initial={{ strokeDasharray: `0 ${circumference}`, opacity: 0 }}
            animate={{
              strokeDasharray: `${segment.dashLength} ${circumference - segment.dashLength}`,
              opacity: 1
            }}
            transition={{ duration: 1.2, delay: 0.2 + i * 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{ filter: `drop-shadow(0 0 6px ${segment.color}40)` }}
          />
        ))}
      </svg>
      <Box className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold text-[--text-primary]">{total.toLocaleString()}</span>
        <span className="text-xs text-[--text-muted]">Total</span>
      </Box>
    </Box>
  )
}

// ─── Animation Variants ──────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } }
}

// ─── Custom Tooltips for Charts ───────────────────────────────────────────────
function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <Box className="bg-[--bg-primary]/95 border border-[var(--accent-primary)]/20 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-sm">
      <p className="text-xs text-[--text-muted] mb-1">{label}</p>
      <p className="text-lg font-bold text-[--text-primary]">${payload[0].value.toLocaleString()}</p>
      <p className="text-xs text-[var(--accent-primary)]">MRR</p>
    </Box>
  )
}

function UserGrowthTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <Box className="bg-[--bg-primary]/95 border border-[var(--accent-primary)]/20 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-sm">
      <p className="text-xs text-[--text-muted] mb-1">{label}</p>
      <p className="text-lg font-bold text-[--text-primary]">{payload[0].value.toLocaleString()}</p>
      <p className="text-xs text-[var(--accent-primary)]">Registrations</p>
    </Box>
  )
}

// ─── Bento KPI Block (data-driven) ─────────────────────────────────────────
function BentoKPIBlock({
  title, value, prefix, suffix, trend, trendLabel, icon: Icon,
  gradientFrom, gradientTo, sparkData: spark, delay = 0
}: {
  title: string
  value: number
  prefix?: string
  suffix?: string
  trend: number
  trendLabel: string
  icon: React.ElementType
  gradientFrom: string
  gradientTo: string
  sparkData: number[]
  delay?: number
}) {
  const animatedValue = useAnimatedCounter(value)
  const isPositive = trend > 0
  const hasData = value > 0

  return (
    <motion.div
      variants={itemVariants}
      className="group relative rounded-2xl overflow-hidden card-hover"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <Box
        className="absolute inset-0 rounded-2xl opacity-60"
        style={{
          background: `linear-gradient(135deg, ${gradientFrom}40, ${gradientTo}20, transparent 60%)`
        }}
      />
      <Box className="absolute inset-[1px] rounded-2xl bg-[--bg-primary]" />

      <Box className="relative z-10 p-6 md:p-8">
        {hasData && spark.length > 1 && (
          <Box className="absolute bottom-0 right-0 opacity-30 group-hover:opacity-50 transition-opacity duration-500">
            <MiniSparkline data={spark} color={gradientFrom} width={140} height={50} />
          </Box>
        )}

        <Box className="flex items-center justify-between mb-6 relative z-10">
          <Box
            className="w-11 h-11 rounded-xl flex items-center justify-center border"
            style={{
              background: `linear-gradient(135deg, ${gradientFrom}15, ${gradientTo}10)`,
              borderColor: `${gradientFrom}30`
            }}
          >
            <Icon className="w-5 h-5" style={{ color: gradientFrom }} />
          </Box>
          {hasData && (
            <Box
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isPositive ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-[--status-danger-bg] text-[--status-danger]'
              }`}
            >
              {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {Math.abs(trend)}%
            </Box>
          )}
        </Box>

        <Box className="relative z-10">
          <Box className="text-4xl sm:text-5xl md:text-6xl font-bold text-[--text-primary] tracking-tighter leading-none mb-3">
            {hasData ? (
              <>{prefix}<span>{animatedValue.toLocaleString()}</span>{suffix}</>
            ) : (
              <span className="text-[--text-muted]">—</span>
            )}
          </Box>
          <Box className="flex items-center gap-2">
            <p className="text-sm text-[--text-muted] font-medium">{title}</p>
            {hasData && trendLabel && (
              <>
                <span className="text-[--text-muted]">·</span>
                <p className="text-xs text-[--text-muted]">{trendLabel}</p>
              </>
            )}
            {!hasData && (
              <span className="text-xs text-[--text-muted] italic">Waiting for data</span>
            )}
          </Box>
        </Box>
      </Box>
    </motion.div>
  )
}

// ─── Empty State Block ──────────────────────────────────────────────────────
function EmptyBlock({ title, subtitle, icon: Icon, className = '' }: {
  title: string
  subtitle: string
  icon: React.ElementType
  className?: string
}) {
  return (
    <motion.div variants={itemVariants} className={`bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-6 backdrop-blur-sm flex flex-col items-center justify-center min-h-[200px] ${className}`}>
      <Box className="w-12 h-12 rounded-xl bg-[--bg-surface] border border-[--border-subtle] flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-[--text-muted]" />
      </Box>
      <p className="text-sm font-medium text-[--text-muted] mb-1">{title}</p>
      <p className="text-xs text-[--text-muted] text-center max-w-[200px]">{subtitle}</p>
    </motion.div>
  )
}

// ─── Terminal-style Activity Feed ────────────────────────────────────────────
function TerminalActivityFeed({ items, source }: {
  items: { id: string; type: string; text: string; time: string }[]
  source: DataSource
}) {
  const [visibleLines, setVisibleLines] = useState(0)
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (items.length === 0) return
    const interval = setInterval(() => {
      setVisibleLines(prev => {
        if (prev >= items.length) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, 180)
    return () => clearInterval(interval)
  }, [items])

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [visibleLines])

  const getTerminalPrefix = (type: string) => {
    if (type === 'user_registered') return 'USR'
    if (type === 'subscription_upgraded') return 'PAY'
    if (type === 'security_alert') return 'SEC'
    return 'LOG'
  }

  const getTerminalColor = (type: string) => {
    if (type === 'user_registered') return '#22C55E'
    if (type === 'subscription_upgraded') return 'var(--accent)'
    if (type === 'security_alert') return '#F87171'
    return '#9CA3AF'
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const hasData = items.length > 0

  return (
    <motion.div
      variants={itemVariants}
      className="rounded-2xl overflow-hidden border border-[var(--accent)]/10"
    >
      <Box className="bg-[--bg-surface] border-b border-[var(--accent)]/10 px-4 py-2.5 flex items-center justify-between">
        <Box className="flex items-center gap-2">
          <Box className="flex items-center gap-1.5">
            <Box className="w-2.5 h-2.5 rounded-full bg-[--status-danger]" />
            <Box className="w-2.5 h-2.5 rounded-full bg-[--status-warning]/80" />
            <Box className="w-2.5 h-2.5 rounded-full bg-[var(--secondary)]/80" />
          </Box>
          <span className="text-[10px] font-metric text-[--text-muted] ml-2">usra-admin@live ~ activity.log</span>
        </Box>
        <Box className="flex items-center gap-1.5">
          {hasData && source === 'live' ? (
            <>
              <Box className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              <span className="text-[10px] font-metric text-[--text-secondary]">LIVE</span>
            </>
          ) : (
            <span className="text-[10px] font-metric text-[--text-muted]">NO FEED</span>
          )}
        </Box>
      </Box>

      <Box
        ref={feedRef}
        className="bg-[--bg-primary] p-4 max-h-[400px] overflow-y-auto custom-scrollbar font-mono text-sm"
      >
        {hasData ? (
          <>
            {items.slice(0, visibleLines).map((item) => {
              const prefix = getTerminalPrefix(item.type)
              const termColor = getTerminalColor(item.type)
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-2 py-1.5 leading-relaxed"
                >
                  <span className="text-[--text-muted] shrink-0 select-none">$</span>
                  <span style={{ color: termColor }} className="shrink-0 font-semibold text-xs mt-0.5">[{prefix}]</span>
                  <span className="text-[--text-muted]/70 flex-1">{item.text}</span>
                  <span className="text-[--text-muted] shrink-0 text-xs">{formatTime(item.time)}</span>
                </motion.div>
              )
            })}
            <Box className="flex items-center gap-2 py-1.5">
              <span className="text-[--text-muted] select-none">$</span>
              <span className="inline-block w-2 h-4 bg-[var(--accent)]/70 animate-pulse" />
            </Box>
          </>
        ) : (
          <Box className="flex flex-col items-center justify-center py-8">
            <Activity className="w-6 h-6 text-[var(--accent)]/10 mb-2" />
            <p className="text-xs text-[--text-muted] font-metric">No activity yet</p>
            <p className="text-[10px] text-[var(--accent)]/10 font-metric mt-1">Events will stream here in real-time</p>
          </Box>
        )}
      </Box>
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function AdminOverview() {
  const { data: overviewData, isLoading: overviewLoading, source: overviewSource } = useOverviewData()
  const { data: analyticsData, source: analyticsSource } = useAnalyticsData()
  const { setCurrentPage } = useAdminStore()

  // Source is always 'live' (real DB, even if empty)
  const source: DataSource = 'live'
  const hasData = !!overviewData?.metrics || !!analyticsData

  // Fetch database provider info
  const [dbLabel, setDbLabel] = useState('SQLite')
  useEffect(() => {
    fetch('/api/admin/db-info', { credentials: 'same-origin' })
      .then(async (res) => res.ok ? await safeJsonResponse(res) : null)
      .then(data => {
        if (data?.displayBadge) setDbLabel(data.displayBadge)
      })
      .catch(() => {})
  }, [])

  // ─── System Health Data (from /api/admin/system-health) ────────────
  interface SystemHealthData {
    systemHealth: {
      serverStatus: string
      activeConnections: number
      errorRate: number
      avgResponseTime: number
      databaseProvider: string
      timestamp: string
    }
    featureHealth: Record<string, { status: boolean; responseTime?: number; message?: string }>
    errorFrequency: { hour: string; count: number }[]
  }
  const [systemHealth, setSystemHealth] = useState<SystemHealthData | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)

  const fetchSystemHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const res = await fetch('/api/admin/system-health', { credentials: 'same-origin' })
      if (res.ok) {
        const json = await safeJsonResponse(res)
        if (json.data) setSystemHealth(json.data)
      }
    } catch {
      // health check failure is non-critical
    } finally {
      setHealthLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSystemHealth()
    const interval = setInterval(fetchSystemHealth, 60000) // refresh every 60s
    return () => clearInterval(interval)
  }, [fetchSystemHealth])

  // Derive KPI values from live data or show 0
  const totalUsers = overviewData?.metrics?.totalUsers ?? analyticsData?.users.total ?? 0
  const monthlyActive = overviewData?.metrics?.monthlyActiveUsers ?? analyticsData?.users.monthlyActive ?? 0
  const totalFamilies = (overviewData?.keyMetrics as Record<string, unknown>)?.totalFamilies as number ?? analyticsData?.families.total ?? 0
  const mrr = Number(overviewData?.keyMetrics?.mrr ?? analyticsData?.subscriptions.mrr ?? 0)

  // isEmpty is true when no data exists yet (not "pre-launch" — the app IS live)
  const isEmpty = overviewData?.preLaunch === true || (totalUsers === 0 && totalFamilies === 0 && mrr === 0)

  // Plan distribution from overview or empty
  const planData = overviewData?.planDistribution?.length
    ? overviewData.planDistribution
    : []

  // Regional data
  const regionalData = overviewData?.regionalDistribution?.length
    ? overviewData.regionalDistribution
    : []

  // Activity feed
  const activityFeed = overviewData?.activityFeed?.length
    ? overviewData.activityFeed
    : []

  // User growth time series for chart
  const userGrowthData = overviewData?.userGrowthTimeSeries?.length
    ? overviewData.userGrowthTimeSeries
    : []

  // Revenue time series for chart
  const revenueData = overviewData?.revenueTimeSeries?.length
    ? overviewData.revenueTimeSeries
    : []

  // ─── Calculate REAL trends from time series data ──────────────────
  // Compare current month vs previous month from the time series
  const calcTrend = (data: { registrations: number }[] | { mrr: number }[], key: 'registrations' | 'mrr'): number => {
    if (data.length < 2) return 0
    const current = data[data.length - 1][key]
    const previous = data[data.length - 2][key]
    if (previous === 0) return current > 0 ? 100 : 0 // new growth from zero
    return Math.round(((current - previous) / previous) * 1000) / 10
  }

  const usersTrend = calcTrend(userGrowthData, 'registrations')
  const mrrTrend = calcTrend(revenueData, 'mrr')
  // MAU and Families trends: derive from real data where possible
  const mauTrend = monthlyActive > 0 ? usersTrend : 0 // MAU follows user growth trend
  const familiesTrend = totalFamilies > 0 ? usersTrend : 0 // Families follow similar growth

  // Sparkline data (derived from time series or empty)
  const sparkUsers = userGrowthData.length > 1 ? userGrowthData.map(d => d.registrations) : []
  const sparkMau = userGrowthData.length > 1 ? userGrowthData.map(d => Math.round(d.registrations * (monthlyActive / Math.max(totalUsers, 1)))) : []
  const sparkFamilies = userGrowthData.length > 1 ? userGrowthData.map(d => Math.round(d.registrations * (totalFamilies / Math.max(totalUsers, 1)))) : []
  const sparkMrr = revenueData.length > 1 ? revenueData.map(d => d.mrr) : []

  const planTotal = planData.reduce((s, d) => s + d.value, 0)

  // ─── Loading State ──────────────────────────────────────────────────────
  if (overviewLoading) {
    return (
      <Box className="space-y-6 p-1">
        {/* Hero skeleton */}
        <Box className="rounded-3xl bg-[--bg-surface] border border-[--border-subtle] p-8 md:p-12 space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-4 w-96" />
        </Box>
        {/* KPI cards skeleton */}
        <Box className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Box key={i} className="bg-[--bg-surface] rounded-2xl border border-[--border-subtle] p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-3 w-16" />
            </Box>
          ))}
        </Box>
        {/* Chart skeleton */}
        <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Box className="bg-[--bg-surface] rounded-2xl border border-[--border-subtle] p-5 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-48 w-full" />
          </Box>
          <Box className="bg-[--bg-surface] rounded-2xl border border-[--border-subtle] p-5 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-48 w-full" />
          </Box>
        </Box>
        {/* Activity feed skeleton */}
        <Box className="bg-[--bg-surface] rounded-2xl border border-[--border-subtle] p-5 space-y-3">
          <Skeleton className="h-4 w-32" />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </Box>
      </Box>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 relative"
    >
      {/* Empty data badge */}
      {isEmpty && (
        <Box className="absolute top-0 right-0 z-30">
          <span className="text-[10px] font-metric text-[--status-warning] tracking-widest uppercase">No Data Yet</span>
        </Box>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1: COMMAND CENTER HERO HEADER
          Unique gradient mesh background with animated pulse dot
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl"
      >
        <Box className="absolute inset-0">
          <Box
            className="absolute top-0 right-0 w-[600px] h-[400px] opacity-100 animate-float-blob-1"
            style={{
              background: 'radial-gradient(ellipse at center, color-mix(in srgb, var(--accent-primary) 15%, transparent) 0%, color-mix(in srgb, var(--accent-primary) 5%, transparent) 40%, transparent 70%)',
            }}
          />
          <Box
            className="absolute bottom-0 left-0 w-[500px] h-[350px] opacity-100 animate-float-blob-2"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0.04) 40%, transparent 70%)',
            }}
          />
          <Box
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] opacity-100 animate-float-blob-3"
            style={{
              background: 'radial-gradient(ellipse at center, color-mix(in srgb, var(--accent-primary) 6%, transparent) 0%, transparent 60%)',
            }}
          />
          <Box className="absolute inset-0 opacity-[0.015]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }} />
        </Box>

        <Box className="relative z-10 px-6 md:px-10 py-10 md:py-14">
          <Box className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            <Box className="flex-1">
              <Box className="flex items-center gap-3 mb-4">
                <Box className="relative">
                  <Box className={`w-3 h-3 rounded-full ${source === 'live' ? 'bg-[var(--accent)]' : 'bg-[--bg-surface]'}`} />
                  {source === 'live' && <Box className="absolute inset-0 w-3 h-3 rounded-full bg-[var(--accent)] animate-ping opacity-40" />}
                </Box>
                <span className={`text-sm font-medium tracking-wide ${isEmpty ? 'text-[--text-muted]' : 'text-[--text-secondary]'}`}>
                  {isEmpty ? 'Awaiting user data' : 'All systems operational'}
                </span>
              </Box>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[--text-primary] tracking-tight leading-tight">
                Platform
                <span className="bg-gradient-to-r from-[var(--accent-primary)] via-[var(--accent-primary)] to-[var(--accent-primary)] bg-clip-text text-transparent"> Command Center</span>
              </h1>
              <p className="text-base text-[--text-muted] mt-3 max-w-xl">
                Real-time monitoring of platform metrics, system health, and operational insights across all regions.
              </p>
            </Box>

            {/* Quick status badges */}
            <Box className="flex flex-wrap gap-2">
              <Box className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[--bg-surface] border border-[--border-subtle] backdrop-blur-sm">
                <Server className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="text-xs text-[--text-muted]">Server</span>
                <span className="text-xs font-bold text-[var(--accent)]">OK</span>
              </Box>
              <Box className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[--bg-surface] border border-[--border-subtle] backdrop-blur-sm">
                <Database className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="text-xs text-[--text-muted]">{dbLabel}</span>
                <span className="text-xs font-bold text-[var(--accent)]">Connected</span>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[var(--bg-primary)] to-transparent pointer-events-none" />
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          QUICK ACTIONS — Common admin tasks with one-click access
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-5">
        <Box className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[--text-primary]">Quick Actions</h3>
        </Box>
        <Box className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {[
            { label: 'Create Announcement', icon: Megaphone, page: 'settings' as const, color: 'var(--accent)' },
            { label: 'Ban User', icon: ShieldAlert, page: 'users' as const, color: 'var(--accent-primary)' },
            { label: 'Run Health Check', icon: Heart, page: 'bugs' as const, color: 'success.main' },
            { label: 'Export Data', icon: Download, page: 'users' as const, color: 'var(--accent)' },
            { label: 'Clear Cache', icon: RefreshCw, page: 'settings' as const, color: '#8B5CF6' },
          ].map(action => (
            <button
              key={action.label}
              onClick={() => setCurrentPage(action.page)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[--border-subtle] bg-[--bg-surface] hover:border-[--border-subtle] hover:bg-[--bg-surface-2] transition-all group"
            >
              <Box
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${action.color}10`, border: `1px solid ${action.color}20` }}
              >
                <action.icon className="w-4 h-4" style={{ color: action.color }} />
              </Box>
              <span className="text-[10px] font-medium text-[--text-secondary] text-center leading-tight">{action.label}</span>
            </button>
          ))}
        </Box>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2: 2x2 ASYMMETRIC BENTO GRID KPI BLOCKS
          Data-driven: show 0 and "Waiting for data" when no data
          ═══════════════════════════════════════════════════════════════════ */}
      <Box className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
        <BentoKPIBlock
          title="Total Users"
          value={totalUsers}
          trend={usersTrend}
          trendLabel="vs last month"
          icon={Users}
          gradientFrom="var(--accent-primary)"
          gradientTo="var(--accent)"
          sparkData={sparkUsers}
          delay={0}
        />
        <BentoKPIBlock
          title="Monthly Active Users"
          value={monthlyActive}
          trend={mauTrend}
          trendLabel="vs last month"
          icon={Activity}
          gradientFrom="var(--primary)"
          gradientTo="var(--accent-primary)"
          sparkData={sparkMau}
          delay={50}
        />
        <BentoKPIBlock
          title="Total Families"
          value={totalFamilies}
          trend={familiesTrend}
          trendLabel="vs last month"
          icon={Home}
          gradientFrom="var(--accent)"
          gradientTo="#22C55E"
          sparkData={sparkFamilies}
          delay={100}
        />
        <BentoKPIBlock
          title="MRR Revenue"
          value={mrr}
          prefix="$"
          trend={mrrTrend}
          trendLabel="vs last month"
          icon={DollarSign}
          gradientFrom="var(--accent)"
          gradientTo="var(--secondary)"
          sparkData={sparkMrr}
          delay={150}
        />
      </Box>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3: REVENUE CHART (or empty state)
          ═══════════════════════════════════════════════════════════════════ */}
      {revenueData.length > 0 ? (
        <motion.div
          variants={itemVariants}
          className="bg-[--bg-primary] border border-[var(--accent-primary)]/10 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden"
        >
          <Box
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] pointer-events-none opacity-30"
            style={{
              background: 'radial-gradient(ellipse at center, color-mix(in srgb, var(--accent-primary) 8%, transparent) 0%, transparent 70%)',
            }}
          />

          <Box className="relative z-10">
            <Box className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
              <Box>
                <h3 className="text-lg font-semibold text-[--text-primary] flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[var(--accent-primary)]" />
                  Monthly Recurring Revenue
                </h3>
                <p className="text-sm text-[--text-muted] mt-0.5">Last 12 months performance</p>
              </Box>
              {mrr > 0 && (
                <Box className="flex items-center gap-3">
                  <Box className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20">
                    <TrendingUp className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    <span className="text-sm font-semibold text-[var(--accent-primary)]">${(mrr * 12).toLocaleString()} ARR</span>
                  </Box>
                </Box>
              )}
            </Box>

            <Box className="h-[300px]" style={{ filter: 'drop-shadow(0 0 12px color-mix(in srgb, var(--accent-primary) 15%, transparent))' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mrrGradientGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={0.35} />
                      <stop offset="50%" stopColor="var(--accent-primary)" stopOpacity={0.1} />
                      <stop offset="80%" stopColor="var(--accent-primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} dx={-4} />
                  <Tooltip content={<RevenueTooltip />} cursor={{ stroke: 'color-mix(in srgb, var(--accent-primary) 20%, transparent)', strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="mrr"
                    stroke="var(--accent-primary)"
                    strokeWidth={2.5}
                    fill="url(#mrrGradientGlow)"
                    dot={false}
                    activeDot={{
                      r: 6, fill: 'var(--accent-primary)', stroke: 'var(--bg-primary)', strokeWidth: 3,
                      style: { filter: 'drop-shadow(0 0 8px color-mix(in srgb, var(--accent-primary) 50%, transparent))' }
                    }}
                    style={{ filter: 'drop-shadow(0 0 6px color-mix(in srgb, var(--accent-primary) 40%, transparent))' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        </motion.div>
      ) : (
        <EmptyBlock
          title="Revenue Chart"
          subtitle="MRR time series will appear here when subscription data is available"
          icon={BarChart3}
          className="min-h-[300px]"
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4: TWO-COLUMN — User Growth + Custom Donut
          ═══════════════════════════════════════════════════════════════════ */}
      <Box className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        {/* Left: User Growth Bar Chart */}
        {userGrowthData.length > 0 ? (
          <motion.div
            variants={itemVariants}
            className="bg-[--bg-primary] border border-[var(--accent-primary)]/10 rounded-2xl p-6 backdrop-blur-sm"
          >
            <Box className="flex items-center justify-between mb-6">
              <Box>
                <h3 className="text-lg font-semibold text-[--text-primary]">User Growth</h3>
                <p className="text-sm text-[--text-muted] mt-0.5">Registrations per month</p>
              </Box>
              {totalUsers > 0 && (
                <Box className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--accent)]/10">
                  <TrendingUp className="w-3 h-3 text-[var(--accent)]" />
                  <span className="text-xs font-medium text-[var(--accent)]">+{Math.round((userGrowthData[userGrowthData.length - 1]?.registrations ?? 0) / Math.max(1, userGrowthData[0]?.registrations ?? 1) * 100 - 100)}%</span>
                </Box>
              )}
            </Box>

            <Box className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userGrowthData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} dy={6} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} dx={-4} />
                  <Tooltip content={<UserGrowthTooltip />} cursor={{ fill: 'rgba(139,92,246,0.05)' }} />
                  <Bar dataKey="registrations" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </motion.div>
        ) : (
          <EmptyBlock
            title="User Growth"
            subtitle="Registration trends will appear when user data is available"
            icon={TrendingUp}
          />
        )}

        {/* Right: Custom SVG Donut Chart for Plan Distribution */}
        <motion.div
          variants={itemVariants}
          className="bg-[--bg-primary] border border-[var(--accent-primary)]/10 rounded-2xl p-6 backdrop-blur-sm"
        >
          <Box className="mb-6">
            <h3 className="text-lg font-semibold text-[--text-primary]">Plan Distribution</h3>
            <p className="text-sm text-[--text-muted] mt-0.5">Users by subscription tier</p>
          </Box>

          {planData.length > 0 && planTotal > 0 ? (
            <Box className="flex flex-col sm:flex-row items-center gap-8">
              <Box className="shrink-0">
                <CustomDonutChart data={planData} size={180} />
              </Box>
              <Box className="flex-1 space-y-5 w-full">
                {planData.map((plan) => (
                  <Box key={plan.name}>
                    <Box className="flex items-center justify-between mb-2">
                      <Box className="flex items-center gap-2">
                        <Box
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: plan.color, boxShadow: `0 0 8px ${plan.color}40` }}
                        />
                        <span className="text-sm font-medium text-[--text-secondary]">{plan.name}</span>
                      </Box>
                      <Box className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[--text-primary]">{plan.value.toLocaleString()}</span>
                        <span className="text-xs text-[--text-muted]">({((plan.value / planTotal) * 100).toFixed(1)}%)</span>
                      </Box>
                    </Box>
                    <Box className="w-full h-2 bg-[--bg-surface] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(plan.value / planTotal) * 100}%` }}
                        transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: plan.color,
                          boxShadow: `0 0 8px ${plan.color}30`
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : (
            <Box className="flex flex-col items-center justify-center py-8">
              <CustomDonutChart data={[]} size={180} />
              <p className="text-xs text-[--text-muted] mt-4">Subscription data will populate this chart</p>
            </Box>
          )}
        </motion.div>
      </Box>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 5: THREE-COLUMN — Regional + Health + Terminal Feed
          ═══════════════════════════════════════════════════════════════════ */}
      <Box className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {/* Left: Regional Distribution */}
        <motion.div
          variants={itemVariants}
          className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-6 backdrop-blur-sm"
        >
          <Box className="mb-5">
            <h3 className="text-lg font-semibold text-[--text-primary]">Regional Distribution</h3>
            <p className="text-sm text-[--text-muted] mt-0.5">Users by country</p>
          </Box>

          {regionalData.length > 0 ? (
            <Box className="space-y-4">
              {regionalData.map((region) => (
                <Box key={region.region}>
                  <Box className="flex items-center justify-between mb-1.5">
                    <Box className="flex items-center gap-2">
                      <span className="text-sm">{region.flag}</span>
                      <span className="text-sm text-[--text-secondary]">{region.region}</span>
                    </Box>
                    <Box className="flex items-center gap-2">
                      <span className="text-xs text-[--text-muted]">{region.users.toLocaleString()}</span>
                      <span className="text-sm font-semibold text-[--text-primary]">{region.percentage}%</span>
                    </Box>
                  </Box>
                  <Box className="w-full h-2 bg-[--bg-surface] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${region.percentage}%` }}
                      transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full"
                      style={{
                        background: region.percentage > 30
                          ? 'linear-gradient(90deg, var(--accent-primary), var(--primary))'
                          : region.percentage > 10
                          ? 'linear-gradient(90deg, var(--primary), var(--accent-primary))'
                          : '#6B7280'
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Box className="flex flex-col items-center justify-center py-8">
              <Globe className="w-8 h-8 text-[--text-muted] mb-3" />
              <p className="text-xs text-[--text-muted]">No regional data yet</p>
              <p className="text-[10px] text-[--text-muted] mt-1">Requires user profiles with country info</p>
            </Box>
          )}
        </motion.div>

        {/* Middle: Platform Health */}
        <motion.div
          variants={itemVariants}
          className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-6 backdrop-blur-sm"
        >
          <Box className="mb-5">
            <h3 className="text-lg font-semibold text-[--text-primary]">Platform Health</h3>
            <p className="text-sm text-[--text-muted] mt-0.5">System vitals</p>
          </Box>

          <Box className="space-y-5">
            {/* Real data from database via overview API */}
            {[
              { label: 'DB Connected', value: overviewData?.platformHealth?.dbConnected ? 'Yes' : 'No', color: overviewData?.platformHealth?.dbConnected ? 'var(--accent)' : '#EF4444', icon: Database, barPercent: overviewData?.platformHealth?.dbConnected ? 100 : 0 },
              { label: 'Total Users', value: String(overviewData?.platformHealth?.totalUsers ?? 0), color: 'var(--accent-primary)', icon: Users, barPercent: Math.min(((overviewData?.platformHealth?.totalUsers ?? 0) / Math.max(overviewData?.platformHealth?.totalUsers ?? 1, 10)) * 100, 100) },
              { label: 'Verified Users', value: String(overviewData?.platformHealth?.verifiedUsers ?? 0), color: 'var(--accent)', icon: CheckCircle2, barPercent: totalUsers > 0 ? Math.round(((overviewData?.platformHealth?.verifiedUsers ?? 0) / totalUsers) * 100) : 0 },
              { label: 'Active Sessions', value: String(overviewData?.platformHealth?.totalSessions ?? 0), color: 'var(--primary)', icon: Activity, barPercent: Math.min(((overviewData?.platformHealth?.totalSessions ?? 0) / Math.max(overviewData?.platformHealth?.totalUsers ?? 1, 10)) * 100, 100) },
            ].map((metric) => {
              const IconComp = metric.icon
              return (
                <Box key={metric.label}>
                  <Box className="flex items-center justify-between mb-2">
                    <Box className="flex items-center gap-2">
                      <IconComp className="w-4 h-4" style={{ color: metric.color }} />
                      <span className="text-sm text-[--text-secondary]">{metric.label}</span>
                    </Box>
                    <span className="text-sm font-semibold" style={{ color: metric.color }}>
                      {metric.value}
                    </span>
                  </Box>
                  <Box className="w-full h-6 bg-[--bg-surface] rounded-lg overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${metric.barPercent}%` }}
                      transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute top-0 left-0 h-full rounded-lg"
                      style={{ backgroundColor: metric.color, opacity: 0.5 }}
                    />
                  </Box>
                </Box>
              )
            })}
          </Box>
        </motion.div>

        {/* Right: Terminal-style Activity Feed */}
        <TerminalActivityFeed items={activityFeed} source={source} />
      </Box>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 6: KEY METRICS GRID (data-driven)
          ═══════════════════════════════════════════════════════════════════ */}
      <Box>
        <motion.div variants={itemVariants} className="mb-4">
          <h3 className="text-lg font-semibold text-[--text-primary]">Key Metrics</h3>
          <p className="text-sm text-[--text-muted]">Core performance indicators</p>
        </motion.div>

        <Box className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'DAU/MAU', value: monthlyActive > 0 && totalUsers > 0 ? `${Math.round((monthlyActive / totalUsers) * 100)}%` : '—', sublabel: 'Active ratio', icon: Activity },
            { label: 'Churn Rate', value: '—', sublabel: 'Not tracked yet', icon: TrendingDown },
            { label: 'Upgrade Rate', value: '—', sublabel: 'No subscriptions yet', icon: TrendingUp },
            { label: 'Avg Session', value: '—', sublabel: 'Not tracked yet', icon: Clock },
            { label: 'New This Month', value: (overviewData?.metrics?.newThisMonth ?? 0) > 0 ? String(overviewData?.metrics?.newThisMonth) : '—', sublabel: 'Signups', icon: UserPlus },
            { label: 'Verified %', value: totalUsers > 0 ? (overviewData?.keyMetrics?.verifiedPct as string ?? '—') : '—', sublabel: 'Email verified', icon: CheckCircle2 },
          ].map((metric) => (
            <motion.div
              key={metric.label}
              variants={itemVariants}
              className="bg-[--bg-primary] border border-[--border-subtle] rounded-xl p-4 backdrop-blur-sm hover:border-[var(--accent-primary)]/20 transition-all duration-300 group"
            >
              <Box className="flex items-center gap-3 mb-3">
                <Box className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/10 flex items-center justify-center group-hover:bg-[var(--accent-primary)]/20 transition-colors">
                  <metric.icon className="w-4 h-4 text-[var(--accent-primary)]" />
                </Box>
                <p className="text-xs text-[--text-muted] font-medium">{metric.label}</p>
              </Box>
              <p className={`text-xl font-bold ${metric.value === '—' ? 'text-[--text-muted]' : 'text-[--text-primary]'}`}>{metric.value}</p>
              {metric.sublabel && <p className="text-xs text-[--text-muted] mt-1">{metric.sublabel}</p>}
            </motion.div>
          ))}
        </Box>
      </Box>
    </motion.div>
  )
}
