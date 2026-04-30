'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  FlaskConical, TrendingUp, TrendingDown, Minus,
  ArrowDown, Zap, Activity, Target, ChevronRight, MousePointer
} from 'lucide-react'

// ─── Demo Data ───────────────────────────────────────────────────

const TOP_STATS = [
  { label: 'Total Feature Interactions', value: '47,293', sub: 'today', icon: Activity, trend: '+12.4%', trendUp: true },
  { label: 'Most Used Feature', value: 'Task Creation', sub: '8,291/day', icon: TrendingUp, trend: '+8.2%', trendUp: true },
  { label: 'Weakest Feature', value: 'Chores', sub: '412/day', icon: TrendingDown, trend: '-3.1%', trendUp: false },
  { label: 'Avg Features / Session', value: '4.7', sub: 'across all users', icon: Target, trend: '+0.3', trendUp: true },
  { label: 'Feature Discoverability', value: '68%', sub: 'findability score', icon: Zap, trend: '+5%', trendUp: true },
]

interface FeatureRow {
  name: string
  dailyAvg: number
  weeklyTrend: number[]
  adoptionRate: number
  dropOffRate: number
  status: 'strong' | 'moderate' | 'weak'
  category: string
}

const FEATURES: FeatureRow[] = [
  { name: 'Task Creation', dailyAvg: 8291, weeklyTrend: [7200, 7800, 8100, 7900, 8500, 8400, 8291], adoptionRate: 92, dropOffRate: 2.1, status: 'strong', category: 'Productivity' },
  { name: 'Task Completion', dailyAvg: 6140, weeklyTrend: [5500, 5800, 6000, 5900, 6200, 6100, 6140], adoptionRate: 78, dropOffRate: 4.8, status: 'strong', category: 'Productivity' },
  { name: 'Grocery List', dailyAvg: 4872, weeklyTrend: [4200, 4500, 4700, 4600, 4900, 4800, 4872], adoptionRate: 71, dropOffRate: 5.2, status: 'moderate', category: 'Household' },
  { name: 'Calendar Events', dailyAvg: 3650, weeklyTrend: [3200, 3400, 3500, 3400, 3700, 3600, 3650], adoptionRate: 64, dropOffRate: 6.1, status: 'moderate', category: 'Planning' },
  { name: 'Chat Messages', dailyAvg: 5230, weeklyTrend: [4800, 5000, 5100, 5000, 5300, 5200, 5230], adoptionRate: 82, dropOffRate: 3.5, status: 'strong', category: 'Communication' },
  { name: 'File Uploads', dailyAvg: 1890, weeklyTrend: [1700, 1800, 1850, 1800, 1900, 1880, 1890], adoptionRate: 38, dropOffRate: 12.4, status: 'moderate', category: 'Storage' },
  { name: 'Settings Changes', dailyAvg: 1240, weeklyTrend: [1100, 1150, 1200, 1180, 1250, 1230, 1240], adoptionRate: 45, dropOffRate: 8.7, status: 'moderate', category: 'Account' },
  { name: 'Invite Codes', dailyAvg: 890, weeklyTrend: [800, 830, 860, 850, 900, 880, 890], adoptionRate: 28, dropOffRate: 16.2, status: 'weak', category: 'Growth' },
  { name: 'Language Switch', dailyAvg: 560, weeklyTrend: [520, 540, 550, 540, 570, 560, 560], adoptionRate: 22, dropOffRate: 3.8, status: 'moderate', category: 'Account' },
  { name: 'Notifications', dailyAvg: 3410, weeklyTrend: [3000, 3200, 3300, 3200, 3500, 3400, 3410], adoptionRate: 68, dropOffRate: 4.2, status: 'strong', category: 'Communication' },
  { name: 'Search / Command Palette', dailyAvg: 2780, weeklyTrend: [2400, 2600, 2700, 2600, 2800, 2750, 2780], adoptionRate: 56, dropOffRate: 7.3, status: 'moderate', category: 'Productivity' },
  { name: 'Upgrade Prompts', dailyAvg: 680, weeklyTrend: [620, 650, 660, 660, 690, 680, 680], adoptionRate: 18, dropOffRate: 22.5, status: 'weak', category: 'Monetization' },
  { name: 'Meal Planning', dailyAvg: 1520, weeklyTrend: [1300, 1400, 1450, 1420, 1550, 1500, 1520], adoptionRate: 34, dropOffRate: 11.8, status: 'moderate', category: 'Household' },
  { name: 'Budget Tracking', dailyAvg: 980, weeklyTrend: [880, 920, 950, 940, 990, 970, 980], adoptionRate: 26, dropOffRate: 14.6, status: 'weak', category: 'Finance' },
  { name: 'Milestones', dailyAvg: 710, weeklyTrend: [640, 670, 690, 680, 720, 710, 710], adoptionRate: 24, dropOffRate: 9.1, status: 'moderate', category: 'Engagement' },
  { name: 'Chores', dailyAvg: 412, weeklyTrend: [380, 390, 400, 395, 420, 410, 412], adoptionRate: 16, dropOffRate: 18.3, status: 'weak', category: 'Household' },
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

function Sparkline({ data, color = '#F59E0B' }: { data: number[]; color?: string }) {
  const width = 80
  const height = 28
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

// ─── Mini Bar Chart Background for Stats ─────────────────────────

function MiniBarBg() {
  const bars = [35, 55, 40, 65, 50, 70, 45, 60, 38, 72]
  const w = 120
  const h = 40
  const barW = 8
  const gap = 4

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute right-3 bottom-2 opacity-[0.08]">
      {bars.map((bar, i) => (
        <rect
          key={i}
          x={i * (barW + gap)}
          y={h - bar}
          width={barW}
          height={bar}
          rx={2}
          fill="#F59E0B"
        />
      ))}
    </svg>
  )
}

// ─── Circular Progress ───────────────────────────────────────────

function CircularProgress({ value, size = 36, strokeWidth = 3 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  const color = value >= 70 ? '#22C55E' : value >= 40 ? '#F59E0B' : '#EF4444'

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all duration-700"
      />
    </svg>
  )
}

// ─── Feature Card ────────────────────────────────────────────────

function FeatureCard({ feature, index }: { feature: FeatureRow; index: number }) {
  const [hovered, setHovered] = useState(false)
  const statusColor = feature.status === 'strong' ? '#22C55E' : feature.status === 'moderate' ? '#F59E0B' : '#EF4444'
  const sparkColor = feature.status === 'strong' ? '#22C55E' : feature.status === 'moderate' ? '#F59E0B' : '#EF4444'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 + index * 0.03 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative bg-gradient-to-r from-amber-500/[0.03] to-orange-500/[0.02] border border-amber-500/[0.08] rounded-xl p-4 hover:border-amber-500/[0.2] hover:from-amber-500/[0.06] hover:to-orange-500/[0.04] transition-all duration-300 cursor-default"
    >
      <div className="flex items-center gap-4">
        {/* Status dot */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: statusColor, boxShadow: `0 0 8px ${statusColor}40` }}
          />
          <span className="text-[8px] text-white/25 uppercase tracking-wider">
            {feature.status}
          </span>
        </div>

        {/* Feature name + sparkline */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm font-medium text-white/90 truncate">{feature.name}</span>
            <span className="text-[9px] text-amber-500/50 bg-amber-500/[0.06] px-1.5 py-0.5 rounded-full shrink-0">
              {feature.category}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40 font-mono">{feature.dailyAvg.toLocaleString()}/day</span>
            <Sparkline data={feature.weeklyTrend} color={sparkColor} />
          </div>
        </div>

        {/* Adoption rate circular progress */}
        <div className="shrink-0 flex items-center gap-2">
          <CircularProgress value={feature.adoptionRate} size={40} strokeWidth={3} />
          <div className="text-right">
            <span className="text-xs font-semibold text-amber-400">{feature.adoptionRate}%</span>
            <p className="text-[9px] text-white/25">adoption</p>
          </div>
        </div>
      </div>

      {/* Hover details */}
      <motion.div
        initial={false}
        animate={{ height: hovered ? 'auto' : 0, opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="pt-3 mt-3 border-t border-amber-500/[0.06] grid grid-cols-3 gap-3">
          <div>
            <p className="text-[9px] text-white/25 uppercase tracking-wider">Drop-off Rate</p>
            <span className={`text-xs font-medium ${feature.dropOffRate > 15 ? 'text-red-400' : feature.dropOffRate > 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {feature.dropOffRate}%
            </span>
          </div>
          <div>
            <p className="text-[9px] text-white/25 uppercase tracking-wider">Weekly Change</p>
            <span className={`text-xs font-medium ${feature.weeklyTrend[6] >= feature.weeklyTrend[0] ? 'text-emerald-400' : 'text-red-400'}`}>
              {feature.weeklyTrend[6] >= feature.weeklyTrend[0] ? '+' : ''}
              {(((feature.weeklyTrend[6] - feature.weeklyTrend[0]) / feature.weeklyTrend[0]) * 100).toFixed(1)}%
            </span>
          </div>
          <div>
            <p className="text-[9px] text-white/25 uppercase tracking-wider">Peak Day</p>
            <span className="text-xs font-medium text-white/60">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][feature.weeklyTrend.indexOf(Math.max(...feature.weeklyTrend))]}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Vertical Funnel ─────────────────────────────────────────────

function VerticalFunnel() {
  const maxCount = FUNNEL_STEPS[0].count
  const overallConversion = ((FUNNEL_STEPS[FUNNEL_STEPS.length - 1].count / maxCount) * 100).toFixed(2)

  return (
    <div className="flex flex-col items-center gap-0 py-4">
      {FUNNEL_STEPS.map((step, i) => {
        const widthPct = Math.max((step.count / maxCount) * 100, 12)
        const prevCount = i > 0 ? FUNNEL_STEPS[i - 1].count : null
        const dropOffPct = prevCount ? ((1 - step.count / prevCount) * 100) : null

        // Trapezoid: top width = current, bottom width = next step's width (or current if last)
        const nextWidthPct = i < FUNNEL_STEPS.length - 1
          ? Math.max((FUNNEL_STEPS[i + 1].count / maxCount) * 100, 12)
          : widthPct

        const topWidth = widthPct
        const bottomWidth = nextWidthPct

        // Amber gradient with opacity based on position
        const opacity = 0.15 + (widthPct / 100) * 0.55
        const opacityBottom = 0.15 + (bottomWidth / 100) * 0.55

        return (
          <motion.div
            key={step.step}
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
            className="relative w-full"
            style={{ transformOrigin: 'top' }}
          >
            <div className="flex items-center gap-3">
              {/* Left label */}
              <div className="w-20 text-right shrink-0">
                <p className="text-[10px] text-white/50 font-medium">{step.step}</p>
              </div>

              {/* Trapezoid shape */}
              <div className="flex-1 relative">
                <svg
                  viewBox="0 0 100 36"
                  className="w-full"
                  preserveAspectRatio="none"
                >
                  <polygon
                    points={
                      `${(100 - topWidth) / 2},0 ${(100 + topWidth) / 2},0 ${(100 + bottomWidth) / 2},36 ${(100 - bottomWidth) / 2},36`
                    }
                    fill={`url(#funnel-grad-${i})`}
                    stroke="rgba(245,158,11,0.15)"
                    strokeWidth="0.5"
                  />
                  <defs>
                    <linearGradient id={`funnel-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity={opacity} />
                      <stop offset="100%" stopColor="#F97316" stopOpacity={opacityBottom} />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Count centered on trapezoid */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[11px] font-semibold text-white/80">{step.count.toLocaleString()}</span>
                </div>
              </div>

              {/* Drop-off indicator */}
              <div className="w-16 text-left shrink-0">
                {dropOffPct !== null ? (
                  <div className="flex items-center gap-1">
                    <ArrowDown className="w-3 h-3 text-red-400/60" />
                    <span className="text-[10px] text-red-400/80 font-medium">{dropOffPct.toFixed(1)}%</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-white/20">—</span>
                )}
              </div>
            </div>
          </motion.div>
        )
      })}

      {/* Funnel summary */}
      <div className="mt-4 pt-4 border-t border-amber-500/[0.1] w-full flex items-center justify-center gap-8">
        <div className="text-center">
          <p className="text-[9px] text-white/25 uppercase tracking-wider">Overall Conversion</p>
          <p className="text-lg font-bold text-amber-400">{overallConversion}%</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-white/25 uppercase tracking-wider">Visit → Sign Up</p>
          <p className="text-lg font-bold text-orange-400">{((FUNNEL_STEPS[1].count / FUNNEL_STEPS[0].count) * 100).toFixed(1)}%</p>
        </div>
        <div className="text-center">
          <p className="text-[9px] text-white/25 uppercase tracking-wider">Biggest Drop</p>
          <p className="text-lg font-bold text-red-400">Upgrade → Sub</p>
        </div>
      </div>
    </div>
  )
}

// ─── Interactive SVG Multi-Line Chart ────────────────────────────

function AdoptionChart() {
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; key: string; value: number; month: string } | null>(null)

  const lines = [
    { key: 'taskCreation', color: '#F59E0B', label: 'Task Creation' },
    { key: 'taskCompletion', color: '#F97316', label: 'Task Completion' },
    { key: 'groceryList', color: '#D97706', label: 'Grocery List' },
    { key: 'chatMessages', color: '#B45309', label: 'Chat Messages' },
    { key: 'calendarEvents', color: '#92400E', label: 'Calendar Events' },
  ]

  const chartW = 700
  const chartH = 220
  const padL = 40
  const padR = 10
  const padT = 10
  const padB = 20
  const plotW = chartW - padL - padR
  const plotH = chartH - padT - padB

  function getX(i: number) { return padL + (i / (ADOPTION_OVER_TIME.length - 1)) * plotW }
  function getY(v: number) { return padT + ((100 - v) / 100) * plotH }

  return (
    <div className="relative">
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        {lines.map(l => (
          <div key={l.key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="text-[10px] text-white/40">{l.label}</span>
          </div>
        ))}
      </div>

      <div className="relative h-64 w-full">
        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            {lines.map(line => (
              <linearGradient key={line.key} id={`adopt-grad-${line.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={line.color} stopOpacity="0.15" />
                <stop offset="100%" stopColor={line.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(v => {
            const y = getY(v)
            return (
              <g key={v}>
                <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                <text x={padL - 6} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize="9">{v}%</text>
              </g>
            )
          })}

          {/* Month labels */}
          {ADOPTION_OVER_TIME.map((d, i) => {
            const x = getX(i)
            return (
              <text key={d.month} x={x} y={chartH - 2} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="9">{d.month}</text>
            )
          })}

          {/* Lines + areas + interactive dots */}
          {lines.map(line => {
            const points = ADOPTION_OVER_TIME.map((d, i) => ({
              x: getX(i),
              y: getY((d as Record<string, number>)[line.key]),
            }))

            const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
            const areaPath = `M ${points[0].x} ${getY(0)} ${points.map(p => `L ${p.x} ${p.y}`).join(' ')} L ${points[points.length - 1].x} ${getY(0)} Z`

            return (
              <g key={line.key}>
                <path d={areaPath} fill={`url(#adopt-grad-${line.key})`} />
                <path d={linePath} fill="none" stroke={line.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                {points.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r="4"
                    fill={line.color}
                    stroke="#111117"
                    strokeWidth="2"
                    className="cursor-pointer hover:r-6 transition-all"
                    onMouseEnter={() => setHoveredPoint({
                      x: p.x,
                      y: p.y,
                      key: line.label,
                      value: (ADOPTION_OVER_TIME[i] as Record<string, number>)[line.key],
                      month: ADOPTION_OVER_TIME[i].month,
                    })}
                    onMouseLeave={() => setHoveredPoint(null)}
                    style={{ filter: 'drop-shadow(0 0 3px ' + line.color + '60)' }}
                  />
                ))}
              </g>
            )
          })}
        </svg>

        {/* Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute pointer-events-none bg-amber-950/90 border border-amber-500/20 rounded-lg px-3 py-2 shadow-xl z-10 backdrop-blur-sm"
            style={{
              left: `${(hoveredPoint.x / chartW) * 100}%`,
              top: `${(hoveredPoint.y / chartH) * 100}%`,
              transform: 'translate(-50%, -120%)',
            }}
          >
            <p className="text-[10px] text-amber-300/60">{hoveredPoint.month}</p>
            <p className="text-xs font-semibold text-amber-300">{hoveredPoint.key}: {hoveredPoint.value}%</p>
          </div>
        )}
      </div>
    </div>
  )
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
      {/* ─── Page Title: Product Intelligence Lab ──────────────── */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/20">
            <FlaskConical className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              Product Intelligence Lab
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500/50 border border-amber-500/10 font-normal">
                Simulated
              </span>
            </h2>
            {/* Amber gradient underline */}
            <div className="h-[2px] w-32 rounded-full bg-gradient-to-r from-amber-500/80 via-orange-500/60 to-transparent mt-1" />
          </div>
        </div>
        <p className="text-sm text-white/40 mt-1">Track feature adoption, drop-offs, and conversion across the platform</p>
      </motion.div>

      {/* ─── Section 1: Horizontal Scrollable Stats Strip ──────── */}
      <motion.div variants={itemVariants}>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 custom-scrollbar">
          {TOP_STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="relative min-w-[220px] flex-shrink-0 bg-gradient-to-br from-amber-500/[0.05] to-amber-500/[0.10] border border-amber-500/[0.12] rounded-xl p-4 hover:border-amber-500/[0.25] transition-all overflow-hidden"
            >
              <MiniBarBg />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/15">
                    <stat.icon className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className={`text-[10px] font-medium flex items-center gap-0.5 ${stat.trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {stat.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {stat.trend}
                  </span>
                </div>
                <p className="text-2xl font-bold text-amber-50 tracking-tight">{stat.value}</p>
                <p className="text-xs text-amber-400/60 mt-1">{stat.label}</p>
                <p className="text-[10px] text-white/20 mt-0.5">{stat.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ─── Section 2: Card-Based Feature List ────────────────── */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-b from-amber-500/[0.02] to-transparent border border-amber-500/[0.08] rounded-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-amber-500/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">Feature Usage Breakdown</h3>
            <span className="text-[9px] text-amber-500/40 bg-amber-500/[0.06] px-1.5 py-0.5 rounded-full">
              {FEATURES.length} features
            </span>
          </div>
          <div className="flex items-center gap-3 text-[9px] text-white/30">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Strong</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Moderate</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Weak</span>
          </div>
        </div>

        <div className="p-4 space-y-2 max-h-[520px] overflow-y-auto custom-scrollbar">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.name} feature={f} index={i} />
          ))}
        </div>
      </motion.div>

      {/* ─── Section 3 & 4: Vertical Funnel + Upgrade Prompt CTR ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Vertical Funnel */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-3 bg-gradient-to-b from-amber-500/[0.02] to-transparent border border-amber-500/[0.08] rounded-xl p-5"
        >
          <h3 className="text-sm font-semibold text-white mb-2">Conversion Funnel</h3>
          <p className="text-[10px] text-amber-400/40 mb-2">Hover over each stage to see drop-off details</p>
          <VerticalFunnel />
        </motion.div>

        {/* Upgrade Prompt CTR */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 bg-gradient-to-b from-orange-500/[0.02] to-transparent border border-orange-500/[0.08] rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-white">Upgrade Prompt CTR</h3>
            <MousePointer className="w-4 h-4 text-orange-400/40" />
          </div>
          <div className="space-y-4">
            {UPGRADE_PROMPTS.map((prompt, i) => {
              const maxClicks = UPGRADE_PROMPTS[0].clicks
              const widthPct = (prompt.clicks / maxClicks) * 100
              const barColor = i === 0
                ? 'from-amber-500 to-orange-500'
                : i === 1
                  ? 'from-orange-500 to-amber-600'
                  : i === 2
                    ? 'from-amber-600 to-yellow-600'
                    : i === 3
                      ? 'from-yellow-600 to-amber-700'
                      : 'from-amber-700 to-yellow-700'

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
                      <span className="text-xs font-mono text-amber-400">{prompt.ctr}%</span>
                    </div>
                  </div>
                  <div className="h-6 bg-white/[0.03] rounded-lg overflow-hidden relative border border-amber-500/[0.06]">
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

          <div className="mt-5 pt-4 border-t border-amber-500/[0.08]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Total Clicks</span>
              <span className="text-sm font-bold text-white">
                {UPGRADE_PROMPTS.reduce((s, p) => s + p.clicks, 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Avg CTR</span>
              <span className="text-sm font-bold text-amber-400">
                {(UPGRADE_PROMPTS.reduce((s, p) => s + p.ctr, 0) / UPGRADE_PROMPTS.length).toFixed(1)}%
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ─── Section 5: Feature Adoption Over Time ────────────── */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-b from-amber-500/[0.02] to-transparent border border-amber-500/[0.08] rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-white">Feature Adoption Over Time</h3>
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/15">
            <TrendingUp className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-medium text-amber-400">+18% avg growth</span>
          </div>
        </div>
        <AdoptionChart />
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
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/10',
          },
          {
            title: 'Biggest Drop-off',
            value: 'Upgrade Prompts',
            detail: '22.5% drop-off rate',
            icon: TrendingDown,
            color: 'text-red-400',
            bg: 'bg-red-500/10',
            border: 'border-red-500/10',
          },
          {
            title: 'Stable Performer',
            value: 'Chat Messages',
            detail: 'Consistent 82% adoption',
            icon: Minus,
            color: 'text-orange-400',
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/10',
          },
        ].map((insight, i) => (
          <motion.div
            key={insight.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.06 }}
            className={`bg-gradient-to-br from-amber-500/[0.02] to-transparent border ${insight.border} rounded-xl p-4 hover:border-amber-500/[0.15] transition-colors`}
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
