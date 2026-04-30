'use client'

import { motion } from 'framer-motion'
import {
  BarChart3, TrendingUp, TrendingDown, Minus,
  ArrowDown, Zap, Activity, Target, ChevronRight
} from 'lucide-react'

// ─── Demo Data ───────────────────────────────────────────────────

const TOP_STATS = [
  { label: 'Total Feature Interactions', value: '47,293', sub: 'today', icon: Activity, color: 'from-indigo-500 to-violet-500' },
  { label: 'Most Used Feature', value: 'Task Creation', sub: '8,291/day', icon: TrendingUp, color: 'from-emerald-500 to-teal-500' },
  { label: 'Weakest Feature', value: 'Chores', sub: '412/day', icon: TrendingDown, color: 'from-amber-500 to-orange-500' },
  { label: 'Avg Features / Session', value: '4.7', sub: 'across all users', icon: Target, color: 'from-rose-500 to-pink-500' },
]

interface FeatureRow {
  name: string
  dailyAvg: number
  weeklyTrend: number[]
  adoptionRate: number
  dropOffRate: number
  status: 'strong' | 'moderate' | 'weak'
}

const FEATURES: FeatureRow[] = [
  { name: 'Task Creation', dailyAvg: 8291, weeklyTrend: [7200, 7800, 8100, 7900, 8500, 8400, 8291], adoptionRate: 92, dropOffRate: 2.1, status: 'strong' },
  { name: 'Task Completion', dailyAvg: 6140, weeklyTrend: [5500, 5800, 6000, 5900, 6200, 6100, 6140], adoptionRate: 78, dropOffRate: 4.8, status: 'strong' },
  { name: 'Grocery List', dailyAvg: 4872, weeklyTrend: [4200, 4500, 4700, 4600, 4900, 4800, 4872], adoptionRate: 71, dropOffRate: 5.2, status: 'moderate' },
  { name: 'Calendar Events', dailyAvg: 3650, weeklyTrend: [3200, 3400, 3500, 3400, 3700, 3600, 3650], adoptionRate: 64, dropOffRate: 6.1, status: 'moderate' },
  { name: 'Chat Messages', dailyAvg: 5230, weeklyTrend: [4800, 5000, 5100, 5000, 5300, 5200, 5230], adoptionRate: 82, dropOffRate: 3.5, status: 'strong' },
  { name: 'File Uploads', dailyAvg: 1890, weeklyTrend: [1700, 1800, 1850, 1800, 1900, 1880, 1890], adoptionRate: 38, dropOffRate: 12.4, status: 'moderate' },
  { name: 'Settings Changes', dailyAvg: 1240, weeklyTrend: [1100, 1150, 1200, 1180, 1250, 1230, 1240], adoptionRate: 45, dropOffRate: 8.7, status: 'moderate' },
  { name: 'Invite Codes', dailyAvg: 890, weeklyTrend: [800, 830, 860, 850, 900, 880, 890], adoptionRate: 28, dropOffRate: 16.2, status: 'weak' },
  { name: 'Language Switch', dailyAvg: 560, weeklyTrend: [520, 540, 550, 540, 570, 560, 560], adoptionRate: 22, dropOffRate: 3.8, status: 'moderate' },
  { name: 'Notifications', dailyAvg: 3410, weeklyTrend: [3000, 3200, 3300, 3200, 3500, 3400, 3410], adoptionRate: 68, dropOffRate: 4.2, status: 'strong' },
  { name: 'Search / Command Palette', dailyAvg: 2780, weeklyTrend: [2400, 2600, 2700, 2600, 2800, 2750, 2780], adoptionRate: 56, dropOffRate: 7.3, status: 'moderate' },
  { name: 'Upgrade Prompts', dailyAvg: 680, weeklyTrend: [620, 650, 660, 660, 690, 680, 680], adoptionRate: 18, dropOffRate: 22.5, status: 'weak' },
  { name: 'Meal Planning', dailyAvg: 1520, weeklyTrend: [1300, 1400, 1450, 1420, 1550, 1500, 1520], adoptionRate: 34, dropOffRate: 11.8, status: 'moderate' },
  { name: 'Budget Tracking', dailyAvg: 980, weeklyTrend: [880, 920, 950, 940, 990, 970, 980], adoptionRate: 26, dropOffRate: 14.6, status: 'weak' },
  { name: 'Milestones', dailyAvg: 710, weeklyTrend: [640, 670, 690, 680, 720, 710, 710], adoptionRate: 24, dropOffRate: 9.1, status: 'moderate' },
  { name: 'Chores', dailyAvg: 412, weeklyTrend: [380, 390, 400, 395, 420, 410, 412], adoptionRate: 16, dropOffRate: 18.3, status: 'weak' },
]

const FUNNEL_STEPS = [
  { step: 'App Visit', count: 12847 },
  { step: 'Sign Up', count: 3256 },
  { step: 'Family Create', count: 2891 },
  { step: 'First Task', count: 2540 },
  { step: 'First Grocery', count: 1920 },
  { step: 'First Chat', count: 1340 },
  { step: 'Upgrade Prompt', count: 680 },
  { step: 'Subscribe', count: 89 },
]

const UPGRADE_PROMPTS = [
  { name: 'Task Limit', clicks: 342, ctr: 4.8 },
  { name: 'Storage Full', clicks: 218, ctr: 3.1 },
  { name: 'Feature Locked', clicks: 156, ctr: 2.2 },
  { name: 'Trial Banner', clicks: 89, ctr: 1.3 },
  { name: 'Settings Upsell', clicks: 52, ctr: 0.7 },
]

const ADOPTION_OVER_TIME = [
  { month: 'Mar', taskCreation: 62, taskCompletion: 48, groceryList: 42, chatMessages: 55, calendarEvents: 35 },
  { month: 'Apr', taskCreation: 66, taskCompletion: 51, groceryList: 45, chatMessages: 58, calendarEvents: 38 },
  { month: 'May', taskCreation: 69, taskCompletion: 54, groceryList: 48, chatMessages: 61, calendarEvents: 41 },
  { month: 'Jun', taskCreation: 72, taskCompletion: 57, groceryList: 52, chatMessages: 64, calendarEvents: 44 },
  { month: 'Jul', taskCreation: 74, taskCompletion: 59, groceryList: 54, chatMessages: 67, calendarEvents: 46 },
  { month: 'Aug', taskCreation: 77, taskCompletion: 62, groceryList: 57, chatMessages: 70, calendarEvents: 49 },
  { month: 'Sep', taskCreation: 80, taskCompletion: 65, groceryList: 60, chatMessages: 73, calendarEvents: 52 },
  { month: 'Oct', taskCreation: 83, taskCompletion: 68, groceryList: 63, chatMessages: 76, calendarEvents: 55 },
  { month: 'Nov', taskCreation: 86, taskCompletion: 71, groceryList: 65, chatMessages: 78, calendarEvents: 57 },
  { month: 'Dec', taskCreation: 88, taskCompletion: 73, groceryList: 67, chatMessages: 80, calendarEvents: 59 },
  { month: 'Jan', taskCreation: 90, taskCompletion: 76, groceryList: 69, chatMessages: 81, calendarEvents: 62 },
  { month: 'Feb', taskCreation: 92, taskCompletion: 78, groceryList: 71, chatMessages: 82, calendarEvents: 64 },
]

// ─── Animation Variants ──────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}

// ─── Sparkline Component ─────────────────────────────────────────

function Sparkline({ data, color = '#6366F1' }: { data: number[]; color?: string }) {
  const width = 64
  const height = 24
  const padding = 2
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2)
    const y = height - padding - ((v - min) / range) * (height - padding * 2)
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="inline-block">
      <defs>
        <linearGradient id={`spark-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#spark-grad-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Progress Bar Component ──────────────────────────────────────

function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100)
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-white/50 w-8 text-right">{value}%</span>
    </div>
  )
}

// ─── Status Badge ────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'strong' | 'moderate' | 'weak' }) {
  const styles = {
    strong: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    moderate: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    weak: 'bg-red-500/10 text-red-400 border-red-500/20',
  }
  const labels = { strong: 'Strong', moderate: 'Moderate', weak: 'Weak' }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

// ─── Drop-off Rate Display ───────────────────────────────────────

function DropOffRate({ rate }: { rate: number }) {
  let color = 'text-emerald-400'
  if (rate > 15) color = 'text-red-400'
  else if (rate > 5) color = 'text-amber-400'

  return <span className={`text-xs font-medium ${color}`}>{rate}%</span>
}

// ─── Main Component ──────────────────────────────────────────────

export function AdminFeatures() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Title */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Feature Usage Intelligence
          </h2>
          <p className="text-sm text-white/40 mt-1">Track feature adoption, drop-offs, and conversion across the platform</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          <span className="text-xs text-white/40">Last 30 days</span>
        </div>
      </motion.div>

      {/* ─── Section 1: Top Stats ─────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TOP_STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
            className="stat-card-wrapper bg-[#111117] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
            <p className="text-xs text-white/40 mt-1">{stat.label}</p>
            <p className="text-[10px] text-white/25 mt-0.5">{stat.sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* ─── Section 2: Feature Usage Table ───────────────────── */}
      <motion.div
        variants={itemVariants}
        className="bg-[#111117] border border-white/[0.06] rounded-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Feature Usage Breakdown</h3>
          <span className="text-[10px] text-white/30">{FEATURES.length} features tracked</span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="text-left px-5 py-3 text-[10px] font-medium text-white/30 uppercase tracking-wider">Feature Name</th>
                <th className="text-left px-4 py-3 text-[10px] font-medium text-white/30 uppercase tracking-wider">Daily Avg</th>
                <th className="text-left px-4 py-3 text-[10px] font-medium text-white/30 uppercase tracking-wider">Weekly Trend</th>
                <th className="text-left px-4 py-3 text-[10px] font-medium text-white/30 uppercase tracking-wider min-w-[140px]">Adoption Rate</th>
                <th className="text-left px-4 py-3 text-[10px] font-medium text-white/30 uppercase tracking-wider">Drop-off</th>
                <th className="text-left px-4 py-3 text-[10px] font-medium text-white/30 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f, i) => (
                <motion.tr
                  key={f.name}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.03 }}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="px-5 py-3">
                    <span className="text-white/80 font-medium text-xs">{f.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white/60 text-xs font-mono">{f.dailyAvg.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Sparkline
                      data={f.weeklyTrend}
                      color={f.status === 'strong' ? '#22C55E' : f.status === 'moderate' ? '#F59E0B' : '#EF4444'}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <ProgressBar value={f.adoptionRate} />
                  </td>
                  <td className="px-4 py-3">
                    <DropOffRate rate={f.dropOffRate} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={f.status} />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ─── Section 3 & 4: Conversion Funnel + Upgrade Prompt CTR ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Conversion Funnel */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-3 bg-[#111117] border border-white/[0.06] rounded-xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-5">Conversion Funnel</h3>
          <div className="space-y-2">
            {FUNNEL_STEPS.map((step, i) => {
              const maxCount = FUNNEL_STEPS[0].count
              const widthPct = Math.max((step.count / maxCount) * 100, 8)
              const prevCount = i > 0 ? FUNNEL_STEPS[i - 1].count : null
              const dropOffPct = prevCount ? ((1 - step.count / prevCount) * 100) : null

              // Gradient from indigo to violet, getting more transparent as funnel narrows
              const opacity = 0.3 + (widthPct / 100) * 0.7

              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.07 }}
                  className="flex items-center gap-3"
                >
                  {/* Bar */}
                  <div className="flex-1 relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPct}%` }}
                      transition={{ delay: 0.4 + i * 0.07, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="h-9 rounded-lg flex items-center px-3"
                      style={{
                        background: `linear-gradient(90deg, rgba(99,102,241,${opacity}), rgba(139,92,246,${opacity * 0.7}))`,
                      }}
                    >
                      <span className="text-xs font-medium text-white/90 whitespace-nowrap">{step.step}</span>
                    </motion.div>
                  </div>

                  {/* Count */}
                  <span className="text-xs font-mono text-white/60 w-14 text-right">{step.count.toLocaleString()}</span>

                  {/* Drop-off */}
                  <div className="w-16 text-right flex items-center justify-end gap-1">
                    {dropOffPct !== null && (
                      <>
                        <ArrowDown className="w-3 h-3 text-red-400/60" />
                        <span className="text-[10px] text-red-400/80 font-medium">{dropOffPct.toFixed(1)}%</span>
                      </>
                    )}
                    {dropOffPct === null && (
                      <span className="text-[10px] text-white/20">—</span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Funnel Summary */}
          <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-6">
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Overall Conversion</p>
              <p className="text-lg font-bold text-white">{((FUNNEL_STEPS[FUNNEL_STEPS.length - 1].count / FUNNEL_STEPS[0].count) * 100).toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Visit → Sign Up</p>
              <p className="text-lg font-bold text-indigo-400">{((FUNNEL_STEPS[1].count / FUNNEL_STEPS[0].count) * 100).toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">Biggest Drop</p>
              <p className="text-lg font-bold text-red-400">Upgrade → Sub</p>
            </div>
          </div>
        </motion.div>

        {/* Upgrade Prompt CTR */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 bg-[#111117] border border-white/[0.06] rounded-xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-5">Upgrade Prompt CTR</h3>
          <div className="space-y-4">
            {UPGRADE_PROMPTS.map((prompt, i) => {
              const maxClicks = UPGRADE_PROMPTS[0].clicks
              const widthPct = (prompt.clicks / maxClicks) * 100
              const barColor = i === 0
                ? 'from-indigo-500 to-violet-500'
                : i === 1
                  ? 'from-violet-500 to-purple-500'
                  : i === 2
                    ? 'from-purple-500 to-fuchsia-500'
                    : i === 3
                      ? 'from-fuchsia-500 to-pink-500'
                      : 'from-pink-500 to-rose-500'

              return (
                <motion.div
                  key={prompt.name}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-white/60">{prompt.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/30">{prompt.clicks} clicks</span>
                      <span className="text-xs font-mono text-indigo-400">{prompt.ctr}%</span>
                    </div>
                  </div>
                  <div className="h-6 bg-white/[0.04] rounded-lg overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPct}%` }}
                      transition={{ delay: 0.4 + i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className={`h-full rounded-lg bg-gradient-to-r ${barColor} flex items-center px-2`}
                    >
                      <span className="text-[10px] font-medium text-white/90">{prompt.ctr}%</span>
                    </motion.div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Total Clicks</span>
              <span className="text-sm font-bold text-white">
                {UPGRADE_PROMPTS.reduce((s, p) => s + p.clicks, 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Avg CTR</span>
              <span className="text-sm font-bold text-indigo-400">
                {(UPGRADE_PROMPTS.reduce((s, p) => s + p.ctr, 0) / UPGRADE_PROMPTS.length).toFixed(1)}%
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ─── Section 5: Feature Adoption Over Time ────────────── */}
      <motion.div
        variants={itemVariants}
        className="bg-[#111117] border border-white/[0.06] rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-white">Feature Adoption Over Time</h3>
          <div className="flex items-center gap-4">
            {[
              { label: 'Task Creation', color: '#6366F1' },
              { label: 'Task Completion', color: '#22C55E' },
              { label: 'Grocery List', color: '#F59E0B' },
              { label: 'Chat Messages', color: '#EC4899' },
              { label: 'Calendar Events', color: '#06B6D4' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                <span className="text-[10px] text-white/40 hidden sm:block">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Multi-line chart as SVG */}
        <div className="relative h-64 w-full">
          <svg viewBox="0 0 700 220" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              {[
                { key: 'taskCreation', color: '#6366F1' },
                { key: 'taskCompletion', color: '#22C55E' },
                { key: 'groceryList', color: '#F59E0B' },
                { key: 'chatMessages', color: '#EC4899' },
                { key: 'calendarEvents', color: '#06B6D4' },
              ].map(line => (
                <linearGradient key={line.key} id={`line-grad-${line.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={line.color} stopOpacity="0.15" />
                  <stop offset="100%" stopColor={line.color} stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>

            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(v => {
              const y = 10 + ((100 - v) / 100) * 190
              return (
                <g key={v}>
                  <line x1="40" y1={y} x2="690" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  <text x="32" y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize="9">{v}%</text>
                </g>
              )
            })}

            {/* Month labels */}
            {ADOPTION_OVER_TIME.map((d, i) => {
              const x = 40 + (i / (ADOPTION_OVER_TIME.length - 1)) * 650
              return (
                <text key={d.month} x={x} y="218" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="9">{d.month}</text>
              )
            })}

            {/* Lines */}
            {[
              { key: 'taskCreation', color: '#6366F1' },
              { key: 'taskCompletion', color: '#22C55E' },
              { key: 'groceryList', color: '#F59E0B' },
              { key: 'chatMessages', color: '#EC4899' },
              { key: 'calendarEvents', color: '#06B6D4' },
            ].map(line => {
              const points = ADOPTION_OVER_TIME.map((d, i) => {
                const x = 40 + (i / (ADOPTION_OVER_TIME.length - 1)) * 650
                const y = 10 + ((100 - (d as Record<string, number>)[line.key]) / 100) * 190
                return { x, y }
              })

              const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
              const areaPath = `M ${points[0].x} 200 ${points.map(p => `L ${p.x} ${p.y}`).join(' ')} L ${points[points.length - 1].x} 200 Z`

              return (
                <g key={line.key}>
                  <path d={areaPath} fill={`url(#line-grad-${line.key})`} />
                  <path d={linePath} fill="none" stroke={line.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={line.color} stroke="#111117" strokeWidth="1.5" />
                  ))}
                </g>
              )
            })}
          </svg>
        </div>
      </motion.div>

      {/* ─── Quick Insights Cards ──────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {[
          {
            title: 'Fastest Growing',
            value: 'Meal Planning',
            detail: '+17% adoption this month',
            icon: Zap,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
          },
          {
            title: 'Biggest Drop-off',
            value: 'Upgrade Prompts',
            detail: '22.5% drop-off rate',
            icon: TrendingDown,
            color: 'text-red-400',
            bg: 'bg-red-500/10',
          },
          {
            title: 'Stable Performer',
            value: 'Chat Messages',
            detail: 'Consistent 82% adoption',
            icon: Minus,
            color: 'text-indigo-400',
            bg: 'bg-indigo-500/10',
          },
        ].map((insight, i) => (
          <motion.div
            key={insight.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.06 }}
            className="bg-[#111117] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] transition-colors"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded-lg ${insight.bg} flex items-center justify-center`}>
                <insight.icon className={`w-4 h-4 ${insight.color}`} />
              </div>
              <span className="text-[10px] text-white/30 uppercase tracking-wider">{insight.title}</span>
            </div>
            <p className="text-sm font-semibold text-white">{insight.value}</p>
            <p className="text-xs text-white/40 mt-0.5">{insight.detail}</p>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}
