'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Users, Activity, Clock, Search, ChevronUp, ChevronDown,
  TrendingUp, Shield, ShoppingCart, CalendarDays, MessageSquare,
  FileUp, UserPlus, Trophy, Flame
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
  { module: 'Tasks', usage: 92, color: '#6366F1' },
  { module: 'Grocery', usage: 78, color: '#818CF8' },
  { module: 'Calendar', usage: 65, color: '#A78BFA' },
  { module: 'Chat', usage: 54, color: '#C4B5FD' },
  { module: 'Files', usage: 31, color: '#7C3AED' },
  { module: 'Budget', usage: 24, color: '#5B21B6' },
  { module: 'Meal Plan', usage: 18, color: '#4C1D95' },
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
// Values 0-10 intensity scale; peaks at evenings (18-21), secondary morning peak (8-10)
function generateHeatmapData(): number[][] {
  const days = 7
  const hours = 24
  const data: number[][] = []

  for (let d = 0; d < days; d++) {
    const row: number[] = []
    for (let h = 0; h < hours; h++) {
      let base = 1
      // Evening peak 6-9 PM
      if (h >= 18 && h <= 21) {
        base = d >= 1 && d <= 5 ? 8 + Math.floor(Math.random() * 3) : 6 + Math.floor(Math.random() * 3)
      }
      // Morning peak 8-10 AM
      else if (h >= 8 && h <= 10) {
        base = d >= 1 && d <= 5 ? 5 + Math.floor(Math.random() * 3) : 3 + Math.floor(Math.random() * 2)
      }
      // Lunch time slight bump
      else if (h >= 12 && h <= 13) {
        base = 3 + Math.floor(Math.random() * 2)
      }
      // Late night very low
      else if (h >= 23 || h <= 5) {
        base = Math.floor(Math.random() * 2)
      }
      // Midday moderate
      else {
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

function getScoreColor(score: number): string {
  if (score >= 80) return 'emerald'
  if (score >= 60) return 'amber'
  return 'red'
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomBarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a24] border border-white/[0.08] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      <p className="text-sm font-semibold text-white">{payload[0].value} tasks</p>
    </div>
  )
}

// ─── Plan Badge ───────────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    'Free': { bg: 'bg-white/[0.06]', text: 'text-white/60' },
    'Pro': { bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
    'Family+': { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  }
  const c = config[plan] || config['Free']
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {plan}
    </span>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, trend, trendLabel, gradientFrom, gradientTo, delay = 0 }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string | number
  trend?: string; trendLabel?: string; gradientFrom: string; gradientTo: string; delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="bg-[#111117] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.1] transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        {trend && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${trend.startsWith('↑') || trend.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
            <TrendingUp className="w-3 h-3" />
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white mt-3">{value}</p>
      <p className="text-xs text-white/40 mt-1">{label}</p>
      {trendLabel && <p className="text-[10px] text-white/25 mt-0.5">{trendLabel}</p>}
    </motion.div>
  )
}

// ─── Activity Score Bar ───────────────────────────────────────────────────────

function ActivityScoreBar({ score }: { score: number }) {
  const color = getScoreColor(score)
  const gradientClass = color === 'emerald'
    ? 'from-emerald-500 to-emerald-400'
    : color === 'amber'
      ? 'from-amber-500 to-amber-400'
      : 'from-red-500 to-red-400'

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
      <span className={`text-xs font-medium min-w-[32px] text-right ${
        color === 'emerald' ? 'text-emerald-400' : color === 'amber' ? 'text-amber-400' : 'text-red-400'
      }`}>
        {score}
      </span>
    </div>
  )
}

// ─── Heatmap Cell ─────────────────────────────────────────────────────────────

function HeatmapCell({ value }: { value: number }) {
  // Intensity from 0 to 10; 0 = transparent, 10 = indigo-500/80
  const maxVal = 10
  const intensity = Math.min(value / maxVal, 1)
  const opacity = intensity * 0.8

  return (
    <div
      className="w-full aspect-square rounded-[2px] transition-colors"
      style={{
        backgroundColor: intensity > 0 ? `rgba(99, 102, 241, ${opacity})` : 'rgba(255, 255, 255, 0.02)',
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
      ? <ChevronUp className="w-3 h-3 text-indigo-400" />
      : <ChevronDown className="w-3 h-3 text-indigo-400" />
  }

  // Key metrics data
  const keyMetrics = [
    { icon: ShoppingCart, label: 'Grocery Activity', value: '78%', color: 'text-violet-400', gradient: 'from-violet-500/20 to-violet-600/10' },
    { icon: CalendarDays, label: 'Calendar Usage', value: '65%', color: 'text-indigo-400', gradient: 'from-indigo-500/20 to-indigo-600/10' },
    { icon: MessageSquare, label: 'Chat Engagement', value: '54%', color: 'text-blue-400', gradient: 'from-blue-500/20 to-blue-600/10' },
    { icon: FileUp, label: 'File Uploads', value: '31%', color: 'text-cyan-400', gradient: 'from-cyan-500/20 to-cyan-600/10' },
    { icon: UserPlus, label: 'Invite Conversion', value: '72%', color: 'text-emerald-400', gradient: 'from-emerald-500/20 to-emerald-600/10' },
    { icon: Trophy, label: 'Most Active', value: 'Tasks', color: 'text-amber-400', gradient: 'from-amber-500/20 to-amber-600/10' },
  ]

  return (
    <div className="space-y-6">
      {/* ─── Top Stats Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Home}
          label="Total Families"
          value="1,247"
          trend="↑15.3%"
          trendLabel="vs last month"
          gradientFrom="from-indigo-500/20"
          gradientTo="to-indigo-600/10"
          delay={0}
        />
        <StatCard
          icon={Users}
          label="Avg Family Size"
          value="3.8"
          gradientFrom="from-violet-500/20"
          gradientTo="to-violet-600/10"
          delay={0.05}
        />
        <StatCard
          icon={Activity}
          label="Active Families"
          value="891"
          trend="71.5%"
          trendLabel="of total families"
          gradientFrom="from-emerald-500/20"
          gradientTo="to-emerald-600/10"
          delay={0.1}
        />
        <StatCard
          icon={Clock}
          label="Family Retention"
          value="87%"
          gradientFrom="from-amber-500/20"
          gradientTo="to-amber-600/10"
          delay={0.15}
        />
      </div>

      {/* ─── Activity Charts Row ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Task Completion Trend */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="bg-[#111117] border border-white/[0.06] rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Task Completion Trend</h3>
              <p className="text-xs text-white/30 mt-0.5">Last 12 weeks</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-400">+18% WoW</span>
            </div>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TASK_COMPLETION_TREND} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="week"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar
                  dataKey="completed"
                  fill="#6366F1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Module Usage Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
          className="bg-[#111117] border border-white/[0.06] rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Module Usage Breakdown</h3>
              <p className="text-xs text-white/30 mt-0.5">Family engagement per module</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              <Flame className="w-3 h-3 text-indigo-400" />
              <span className="text-[10px] font-medium text-indigo-400">7 modules</span>
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
                  <span className="text-xs font-medium text-white/70">{mod.module}</span>
                  <span className="text-xs font-semibold text-white/50">{mod.usage}%</span>
                </div>
                <div className="h-2.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${mod.usage}%` }}
                    transition={{ delay: 0.4 + idx * 0.05, duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: mod.color }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ─── Family Activity Heatmap ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="bg-[#111117] border border-white/[0.06] rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Family Activity Heatmap</h3>
            <p className="text-xs text-white/30 mt-0.5">Activity intensity by day and hour</p>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/30">Less</span>
            <div className="flex items-center gap-0.5">
              <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }} />
              <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: 'rgba(99,102,241,0.15)' }} />
              <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: 'rgba(99,102,241,0.35)' }} />
              <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: 'rgba(99,102,241,0.55)' }} />
              <div className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: 'rgba(99,102,241,0.8)' }} />
            </div>
            <span className="text-[10px] text-white/30">More</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Hour labels */}
            <div className="flex items-center mb-1 pl-10">
              {HEATMAP_HOURS.filter(h => h % 3 === 0).map(h => (
                <div key={h} className="flex-1 text-center">
                  <span className="text-[9px] text-white/20">{h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}</span>
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="space-y-[2px]">
              {HEATMAP_DAYS.map((day, dayIdx) => (
                <div key={day} className="flex items-center gap-1">
                  <span className="text-[10px] text-white/30 w-8 shrink-0 text-right">{day}</span>
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

      {/* ─── Key Metrics Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {keyMetrics.map((metric, idx) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 + idx * 0.04, duration: 0.3 }}
            className="bg-[#111117] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.1] transition-colors"
          >
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${metric.gradient} flex items-center justify-center mb-3`}>
              <metric.icon className={`w-4 h-4 ${metric.color}`} />
            </div>
            <p className="text-lg font-bold text-white">{metric.value}</p>
            <p className="text-[10px] text-white/40 mt-0.5">{metric.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ─── Family List Table ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="bg-[#111117] border border-white/[0.06] rounded-xl overflow-hidden"
      >
        {/* Toolbar */}
        <div className="p-4 border-b border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search families..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#0B0B0F] border border-white/[0.06] rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/30 transition-colors"
            />
          </div>
          <span className="text-xs text-white/30">
            {filteredFamilies.length} families
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead
                  className="text-white/40 text-xs font-medium cursor-pointer select-none hover:text-white/60 transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <span className="inline-flex items-center gap-1">Family Name {renderSortIcon('name')}</span>
                </TableHead>
                <TableHead
                  className="text-white/40 text-xs font-medium cursor-pointer select-none hover:text-white/60 transition-colors"
                  onClick={() => handleSort('members')}
                >
                  <span className="inline-flex items-center gap-1">Members {renderSortIcon('members')}</span>
                </TableHead>
                <TableHead
                  className="text-white/40 text-xs font-medium cursor-pointer select-none hover:text-white/60 transition-colors"
                  onClick={() => handleSort('plan')}
                >
                  <span className="inline-flex items-center gap-1">Plan {renderSortIcon('plan')}</span>
                </TableHead>
                <TableHead
                  className="text-white/40 text-xs font-medium cursor-pointer select-none hover:text-white/60 transition-colors"
                  onClick={() => handleSort('tasksCompleted')}
                >
                  <span className="inline-flex items-center gap-1">Tasks Completed {renderSortIcon('tasksCompleted')}</span>
                </TableHead>
                <TableHead
                  className="text-white/40 text-xs font-medium cursor-pointer select-none hover:text-white/60 transition-colors"
                  onClick={() => handleSort('lastActive')}
                >
                  <span className="inline-flex items-center gap-1">Last Active {renderSortIcon('lastActive')}</span>
                </TableHead>
                <TableHead
                  className="text-white/40 text-xs font-medium cursor-pointer select-none hover:text-white/60 transition-colors min-w-[180px]"
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
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/30 flex items-center justify-center text-xs font-medium text-white/80 shrink-0">
                          {family.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-white/90">{family.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-white/50">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-white/30" />
                        {family.members}
                      </div>
                    </TableCell>
                    <TableCell><PlanBadge plan={family.plan} /></TableCell>
                    <TableCell className="text-sm text-white/50">{family.tasksCompleted.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-white/40">{formatTimeAgo(family.lastActive)}</TableCell>
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
                      <Home className="w-8 h-8 text-white/10" />
                      <p className="text-sm text-white/30">No families found</p>
                      <p className="text-xs text-white/20">Try adjusting your search</p>
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
        className="flex items-start gap-3 p-4 rounded-xl bg-[#111117] border border-white/[0.06]"
      >
        <Shield className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-medium text-white/60">Privacy-First Analytics</p>
          <p className="text-[10px] text-white/30 mt-0.5 leading-relaxed">
            This view displays only aggregate family metrics and engagement statistics. Private messages, files, task content,
            and personal data are never accessible. All data is anonymized and shown in aggregate form only.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
