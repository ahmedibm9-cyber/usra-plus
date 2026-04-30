'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'
import {
  Users, Activity, Home, DollarSign, TrendingUp, TrendingDown,
  Server, Database, HardDrive, AlertTriangle, Shield, Zap,
  UserPlus, CreditCard, Globe, Clock, ArrowUpRight, ArrowDownRight,
  Wifi, CheckCircle2, Radio
} from 'lucide-react'

// ─── Animated Counter Hook ───────────────────────────────────────────────────
function useAnimatedCounter(target: number, duration = 1400, startOnMount = true) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!startOnMount) return
    const startTime = performance.now()
    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
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

  const totalGap = 6 * data.length
  const availableLength = circumference - totalGap

  // Compute segment offsets without reassigning variables
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
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={strokeWidth}
        />
        {/* Segments */}
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
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold text-white">{total.toLocaleString()}</span>
        <span className="text-xs text-white/30">Total</span>
      </div>
    </div>
  )
}

// ─── Demo Data ───────────────────────────────────────────────────────────────
const revenueData = [
  { month: 'Mar', mrr: 14200 },
  { month: 'Apr', mrr: 15800 },
  { month: 'May', mrr: 17400 },
  { month: 'Jun', mrr: 18900 },
  { month: 'Jul', mrr: 20100 },
  { month: 'Aug', mrr: 21500 },
  { month: 'Sep', mrr: 22800 },
  { month: 'Oct', mrr: 24200 },
  { month: 'Nov', mrr: 25600 },
  { month: 'Dec', mrr: 26800 },
  { month: 'Jan', mrr: 27900 },
  { month: 'Feb', mrr: 28940 },
]

const userGrowthData = [
  { month: 'Mar', registrations: 820 },
  { month: 'Apr', registrations: 910 },
  { month: 'May', registrations: 1040 },
  { month: 'Jun', registrations: 980 },
  { month: 'Jul', registrations: 1120 },
  { month: 'Aug', registrations: 1060 },
  { month: 'Sep', registrations: 1200 },
  { month: 'Oct', registrations: 1150 },
  { month: 'Nov', registrations: 1280 },
  { month: 'Dec', registrations: 1190 },
  { month: 'Jan', registrations: 1340 },
  { month: 'Feb', registrations: 1420 },
]

const planData = [
  { name: 'Free', value: 9612, color: '#6B7280' },
  { name: 'Pro', value: 2158, color: '#6366F1' },
  { name: 'Family+', value: 1077, color: '#8B5CF6' },
]

const regionalData = [
  { region: 'Saudi Arabia', percentage: 64, users: 8222, flag: '🇸🇦' },
  { region: 'UAE', percentage: 12, users: 1542, flag: '🇦🇪' },
  { region: 'Kuwait', percentage: 8, users: 1028, flag: '🇰🇼' },
  { region: 'Qatar', percentage: 5, users: 642, flag: '🇶🇦' },
  { region: 'Bahrain', percentage: 3, users: 385, flag: '🇧🇭' },
  { region: 'Other', percentage: 8, users: 1028, flag: '🌍' },
]

const platformHealth = [
  { label: 'Server Uptime', value: 99.9, color: '#10B981', icon: Server },
  { label: 'DB Load', value: 34, color: '#6366F1', icon: Database },
  { label: 'Storage Used', value: 23, color: '#F59E0B', icon: HardDrive },
  { label: 'Error Rate', value: 0.12, color: '#EF4444', icon: AlertTriangle },
]

const activityFeed = [
  { id: 1, icon: UserPlus, text: 'New user registered: fatima@email.com', time: '2m ago', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { id: 2, icon: CreditCard, text: 'Pro subscription upgraded: ahmed@email.com', time: '8m ago', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  { id: 3, icon: Shield, text: 'Security alert: 3 failed login attempts', time: '15m ago', color: 'text-red-400', bg: 'bg-red-500/10' },
  { id: 4, icon: Home, text: 'New family created: Al-Rashid Family', time: '22m ago', color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { id: 5, icon: Zap, text: 'Feature flag enabled: meal_planning', time: '35m ago', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { id: 6, icon: Globe, text: 'Region spike: +340 users from UAE', time: '1h ago', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { id: 7, icon: AlertTriangle, text: 'Storage threshold: 75% capacity reached', time: '2h ago', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { id: 8, icon: CheckCircle2, text: 'Database backup completed successfully', time: '3h ago', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
]

// Sparkline data for KPI blocks
const sparkData = {
  users: [820, 910, 1040, 980, 1120, 1060, 1200, 1150, 1280, 1190, 1340, 1420],
  mau: [5800, 6100, 6400, 6200, 6800, 7100, 7400, 7600, 7900, 8100, 8200, 8429],
  families: [1800, 1950, 2100, 2200, 2400, 2550, 2700, 2850, 2950, 3050, 3150, 3256],
  mrr: [14200, 15800, 17400, 18900, 20100, 21500, 22800, 24200, 25600, 26800, 27900, 28940],
}

// ─── Animation Variants ──────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
}

// ─── Custom Tooltip for Charts ───────────────────────────────────────────────
function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0B0B11]/95 border border-indigo-500/20 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-sm">
      <p className="text-xs text-white/40 mb-1">{label} 2025</p>
      <p className="text-lg font-bold text-white">${payload[0].value.toLocaleString()}</p>
      <p className="text-xs text-indigo-400">MRR</p>
    </div>
  )
}

function UserGrowthTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0B0B11]/95 border border-violet-500/20 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-sm">
      <p className="text-xs text-white/40 mb-1">{label} 2025</p>
      <p className="text-lg font-bold text-white">{payload[0].value.toLocaleString()}</p>
      <p className="text-xs text-violet-400">Registrations</p>
    </div>
  )
}

// ─── Bento KPI Block ────────────────────────────────────────────────────────
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

  return (
    <motion.div
      variants={itemVariants}
      className="group relative rounded-2xl overflow-hidden"
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Gradient border effect */}
      <div
        className="absolute inset-0 rounded-2xl opacity-60"
        style={{
          background: `linear-gradient(135deg, ${gradientFrom}40, ${gradientTo}20, transparent 60%)`
        }}
      />
      <div
        className="absolute inset-[1px] rounded-2xl bg-[#0B0B0F]"
      />

      {/* Content */}
      <div className="relative z-10 p-6 md:p-8">
        {/* Sparkline in background */}
        <div className="absolute bottom-0 right-0 opacity-30 group-hover:opacity-50 transition-opacity duration-500">
          <MiniSparkline data={spark} color={gradientFrom} width={140} height={50} />
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center border"
            style={{
              background: `linear-gradient(135deg, ${gradientFrom}15, ${gradientTo}10)`,
              borderColor: `${gradientFrom}30`
            }}
          >
            <Icon className="w-5 h-5" style={{ color: gradientFrom }} />
          </div>
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}
          >
            {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(trend)}%
          </div>
        </div>

        {/* Massive stat number */}
        <div className="relative z-10">
          <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tighter leading-none mb-3">
            {prefix}<span>{animatedValue.toLocaleString()}</span>{suffix}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-white/50 font-medium">{title}</p>
            <span className="text-white/20">·</span>
            <p className="text-xs text-white/25">{trendLabel}</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Terminal-style Activity Feed ────────────────────────────────────────────
function TerminalActivityFeed() {
  const [visibleLines, setVisibleLines] = useState(0)
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Simulate lines appearing one by one
    const interval = setInterval(() => {
      setVisibleLines(prev => {
        if (prev >= activityFeed.length) {
          clearInterval(interval)
          return prev
        }
        return prev + 1
      })
    }, 180)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll to bottom as new lines appear
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [visibleLines])

  const getTerminalColor = (color: string) => {
    if (color.includes('emerald')) return '#34D399'
    if (color.includes('indigo')) return '#818CF8'
    if (color.includes('red')) return '#F87171'
    if (color.includes('violet')) return '#A78BFA'
    if (color.includes('amber')) return '#FBBF24'
    if (color.includes('cyan')) return '#22D3EE'
    if (color.includes('orange')) return '#FB923C'
    return '#9CA3AF'
  }

  const getTerminalPrefix = (icon: React.ElementType) => {
    if (icon === UserPlus) return 'USR'
    if (icon === CreditCard) return 'PAY'
    if (icon === Shield) return 'SEC'
    if (icon === Home) return 'FML'
    if (icon === Zap) return 'FEA'
    if (icon === Globe) return 'GEO'
    if (icon === AlertTriangle) return 'SYS'
    if (icon === CheckCircle2) return 'BKP'
    return 'LOG'
  }

  return (
    <motion.div
      variants={itemVariants}
      className="rounded-2xl overflow-hidden border border-emerald-500/10"
    >
      {/* Terminal header bar */}
      <div className="bg-[#0A0E0A] border-b border-emerald-500/10 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-[10px] font-mono text-emerald-500/40 ml-2">usra-admin@live ~ activity.log</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-mono text-emerald-400/60">LIVE</span>
        </div>
      </div>

      {/* Terminal body */}
      <div
        ref={feedRef}
        className="bg-[#080C08] p-4 max-h-[400px] overflow-y-auto custom-scrollbar font-mono text-sm"
      >
        {activityFeed.slice(0, visibleLines).map((item) => {
          const IconComp = item.icon
          const prefix = getTerminalPrefix(IconComp)
          const termColor = getTerminalColor(item.color)
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2 py-1.5 leading-relaxed"
            >
              <span className="text-emerald-500/30 shrink-0 select-none">$</span>
              <span style={{ color: termColor }} className="shrink-0 font-semibold text-xs mt-0.5">[{prefix}]</span>
              <span className="text-emerald-300/70 flex-1">{item.text}</span>
              <span className="text-emerald-500/20 shrink-0 text-xs">{item.time}</span>
            </motion.div>
          )
        })}
        {/* Blinking cursor */}
        <div className="flex items-center gap-2 py-1.5">
          <span className="text-emerald-500/30 select-none">$</span>
          <span className="inline-block w-2 h-4 bg-emerald-400/70 animate-pulse" />
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function AdminOverview() {
  const planTotal = planData.reduce((s, d) => s + d.value, 0)

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 relative"
    >
      {/* "Simulated" label */}
      <div className="absolute top-0 right-0 z-30">
        <span className="text-[10px] font-mono text-white/15 tracking-widest uppercase">Simulated</span>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1: COMMAND CENTER HERO HEADER
          Unique gradient mesh background with animated pulse dot
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl"
      >
        {/* Animated gradient mesh background */}
        <div className="absolute inset-0">
          {/* Primary indigo glow */}
          <div
            className="absolute top-0 right-0 w-[600px] h-[400px] opacity-100 animate-float-blob-1"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0.05) 40%, transparent 70%)',
            }}
          />
          {/* Secondary violet glow */}
          <div
            className="absolute bottom-0 left-0 w-[500px] h-[350px] opacity-100 animate-float-blob-2"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0.04) 40%, transparent 70%)',
            }}
          />
          {/* Tertiary glow */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] opacity-100 animate-float-blob-3"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.06) 0%, transparent 60%)',
            }}
          />
          {/* Noise overlay for texture */}
          <div className="absolute inset-0 opacity-[0.015]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Hero content */}
        <div className="relative z-10 px-6 md:px-10 py-10 md:py-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-400 animate-ping opacity-40" />
                </div>
                <span className="text-sm font-medium text-emerald-400/80 tracking-wide">All systems operational</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
                Platform
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent"> Command Center</span>
              </h1>
              <p className="text-base text-white/30 mt-3 max-w-xl">
                Real-time monitoring of platform metrics, system health, and operational insights across all regions.
              </p>
            </div>

            {/* Quick system status badges */}
            <div className="flex flex-wrap gap-2">
              {platformHealth.slice(0, 3).map((metric) => {
                const IconComp = metric.icon
                return (
                  <div
                    key={metric.label}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm"
                  >
                    <IconComp className="w-3.5 h-3.5" style={{ color: metric.color }} />
                    <span className="text-xs text-white/50">{metric.label}</span>
                    <span className="text-xs font-bold" style={{ color: metric.color }}>
                      {metric.value}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Bottom fade gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0B0B0F] to-transparent pointer-events-none" />
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2: 2x2 BENTO GRID KPI BLOCKS
          Massive numbers, gradient borders, sparklines, animated counters
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
        <BentoKPIBlock
          title="Total Users"
          value={12847}
          trend={18.3}
          trendLabel="vs last month"
          icon={Users}
          gradientFrom="#6366F1"
          gradientTo="#818CF8"
          sparkData={sparkData.users}
          delay={0}
        />
        <BentoKPIBlock
          title="Monthly Active Users"
          value={8429}
          trend={12.1}
          trendLabel="vs last month"
          icon={Activity}
          gradientFrom="#8B5CF6"
          gradientTo="#A78BFA"
          sparkData={sparkData.mau}
          delay={50}
        />
        <BentoKPIBlock
          title="Total Families"
          value={3256}
          trend={15.7}
          trendLabel="vs last month"
          icon={Home}
          gradientFrom="#10B981"
          gradientTo="#34D399"
          sparkData={sparkData.families}
          delay={100}
        />
        <BentoKPIBlock
          title="MRR Revenue"
          value={28940}
          prefix="$"
          trend={22.4}
          trendLabel="vs last month"
          icon={DollarSign}
          gradientFrom="#F59E0B"
          gradientTo="#FBBF24"
          sparkData={sparkData.mrr}
          delay={150}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3: GLOWING REVENUE CHART
          SVG drop-shadow glow effect on the line, pulsing area fill
          ═══════════════════════════════════════════════════════════════════ */}
      <motion.div
        variants={itemVariants}
        className="bg-[#0B0B0F] border border-indigo-500/10 rounded-2xl p-6 backdrop-blur-sm relative overflow-hidden"
      >
        {/* Ambient glow behind chart */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] pointer-events-none opacity-30"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.08) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-indigo-400" />
                Monthly Recurring Revenue
              </h3>
              <p className="text-sm text-white/30 mt-0.5">Last 12 months performance</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-sm font-semibold text-indigo-400">$347,280 ARR</span>
              </div>
            </div>
          </div>

          <div className="h-[300px]" style={{ filter: 'drop-shadow(0 0 12px rgba(99,102,241,0.15))' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="mrrGradientGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.35} />
                    <stop offset="50%" stopColor="#6366F1" stopOpacity={0.1} />
                    <stop offset="80%" stopColor="#6366F1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.25)' }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.25)' }}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  dx={-4}
                />
                <Tooltip content={<RevenueTooltip />} cursor={{ stroke: 'rgba(99,102,241,0.2)', strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="mrr"
                  stroke="#6366F1"
                  strokeWidth={2.5}
                  fill="url(#mrrGradientGlow)"
                  dot={false}
                  activeDot={{
                    r: 6,
                    fill: '#6366F1',
                    stroke: '#0B0B0F',
                    strokeWidth: 3,
                    style: { filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.5))' }
                  }}
                  style={{ filter: 'drop-shadow(0 0 6px rgba(99,102,241,0.4))' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4: TWO-COLUMN — User Growth + Custom Donut
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        {/* Left: User Growth Bar Chart */}
        <motion.div
          variants={itemVariants}
          className="bg-[#0B0B0F] border border-violet-500/10 rounded-2xl p-6 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">User Growth</h3>
              <p className="text-sm text-white/30 mt-0.5">Registrations per month</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">+18.3%</span>
            </div>
          </div>

          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userGrowthData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.25)' }}
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.25)' }}
                  dx={-4}
                />
                <Tooltip content={<UserGrowthTooltip />} cursor={{ fill: 'rgba(139,92,246,0.05)' }} />
                <Bar
                  dataKey="registrations"
                  fill="#8B5CF6"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Right: Custom SVG Donut Chart for Plan Distribution */}
        <motion.div
          variants={itemVariants}
          className="bg-[#0B0B0F] border border-violet-500/10 rounded-2xl p-6 backdrop-blur-sm"
        >
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Plan Distribution</h3>
            <p className="text-sm text-white/30 mt-0.5">Users by subscription tier</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-8">
            {/* Custom Donut */}
            <div className="shrink-0">
              <CustomDonutChart data={planData} size={180} />
            </div>

            {/* Legend with animated bars */}
            <div className="flex-1 space-y-5 w-full">
              {planData.map((plan) => (
                <div key={plan.name}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: plan.color, boxShadow: `0 0 8px ${plan.color}40` }}
                      />
                      <span className="text-sm font-medium text-white/70">{plan.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{plan.value.toLocaleString()}</span>
                      <span className="text-xs text-white/25">({((plan.value / planTotal) * 100).toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden">
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 5: THREE-COLUMN — Regional + Health + Terminal Feed
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {/* Left: Regional Distribution */}
        <motion.div
          variants={itemVariants}
          className="bg-[#0B0B0F] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-sm"
        >
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-white">Regional Distribution</h3>
            <p className="text-sm text-white/30 mt-0.5">Users by country</p>
          </div>

          <div className="space-y-4">
            {regionalData.map((region) => (
              <div key={region.region}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{region.flag}</span>
                    <span className="text-sm text-white/60">{region.region}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/30">{region.users.toLocaleString()}</span>
                    <span className="text-sm font-semibold text-white/80">{region.percentage}%</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${region.percentage}%` }}
                    transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full"
                    style={{
                      background: region.percentage > 30
                        ? 'linear-gradient(90deg, #6366F1, #8B5CF6)'
                        : region.percentage > 10
                        ? 'linear-gradient(90deg, #8B5CF6, #A78BFA)'
                        : '#6B7280'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Middle: Platform Health */}
        <motion.div
          variants={itemVariants}
          className="bg-[#0B0B0F] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-sm"
        >
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-white">Platform Health</h3>
            <p className="text-sm text-white/30 mt-0.5">System vitals</p>
          </div>

          <div className="space-y-5">
            {platformHealth.map((metric) => {
              const IconComp = metric.icon
              const barPercent = metric.label === 'Error Rate'
                ? Math.min(metric.value * 100, 100)
                : metric.value
              return (
                <div key={metric.label}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <IconComp className="w-4 h-4" style={{ color: metric.color }} />
                      <span className="text-sm text-white/60">{metric.label}</span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: metric.color }}>
                      {metric.value}%
                    </span>
                  </div>
                  <div className="w-full h-6 bg-white/[0.03] rounded-lg overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barPercent}%` }}
                      transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute top-0 left-0 h-full rounded-lg"
                      style={{ backgroundColor: metric.color, opacity: 0.5 }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Right: Terminal-style Activity Feed */}
        <TerminalActivityFeed />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 6: KEY METRICS GRID
          ═══════════════════════════════════════════════════════════════════ */}
      <div>
        <motion.div variants={itemVariants} className="mb-4">
          <h3 className="text-lg font-semibold text-white">Key Metrics</h3>
          <p className="text-sm text-white/30">Core performance indicators</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'DAU/MAU', value: '34.2%', sublabel: 'Stickiness ratio', icon: Activity },
            { label: 'Churn Rate', value: '3.8%', sublabel: 'Monthly', icon: TrendingDown },
            { label: 'Upgrade Rate', value: '12.4%', sublabel: 'Free → Paid', icon: TrendingUp },
            { label: 'Avg Session', value: '8m 42s', sublabel: 'Per visit', icon: Clock },
            { label: 'EN / AR', value: '58 / 42%', sublabel: 'Language split', icon: Globe },
            { label: 'Mobile / Desktop', value: '72 / 28%', sublabel: 'Device split', icon: Wifi },
          ].map((metric) => (
            <motion.div
              key={metric.label}
              variants={itemVariants}
              className="bg-[#0B0B0F] border border-white/[0.06] rounded-xl p-4 backdrop-blur-sm hover:border-indigo-500/20 transition-all duration-300 group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                  <metric.icon className="w-4 h-4 text-indigo-400" />
                </div>
                <p className="text-xs text-white/40 font-medium">{metric.label}</p>
              </div>
              <p className="text-xl font-bold text-white">{metric.value}</p>
              {metric.sublabel && <p className="text-xs text-white/25 mt-1">{metric.sublabel}</p>}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
