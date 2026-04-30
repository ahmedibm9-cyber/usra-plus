'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Ticket, Clock, Star, Gauge,
  TrendingDown, AlertTriangle, MessageSquare,
  ShoppingCart, CheckCircle2, Users, ArrowUpRight, ArrowDownRight,
  Phone, Mail, Share2, Radar, Headphones,
  Inbox, Lightbulb, BarChart3, UsersRound,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts'

// ─── Types ──────────────────────────────────────────────────
interface TicketTrendPoint {
  date: string
  opened: number
  resolved: number
}

interface CommonIssue {
  issue: string
  count: number
}

type FeatureRequestStatus = 'Under Review' | 'Planned' | 'In Progress' | 'Shipped'
type FeatureRequestPriority = 'High' | 'Medium' | 'Low'

interface FeatureRequest {
  feature: string
  votes: number
  status: FeatureRequestStatus
  priority: FeatureRequestPriority
}

type PainPointIconType = 'alert' | 'check' | 'cart' | 'chat'

interface PainPoint {
  title: string
  value: string
  description: string
  iconType: PainPointIconType
}

interface TopAgent {
  name: string
  tickets: number
  avatar: string
}

interface ResolutionChannel {
  channel: string
  percentage: number
  color: string
}

interface SupportKPIs {
  openTickets: number
  avgResolutionHours: number
  satisfactionScore: number
  npsScore: number
  firstResponseMinutes: number
  weeklyDelta: {
    openTickets: number
    resolutionHours: number
    firstResponseMinutes: number
  }
}

interface SupportData {
  kpis: SupportKPIs
  ticketTrend: TicketTrendPoint[]
  commonIssues: CommonIssue[]
  featureRequests: FeatureRequest[]
  painPoints: PainPoint[]
  topAgents: TopAgent[]
  resolutionChannels: ResolutionChannel[]
}

// ─── Animation variants ────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}

// ─── Status badge helper ───────────────────────────────────
function getStatusColor(status: FeatureRequestStatus) {
  switch (status) {
    case 'Under Review': return 'bg-sky-500/10 text-sky-400 border-sky-500/20'
    case 'Planned': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    case 'In Progress': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'Shipped': return 'bg-violet-500/10 text-violet-400 border-violet-500/20'
  }
}

function getPriorityColor(priority: FeatureRequestPriority) {
  switch (priority) {
    case 'High': return 'bg-red-500/10 text-red-400 border-red-500/20'
    case 'Medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'Low': return 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  }
}

// ─── Pain point icon mapping ───────────────────────────────
function getPainPointIcon(iconType: PainPointIconType) {
  switch (iconType) {
    case 'alert': return AlertTriangle
    case 'check': return CheckCircle2
    case 'cart': return ShoppingCart
    case 'chat': return MessageSquare
  }
}

// ─── Semicircular Gauge Component ───────────────────────────
function SemicircularGauge({ value, max, label, color, unit = '' }: { value: number; max: number; label: string; color: string; unit?: string }) {
  const percentage = Math.min(value / max, 1)
  const angle = percentage * 180
  const radius = 52
  const cx = 64
  const cy = 64
  const strokeWidth = 10

  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const angleRad = ((angleDeg - 180) * Math.PI) / 180
    return {
      x: cx + r * Math.cos(angleRad),
      y: cy + r * Math.sin(angleRad),
    }
  }

  const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(cx, cy, r, endAngle)
    const end = polarToCartesian(cx, cy, r, startAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
  }

  return (
    <div className="flex flex-col items-center">
      <svg width="128" height="74" viewBox="0 0 128 74">
        {/* Background arc */}
        <path
          d={describeArc(cx, cy, radius, 0, 180)}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        {value > 0 && (
          <path
            d={describeArc(cx, cy, radius, 0, angle)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={0.85}
          />
        )}
        {/* Glow effect */}
        {value > 0 && (
          <path
            d={describeArc(cx, cy, radius, 0, angle)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth + 6}
            strokeLinecap="round"
            opacity={0.1}
            filter="blur(4px)"
          />
        )}
        {/* Center text */}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">
          {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9">
          {unit}
        </text>
      </svg>
      <span className="text-[10px] text-white/40 mt-1">{label}</span>
    </div>
  )
}

// ─── Star Rating ───────────────────────────────────────────
function StarRating({ score, max = 5 }: { score: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.floor(score)
        const partial = !filled && i < score
        return (
          <div key={i} className="relative">
            <Star
              className={`w-4 h-4 ${filled ? 'text-sky-400 fill-sky-400' : 'text-white/10'}`}
            />
            {partial && (
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${(score - Math.floor(score)) * 100}%` }}>
                <Star className="w-4 h-4 text-sky-400 fill-sky-400" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Custom Tooltip ────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null
  return (
    <div className="bg-[#0A0A14] border border-sky-500/20 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-sky-400/50 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs font-medium" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

// ─── Radar Sweep Animation ─────────────────────────────────
function RadarSweep() {
  return (
    <div className="relative w-8 h-8">
      <svg viewBox="0 0 32 32" className="w-full h-full">
        {/* Radar circles */}
        <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(14,165,233,0.15)" strokeWidth="0.5" />
        <circle cx="16" cy="16" r="9" fill="none" stroke="rgba(14,165,233,0.1)" strokeWidth="0.5" />
        <circle cx="16" cy="16" r="4" fill="none" stroke="rgba(14,165,233,0.08)" strokeWidth="0.5" />
        {/* Sweep line */}
        <line x1="16" y1="16" x2="16" y2="2" stroke="#0EA5E9" strokeWidth="1" opacity="0.6">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 16 16"
            to="360 16 16"
            dur="3s"
            repeatCount="indefinite"
          />
        </line>
        {/* Center dot */}
        <circle cx="16" cy="16" r="1.5" fill="#0EA5E9" opacity="0.8">
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  )
}

// ─── Donut Chart ────────────────────────────────────────────
function DonutChart({ data }: { data: ResolutionChannel[] }) {
  const total = data.reduce((sum, d) => sum + d.percentage, 0)

  if (total === 0) {
    return (
      <div className="relative flex items-center justify-center">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx={80} cy={80} r={60} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={20} />
          <text x={80} y={76} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="20" fontWeight="bold">—</text>
          <text x={80} y={92} textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="9">no data</text>
        </svg>
      </div>
    )
  }

  // Precompute cumulative offsets
  const cumulativeOffsets: number[] = []
  let runningTotal = 0
  for (const d of data) {
    runningTotal += d.percentage
    cumulativeOffsets.push(runningTotal)
  }
  const cx = 80
  const cy = 80
  const radius = 60
  const strokeWidth = 20

  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180
    return {
      x: cx + r * Math.cos(angleRad),
      y: cy + r * Math.sin(angleRad),
    }
  }

  const describeArc = (startPct: number, endPct: number) => {
    const startAngle = startPct * 360
    const endAngle = endPct * 360
    const start = polarToCartesian(cx, cy, radius, endAngle)
    const end = polarToCartesian(cx, cy, radius, startAngle)
    const largeArcFlag = endAngle - startAngle > 180 ? '1' : '0'
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
  }

  return (
    <div className="relative flex items-center justify-center">
      <svg width="160" height="160" viewBox="0 0 160 160">
        {/* Background circle */}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
        {/* Data arcs */}
        {data.map((item, i) => {
          const startPct = (i > 0 ? cumulativeOffsets[i - 1] : 0) / total
          const endPct = cumulativeOffsets[i] / total
          const gap = 0.01
          return (
            <path
              key={item.channel}
              d={describeArc(startPct + gap, endPct - gap)}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              opacity={0.8}
            />
          )
        })}
        {/* Center text */}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="20" fontWeight="bold">
          {total}%
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9">
          resolved
        </text>
      </svg>
    </div>
  )
}

// ─── Ranking Medal ──────────────────────────────────────────
function RankingMedal({ rank }: { rank: number }) {
  const medals = ['🥇', '🥈', '🥉']
  return <span className="text-base">{medals[rank] || `#${rank + 1}`}</span>
}

// ─── Empty State Component ─────────────────────────────────
function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-sky-500/5 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-sky-400/20" />
      </div>
      <p className="text-sm text-white/30 font-medium">{title}</p>
      <p className="text-xs text-white/15 mt-1 max-w-[240px]">{description}</p>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────
export function AdminSupport() {
  const [data, setData] = useState<SupportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSupportData() {
      try {
        const res = await fetch('/api/admin/support?section=all')
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data) {
            setData(json.data as SupportData)
          }
        }
      } catch (err) {
        console.error('[AdminSupport] Failed to fetch data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSupportData()
  }, [])

  // Derive computed values safely
  const kpis = data?.kpis ?? { openTickets: 0, avgResolutionHours: 0, satisfactionScore: 0, npsScore: 0, firstResponseMinutes: 0, weeklyDelta: { openTickets: 0, resolutionHours: 0, firstResponseMinutes: 0 } }
  const ticketTrend = data?.ticketTrend ?? []
  const commonIssues = data?.commonIssues ?? []
  const featureRequests = data?.featureRequests ?? []
  const painPoints = data?.painPoints ?? []
  const topAgents = data?.topAgents ?? []
  const resolutionChannels = data?.resolutionChannels ?? []

  const maxVotes = featureRequests.length > 0 ? Math.max(...featureRequests.map(r => r.votes)) : 1
  const maxIssueCount = commonIssues.length > 0 ? Math.max(...commonIssues.map(i => i.count)) : 1

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-[#0A0A14] border border-sky-500/10 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <RadarSweep />
            <div>
              <h2 className="text-xl font-bold text-white">Help Desk Radar</h2>
              <p className="text-sm text-sky-400/50 mt-0.5">Loading support data...</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-[#0A0A14] border border-sky-500/10 rounded-xl p-5 h-40 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 mb-4" />
              <div className="h-4 bg-sky-500/5 rounded w-2/3 mb-2" />
              <div className="h-8 bg-sky-500/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ── Help Desk Radar Header ───────────────────────────── */}
      <motion.div variants={itemVariants} className="bg-[#0A0A14] border border-sky-500/10 rounded-xl p-5 relative overflow-hidden">
        {/* Subtle radar background effect */}
        <div className="absolute -right-12 -top-12 w-48 h-48 opacity-[0.04] pointer-events-none">
          <svg viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="#0EA5E9" strokeWidth="1" />
            <circle cx="100" cy="100" r="60" fill="none" stroke="#0EA5E9" strokeWidth="0.5" />
            <circle cx="100" cy="100" r="30" fill="none" stroke="#0EA5E9" strokeWidth="0.5" />
          </svg>
        </div>

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <RadarSweep />
            <div>
              <h2 className="text-xl font-bold text-white">Help Desk Radar</h2>
              <p className="text-sm text-sky-400/50 mt-0.5">Monitor tickets, analyze pain points, and track feature requests</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              <span className="text-xs text-sky-400 font-medium">Live</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── 1. Support KPIs — Circular Gauges ───────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Tickets — Blue gauge */}
        <motion.div variants={itemVariants} className="bg-[#0A0A14] border border-sky-500/10 rounded-xl p-5 flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Ticket className="w-4 h-4 text-blue-400" />
            </div>
            {kpis.weeklyDelta.openTickets !== 0 && (
              <span className={`flex items-center gap-1 text-[10px] ${kpis.weeklyDelta.openTickets > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {kpis.weeklyDelta.openTickets > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {kpis.weeklyDelta.openTickets > 0 ? '+' : ''}{kpis.weeklyDelta.openTickets} this week
              </span>
            )}
          </div>
          <SemicircularGauge value={kpis.openTickets} max={50} label="Open Tickets" color="#3B82F6" />
        </motion.div>

        {/* Resolution Time — Green gauge */}
        <motion.div variants={itemVariants} className="bg-[#0A0A14] border border-sky-500/10 rounded-xl p-5 flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            {kpis.weeklyDelta.resolutionHours !== 0 && (
              <span className={`flex items-center gap-1 text-[10px] ${kpis.weeklyDelta.resolutionHours < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                <ArrowDownRight className="w-3 h-3" />
                {kpis.weeklyDelta.resolutionHours > 0 ? '+' : ''}{kpis.weeklyDelta.resolutionHours.toFixed(1)}h
              </span>
            )}
          </div>
          <SemicircularGauge value={kpis.avgResolutionHours} max={10} label="Avg Resolution (hours)" color="#10B981" unit="hours" />
        </motion.div>

        {/* Satisfaction — Amber gauge */}
        <motion.div variants={itemVariants} className="bg-[#0A0A14] border border-sky-500/10 rounded-xl p-5 flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Star className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <SemicircularGauge value={kpis.satisfactionScore} max={5} label="Satisfaction Score" color="#F59E0B" unit="/5.0" />
          {kpis.satisfactionScore > 0 && (
            <div className="mt-2">
              <StarRating score={kpis.satisfactionScore} />
            </div>
          )}
        </motion.div>

        {/* NPS — Sky blue gauge */}
        <motion.div variants={itemVariants} className="bg-[#0A0A14] border border-sky-500/10 rounded-xl p-5 flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <Gauge className="w-4 h-4 text-sky-400" />
            </div>
            {kpis.npsScore > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium border ${
                kpis.npsScore >= 70 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                kpis.npsScore >= 50 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {kpis.npsScore >= 70 ? 'Excellent' : kpis.npsScore >= 50 ? 'Good' : 'Needs Work'}
              </span>
            )}
          </div>
          <SemicircularGauge value={kpis.npsScore} max={100} label="NPS Score" color="#0EA5E9" />
        </motion.div>
      </div>

      {/* ── 2. Ticket Trend — Sky Blue AreaChart ─────────────── */}
      <motion.div variants={itemVariants} className="bg-[#0A0A14] border border-sky-500/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Ticket Trend</h3>
            <p className="text-xs text-sky-400/40 mt-0.5">Opened vs Resolved — Last 30 days</p>
          </div>
          {ticketTrend.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                <span className="text-xs text-white/50">Opened</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs text-white/50">Resolved</span>
              </div>
            </div>
          )}
        </div>
        {ticketTrend.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ticketTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="skyOpenedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="skyResolvedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.04)' }}
                  tickLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="opened"
                  stroke="#0EA5E9"
                  strokeWidth={2}
                  fill="url(#skyOpenedGradient)"
                  name="Opened"
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#skyResolvedGradient)"
                  name="Resolved"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState icon={BarChart3} title="No ticket trend data yet" description="Ticket trends will appear here once support tickets are created and tracked over time." />
        )}
      </motion.div>

      {/* ── 3. Common Issues — Horizontal Bar Chart ──────────── */}
      <motion.div variants={itemVariants} className="bg-[#0A0A14] border border-sky-500/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Common Issues</h3>
            <p className="text-xs text-sky-400/40 mt-0.5">Top reported issues by frequency</p>
          </div>
          <TrendingDown className="w-4 h-4 text-sky-400/30" />
        </div>
        {commonIssues.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={commonIssues} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="issue" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
                <Tooltip content={<CustomTooltip />} />
                <defs>
                  <linearGradient id="skyBarGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <Bar dataKey="count" name="Reports" fill="url(#skyBarGradient)" radius={[0, 6, 6, 0]} maxBarSize={18} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState icon={Inbox} title="No support issues yet" description="Common issues will be displayed here once tickets are categorized and tracked." />
        )}
      </motion.div>

      {/* ── 4. Feature Requests ─────────────────────────────── */}
      <motion.div variants={itemVariants} className="bg-[#0A0A14] border border-sky-500/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Feature Requests</h3>
            <p className="text-xs text-sky-400/40 mt-0.5">User-voted feature pipeline</p>
          </div>
          <Headphones className="w-4 h-4 text-sky-400/30" />
        </div>
        {featureRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-sky-500/10">
                  <th className="pb-3 text-xs font-medium text-sky-400/40 uppercase tracking-wider">Feature</th>
                  <th className="pb-3 text-xs font-medium text-sky-400/40 uppercase tracking-wider">Votes</th>
                  <th className="pb-3 text-xs font-medium text-sky-400/40 uppercase tracking-wider">Status</th>
                  <th className="pb-3 text-xs font-medium text-sky-400/40 uppercase tracking-wider">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-500/[0.05]">
                {featureRequests.map((req) => (
                  <tr key={req.feature} className="group hover:bg-sky-500/[0.02] transition-colors">
                    <td className="py-3 pr-4">
                      <span className="text-sm text-white/80 group-hover:text-white transition-colors">{req.feature}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-sky-500/60"
                            style={{ width: `${(req.votes / maxVotes) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-sky-400/60">{req.votes}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getPriorityColor(req.priority)}`}>
                        {req.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Lightbulb} title="No feature requests yet" description="Feature requests from users will appear here once they start voting and submitting ideas." />
        )}
      </motion.div>

      {/* ── 5. User Pain Points — Sky Blue Accents ───────────── */}
      <motion.div variants={itemVariants}>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white">User Pain Points</h3>
          <p className="text-xs text-sky-400/40 mt-0.5">Key drop-off and engagement issues</p>
        </div>
        {painPoints.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {painPoints.map((point) => {
              const Icon = getPainPointIcon(point.iconType)
              return (
                <motion.div
                  key={point.title}
                  variants={itemVariants}
                  className="bg-[#0A0A14] border border-sky-500/10 rounded-xl p-5 relative overflow-hidden"
                >
                  {/* Sky blue accent line */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-500/60 via-blue-400/40 to-transparent" />

                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center">
                      <Icon className="w-4.5 h-4.5 text-sky-400" />
                    </div>
                    <span className="text-xl font-bold text-sky-400">{point.value}</span>
                  </div>
                  <p className="text-sm font-medium text-white/80">{point.title}</p>
                  <p className="text-xs text-sky-400/40 mt-1">{point.description}</p>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="bg-[#0A0A14] border border-sky-500/10 rounded-xl p-5">
            <EmptyState icon={AlertTriangle} title="No pain points identified yet" description="User drop-off and engagement issues will be displayed here once analytics data is collected." />
          </div>
        )}
      </motion.div>

      {/* ── 6. Support Resolution Metrics ───────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* First Response Time */}
        <div className="bg-[#0A0A14] border border-sky-500/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">First Response Time</h3>
              <p className="text-xs text-sky-400/40">Average time to first reply</p>
            </div>
          </div>
          {kpis.firstResponseMinutes > 0 ? (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-white">{kpis.firstResponseMinutes}</span>
                <span className="text-sm text-sky-400/50">min avg</span>
              </div>
              {kpis.weeklyDelta.firstResponseMinutes !== 0 && (
                <div className="mt-3 flex items-center gap-1.5">
                  <ArrowDownRight className={`w-3 h-3 ${kpis.weeklyDelta.firstResponseMinutes < 0 ? 'text-emerald-400' : 'text-red-400'}`} />
                  <span className={`text-xs ${kpis.weeklyDelta.firstResponseMinutes < 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {Math.abs(kpis.weeklyDelta.firstResponseMinutes)} min {kpis.weeklyDelta.firstResponseMinutes < 0 ? 'faster' : 'slower'} than last week
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white/15">—</span>
              <span className="text-sm text-sky-400/20">min avg</span>
            </div>
          )}
        </div>

        {/* Resolution by Channel — Donut Chart */}
        <div className="bg-[#0A0A14] border border-sky-500/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Resolution by Channel</h3>
              <p className="text-xs text-sky-400/40">Distribution of support channels</p>
            </div>
          </div>
          {resolutionChannels.length > 0 ? (
            <div className="flex items-center gap-4">
              <DonutChart data={resolutionChannels} />
              <div className="space-y-2.5 flex-1">
                {resolutionChannels.map((ch) => (
                  <div key={ch.channel} className="flex items-center gap-2">
                    {ch.channel === 'In-App' && <Phone className="w-3 h-3 text-sky-400" />}
                    {ch.channel === 'Email' && <Mail className="w-3 h-3 text-blue-400" />}
                    {ch.channel === 'Social' && <Share2 className="w-3 h-3 text-sky-300" />}
                    {!['In-App', 'Email', 'Social'].includes(ch.channel) && <MessageSquare className="w-3 h-3 text-sky-400" />}
                    <span className="text-xs text-white/60 flex-1">{ch.channel}</span>
                    <span className="text-xs font-mono" style={{ color: ch.color }}>{ch.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState icon={Share2} title="No channel data yet" description="Resolution channel distribution will appear once tickets are tracked by source." />
          )}
        </div>

        {/* Top Support Agents — with ranking medals */}
        <div className="bg-[#0A0A14] border border-sky-500/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Top Support Agents</h3>
              <p className="text-xs text-sky-400/40">By tickets resolved this month</p>
            </div>
          </div>
          {topAgents.length > 0 ? (
            <div className="space-y-3">
              {topAgents.map((agent, idx) => (
                <div key={agent.name} className="flex items-center gap-3">
                  <RankingMedal rank={idx} />
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-[10px] font-medium text-white">
                      {agent.avatar}
                    </div>
                    {/* Sky blue ring */}
                    <div className="absolute -inset-[2px] rounded-full border-2 border-sky-400/30" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 truncate">{agent.name}</p>
                    <p className="text-xs text-sky-400/40">{agent.tickets} tickets</p>
                  </div>
                  <div className="w-16 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sky-500/60"
                      style={{ width: `${(agent.tickets / topAgents[0].tickets) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={UsersRound} title="No agent data yet" description="Top support agents will be ranked here once tickets are assigned and resolved." />
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
