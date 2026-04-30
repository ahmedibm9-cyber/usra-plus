'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Users, Activity, Clock, Search, ChevronUp, ChevronDown,
  TrendingUp, Shield, ShoppingCart, CalendarDays, MessageSquare,
  FileUp, UserPlus, Trophy, Flame, Network,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

// ─── Demo Data ────────────────────────────────────────────────────────────────

const TASK_COMPLETION_TREND = [
  { week: 'W1', completed: 234 },
  { week: 'W2', completed: 278 },
  { week: 'W3', completed: 312 },
  { week: 'W4', completed: 289 },
  { week: 'W5', completed: 345 },
  { week: 'W6', completed: 378 },
  { week: 'W7', completed: 402 },
  { week: 'W8', completed: 367 },
  { week: 'W9', completed: 421 },
  { week: 'W10', completed: 456 },
  { week: 'W11', completed: 434 },
  { week: 'W12', completed: 489 },
]

const MODULE_USAGE = [
  { module: 'Tasks', usage: 92, color: '#F43F5E' },
  { module: 'Grocery', usage: 78, color: '#FB7185' },
  { module: 'Calendar', usage: 65, color: '#EC4899' },
  { module: 'Chat', usage: 54, color: '#F472B6' },
  { module: 'Files', usage: 31, color: '#E879F9' },
  { module: 'Budget', usage: 24, color: '#D946EF' },
  { module: 'Meal Plan', usage: 18, color: '#C026D3' },
]

interface FamilyRecord {
  id: string
  name: string
  members: number
  plan: string
  tasksCompleted: number
  lastActive: string
  activityScore: number
}

const DEMO_FAMILIES: FamilyRecord[] = [
  { id: 'f-001', name: 'Al-Ahmadi', members: 5, plan: 'Family+', tasksCompleted: 342, lastActive: '2025-03-04T20:30:00Z', activityScore: 94 },
  { id: 'f-002', name: 'Al-Qahtani', members: 4, plan: 'Pro', tasksCompleted: 287, lastActive: '2025-03-04T18:15:00Z', activityScore: 88 },
  { id: 'f-003', name: 'Al-Shammari', members: 6, plan: 'Family+', tasksCompleted: 256, lastActive: '2025-03-04T16:45:00Z', activityScore: 82 },
  { id: 'f-004', name: 'Al-Dosari', members: 3, plan: 'Pro', tasksCompleted: 198, lastActive: '2025-03-04T14:20:00Z', activityScore: 76 },
  { id: 'f-005', name: 'Al-Harbi', members: 4, plan: 'Free', tasksCompleted: 145, lastActive: '2025-03-03T22:10:00Z', activityScore: 71 },
  { id: 'f-006', name: 'Al-Ghamdi', members: 2, plan: 'Pro', tasksCompleted: 167, lastActive: '2025-03-03T19:45:00Z', activityScore: 68 },
  { id: 'f-007', name: 'Al-Zahrani', members: 5, plan: 'Free', tasksCompleted: 89, lastActive: '2025-03-02T11:30:00Z', activityScore: 55 },
  { id: 'f-008', name: 'Al-Otaibi', members: 3, plan: 'Pro', tasksCompleted: 134, lastActive: '2025-03-01T09:15:00Z', activityScore: 62 },
  { id: 'f-009', name: 'Al-Mutairi', members: 4, plan: 'Family+', tasksCompleted: 223, lastActive: '2025-02-28T17:00:00Z', activityScore: 79 },
  { id: 'f-010', name: 'Al-Shehri', members: 2, plan: 'Free', tasksCompleted: 56, lastActive: '2025-02-27T14:30:00Z', activityScore: 43 },
]

// Heatmap data: 7 days × 24 hours
function generateHeatmapData(): number[][] {
  const days = 7
  const hours = 24
  const data: number[][] = []

  for (let d = 0; d < days; d++) {
    const row: number[] = []
    for (let h = 0; h < hours; h++) {
      let base = 1
      if (h >= 18 && h <= 21) {
        base = d >= 1 && d <= 5 ? 8 + Math.floor(Math.random() * 3) : 6 + Math.floor(Math.random() * 3)
      } else if (h >= 8 && h <= 10) {
        base = d >= 1 && d <= 5 ? 5 + Math.floor(Math.random() * 3) : 3 + Math.floor(Math.random() * 2)
      } else if (h >= 12 && h <= 13) {
        base = 3 + Math.floor(Math.random() * 2)
      } else if (h >= 23 || h <= 5) {
        base = Math.floor(Math.random() * 2)
      } else {
        base = 2 + Math.floor(Math.random() * 2)
      }
      row.push(base)
    }
    data.push(row)
  }
  return data
}

const HEATMAP_DATA = generateHeatmapData()
const HEATMAP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HEATMAP_HOURS = Array.from({ length: 24 }, (_, i) => i)

// ─── Helpers ──────────────────────────────────────────────────────────────────

type SortField = 'name' | 'members' | 'plan' | 'tasksCompleted' | 'lastActive' | 'activityScore'
type SortDir = 'asc' | 'desc'

const PLAN_ORDER: Record<string, number> = { 'Free': 0, 'Pro': 1, 'Family+': 2 }

function formatTimeAgo(iso: string): string {
  const now = new Date()
  const then = new Date(iso)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Custom Tooltip (Rose) ────────────────────────────────────────────────────

function CustomBarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1F0D12] border border-rose-500/20 rounded-lg px-3 py-2 shadow-xl shadow-rose-500/5">
      <p className="text-xs text-rose-300/50 mb-1">{label}</p>
      <p className="text-sm font-semibold text-rose-200">{payload[0].value} tasks</p>
    </div>
  )
}

// ─── Plan Badge (Rose-themed) ────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  const config: Record<string, { bg: string; text: string; border: string }> = {
    'Free': { bg: 'bg-white/[0.06]', text: 'text-white/50', border: 'border-white/[0.08]' },
    'Pro': { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
    'Family+': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  }
  const c = config[plan] || config['Free']
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
      {plan}
    </span>
  )
}

// ─── Stat Card (Rose Accent) ────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, trend, trendLabel, delay = 0 }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string | number
  trend?: string; trendLabel?: string; delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="bg-[#1F0D12] border border-rose-500/15 rounded-xl p-5 hover:border-rose-500/25 transition-colors relative overflow-hidden group"
    >
      {/* Rose gradient border glow */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-rose-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <Icon className="w-4 h-4 text-rose-400" />
          </div>
          {trend && (
            <span className={`text-xs font-medium flex items-center gap-0.5 ${trend.startsWith('↑') || trend.startsWith('+') ? 'text-rose-400' : 'text-white/40'}`}>
              <TrendingUp className="w-3 h-3" />
              {trend}
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-white mt-3">{value}</p>
        <p className="text-xs text-rose-300/40 mt-1">{label}</p>
        {trendLabel && <p className="text-[10px] text-white/20 mt-0.5">{trendLabel}</p>}
      </div>
    </motion.div>
  )
}

// ─── Activity Score Bar (Rose/Pink Gradient) ────────────────────────────────

function ActivityScoreBar({ score }: { score: number }) {
  const gradientClass = score >= 80
    ? 'from-rose-500 to-pink-400'
    : score >= 60
      ? 'from-pink-500 to-fuchsia-400'
      : 'from-fuchsia-600 to-purple-400'

  const textColor = score >= 80 ? 'text-rose-400' : score >= 60 ? 'text-pink-400' : 'text-fuchsia-400'

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
          className={`h-full rounded-full bg-gradient-to-r ${gradientClass}`}
        />
      </div>
      <span className={`text-xs font-medium min-w-[32px] text-right ${textColor}`}>
        {score}
      </span>
    </div>
  )
}

// ─── Heatmap Cell (Rose Scale) ──────────────────────────────────────────────

function HeatmapCell({ value }: { value: number }) {
  const maxVal = 10
  const intensity = Math.min(value / maxVal, 1)
  const opacity = intensity * 0.8

  return (
    <div
      className="w-full aspect-square rounded-[2px] transition-colors"
      style={{
        backgroundColor: intensity > 0 ? `rgba(244, 63, 94, ${opacity})` : 'rgba(255, 255, 255, 0.02)',
      }}
      title={`${value}`}
    />
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminFamilies() {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('activityScore')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Filtered + sorted data
  const filteredFamilies = useMemo(() => {
    let result = [...DEMO_FAMILIES]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(f => f.name.toLowerCase().includes(q))
    }

    result.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break
        case 'members': cmp = a.members - b.members; break
        case 'plan': cmp = (PLAN_ORDER[a.plan] ?? 0) - (PLAN_ORDER[b.plan] ?? 0); break
        case 'tasksCompleted': cmp = a.tasksCompleted - b.tasksCompleted; break
        case 'lastActive': cmp = a.lastActive.localeCompare(b.lastActive); break
        case 'activityScore': cmp = a.activityScore - b.activityScore; break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [searchQuery, sortField, sortDir])

  // Sort handler
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }, [sortField])

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-white/20" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-rose-400" />
      : <ChevronDown className="w-3 h-3 text-rose-400" />
  }

  // Key metrics data (rose-themed)
  const keyMetrics = [
    { icon: ShoppingCart, label: 'Grocery Activity', value: '78%', color: 'text-rose-400', gradient: 'from-rose-500/20 to-rose-600/10' },
    { icon: CalendarDays, label: 'Calendar Usage', value: '65%', color: 'text-pink-400', gradient: 'from-pink-500/20 to-pink-600/10' },
    { icon: MessageSquare, label: 'Chat Engagement', value: '54%', color: 'text-fuchsia-400', gradient: 'from-fuchsia-500/20 to-fuchsia-600/10' },
    { icon: FileUp, label: 'File Uploads', value: '31%', color: 'text-rose-300', gradient: 'from-rose-400/20 to-rose-500/10' },
    { icon: UserPlus, label: 'Invite Conversion', value: '72%', color: 'text-pink-300', gradient: 'from-pink-400/20 to-pink-500/10' },
    { icon: Trophy, label: 'Most Active', value: 'Tasks', color: 'text-amber-400', gradient: 'from-amber-500/20 to-amber-600/10' },
  ]

  return (
    <div className="space-y-6">
      {/* ─── Header: Family Network Hub ───────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Network className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Family Network Hub</h2>
              <div className="h-[2px] w-full mt-1 rounded-full bg-gradient-to-r from-rose-500 via-pink-400 to-transparent" />
            </div>
          </div>
          <p className="text-sm text-white/40 mt-2 ml-[52px]">Track family engagement, activity, and network health</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-[10px] text-rose-500/40 uppercase tracking-widest font-medium bg-rose-500/5 border border-rose-500/10 rounded-full px-3 py-1">
            Simulated
          </span>
        </div>
      </div>

      {/* ─── Top Stats Row (2x2 Rose Grid) ──────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Home}
          label="Total Families"
          value="1,247"
          trend="↑15.3%"
          trendLabel="vs last month"
          delay={0}
        />
        <StatCard
          icon={Users}
          label="Avg Family Size"
          value="3.8"
          delay={0.05}
        />
        <StatCard
          icon={Activity}
          label="Active Families"
          value="891"
          trend="71.5%"
          trendLabel="of total families"
          delay={0.1}
        />
        <StatCard
          icon={Clock}
          label="Family Retention"
          value="87%"
          delay={0.15}
        />
      </div>

      {/* ─── Activity Charts Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Task Completion Trend (Rose BarChart) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="bg-[#1F0D12] border border-rose-500/15 rounded-xl p-5 relative overflow-hidden"
        >
          {/* Ambient glow */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-rose-500/5 blur-3xl rounded-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Task Completion Trend</h3>
                <p className="text-xs text-rose-300/30 mt-0.5">Last 12 weeks</p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
                <TrendingUp className="w-3 h-3 text-rose-400" />
                <span className="text-[10px] font-medium text-rose-400">+18% WoW</span>
              </div>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={TASK_COMPLETION_TREND} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="roseBarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F43F5E" stopOpacity={1} />
                      <stop offset="100%" stopColor="#EC4899" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(244,63,94,0.06)" vertical={false} />
                  <XAxis
                    dataKey="week"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'rgba(244,63,94,0.4)' }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'rgba(244,63,94,0.4)' }}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar
                    dataKey="completed"
                    fill="url(#roseBarGradient)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Module Usage Breakdown (Rose/Pink Gradient Progress Bars) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="bg-[#1F0D12] border border-rose-500/15 rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Module Usage Breakdown</h3>
              <p className="text-xs text-rose-300/30 mt-0.5">Family engagement per module</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20">
              <Flame className="w-3 h-3 text-rose-400" />
              <span className="text-[10px] font-medium text-rose-400">7 modules</span>
            </div>
          </div>
          <div className="space-y-4 mt-2">
            {MODULE_USAGE.map((mod, idx) => (
              <motion.div
                key={mod.module}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.05, duration: 0.3 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-white/60">{mod.module}</span>
                  <span className="text-xs font-semibold text-white/40">{mod.usage}%</span>
                </div>
                <div className="h-2.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${mod.usage}%` }}
                    transition={{ delay: 0.4 + idx * 0.05, duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(to right, ${mod.color}, ${mod.color}99)`,
                    }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ─── Family Activity Heatmap (Rose Scale) ─────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="bg-[#1F0D12] border border-rose-500/15 rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Family Activity Heatmap</h3>
            <p className="text-xs text-rose-300/30 mt-0.5">Activity intensity by day and hour</p>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/20">Less</span>
            <div className="flex items-center gap-0.5">
              <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }} />
              <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: 'rgba(244,63,94,0.15)' }} />
              <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: 'rgba(244,63,94,0.35)' }} />
              <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: 'rgba(244,63,94,0.55)' }} />
              <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: 'rgba(244,63,94,0.8)' }} />
            </div>
            <span className="text-[10px] text-white/20">More</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Hour labels */}
            <div className="flex items-center mb-1 pl-10">
              {HEATMAP_HOURS.filter(h => h % 3 === 0).map(h => (
                <div key={h} className="flex-1 text-center">
                  <span className="text-[9px] text-white/15">{h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}</span>
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="space-y-[2px]">
              {HEATMAP_DAYS.map((day, dayIdx) => (
                <div key={day} className="flex items-center gap-1">
                  <span className="text-[10px] text-white/25 w-8 shrink-0 text-right">{day}</span>
                  <div className="flex-1 grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(24, minmax(0, 1fr))' }}>
                    {HEATMAP_DATA[dayIdx].map((value, hourIdx) => (
                      <HeatmapCell key={hourIdx} value={value} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Key Metrics Row (Rose-tinted) ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {keyMetrics.map((metric, idx) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + idx * 0.04, duration: 0.3 }}
            className="bg-[#1F0D12] border border-rose-500/10 rounded-xl p-4 hover:border-rose-500/20 transition-colors"
          >
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${metric.gradient} flex items-center justify-center mb-3`}>
              <metric.icon className={`w-4 h-4 ${metric.color}`} />
            </div>
            <p className="text-lg font-bold text-white">{metric.value}</p>
            <p className="text-[10px] text-rose-300/40 mt-0.5">{metric.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ─── Family List Table ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="bg-[#1F0D12] border border-rose-500/15 rounded-xl overflow-hidden"
      >
        {/* Toolbar */}
        <div className="p-4 border-b border-rose-500/10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              type="text"
              placeholder="Search families..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0D0A0B] border border-rose-500/10 rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-rose-500/30 transition-colors"
            />
          </div>
          <span className="text-xs text-rose-300/30">
            {filteredFamilies.length} families
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-rose-500/10 hover:bg-transparent">
                <TableHead
                  className="text-rose-300/40 text-xs font-medium cursor-pointer select-none hover:text-rose-300/60 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <span className="inline-flex items-center gap-1">Family Name {renderSortIcon('name')}</span>
                </TableHead>
                <TableHead
                  className="text-rose-300/40 text-xs font-medium cursor-pointer select-none hover:text-rose-300/60 transition-colors"
                  onClick={() => handleSort('members')}
                >
                  <span className="inline-flex items-center gap-1">Members {renderSortIcon('members')}</span>
                </TableHead>
                <TableHead
                  className="text-rose-300/40 text-xs font-medium cursor-pointer select-none hover:text-rose-300/60 transition-colors"
                  onClick={() => handleSort('plan')}
                >
                  <span className="inline-flex items-center gap-1">Plan {renderSortIcon('plan')}</span>
                </TableHead>
                <TableHead
                  className="text-rose-300/40 text-xs font-medium cursor-pointer select-none hover:text-rose-300/60 transition-colors"
                  onClick={() => handleSort('tasksCompleted')}
                >
                  <span className="inline-flex items-center gap-1">Tasks Completed {renderSortIcon('tasksCompleted')}</span>
                </TableHead>
                <TableHead
                  className="text-rose-300/40 text-xs font-medium cursor-pointer select-none hover:text-rose-300/60 transition-colors"
                  onClick={() => handleSort('lastActive')}
                >
                  <span className="inline-flex items-center gap-1">Last Active {renderSortIcon('lastActive')}</span>
                </TableHead>
                <TableHead
                  className="text-rose-300/40 text-xs font-medium cursor-pointer select-none hover:text-rose-300/60 transition-colors min-w-[180px]"
                  onClick={() => handleSort('activityScore')}
                >
                  <span className="inline-flex items-center gap-1">Activity Score {renderSortIcon('activityScore')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {filteredFamilies.map((family, idx) => (
                  <motion.tr
                    key={family.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ delay: idx * 0.02, duration: 0.2 }}
                    className="border-b border-rose-500/5 hover:bg-rose-500/5 transition-colors"
                  >
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar with Rose gradient ring */}
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500/30 to-pink-500/30 ring-2 ring-rose-500/20 flex items-center justify-center text-xs font-medium text-white/80 shrink-0">
                          {family.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-white/90">{family.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-white/50">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-rose-300/30" />
                        {family.members}
                      </div>
                    </TableCell>
                    <TableCell><PlanBadge plan={family.plan} /></TableCell>
                    <TableCell className="text-sm text-white/50">{family.tasksCompleted.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-white/35">{formatTimeAgo(family.lastActive)}</TableCell>
                    <TableCell>
                      <ActivityScoreBar score={family.activityScore} />
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>

              {filteredFamilies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Home className="w-8 h-8 text-rose-500/10" />
                      <p className="text-sm text-white/25">No families found</p>
                      <p className="text-xs text-white/15">Try adjusting your search</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>

      {/* ─── Privacy Notice ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-start gap-3 p-4 rounded-xl bg-[#1F0D12] border border-rose-500/10"
      >
        <Shield className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-white/50">Privacy-First Analytics</p>
          <p className="text-[10px] text-rose-300/30 mt-0.5 leading-relaxed">
            This view displays only aggregate family metrics and engagement statistics. Private messages, files, task content,
            and personal data are never accessible. All data is anonymized and shown in aggregate form only.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
