'use client'

import { motion } from 'framer-motion'
import {
  Ticket, Clock, Star, Gauge,
  TrendingDown, AlertTriangle, MessageSquare,
  ShoppingCart, CheckCircle2, Users, ArrowUpRight, ArrowDownRight,
  Phone, Mail, Share2
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts'

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

// ─── Mock data ─────────────────────────────────────────────

// Ticket trend last 30 days
const ticketTrendData = Array.from({ length: 30 }, (_, i) => {
  const d = new Date()
  d.setDate(d.getDate() - 29 + i)
  const label = `${d.getMonth() + 1}/${d.getDate()}`
  const opened = Math.floor(Math.random() * 6) + 3
  const resolved = Math.floor(Math.random() * 5) + 2
  return { date: label, opened, resolved }
})

// Common issues
const commonIssues = [
  { issue: 'Cannot join family', count: 34 },
  { issue: 'Invite code not working', count: 28 },
  { issue: 'App crashes on upload', count: 22 },
  { issue: 'Subscription not activating', count: 19 },
  { issue: 'Language switch stuck', count: 15 },
  { issue: 'Calendar sync issues', count: 12 },
  { issue: 'Notification not received', count: 11 },
  { issue: 'Dark mode not applying', count: 8 },
]

// Feature requests
const featureRequests = [
  { feature: 'Arabic voice messages', votes: 342, status: 'In Progress' as const, priority: 'High' as const },
  { feature: 'Hajj/Umrah features', votes: 289, status: 'Planned' as const, priority: 'High' as const },
  { feature: 'Family budgeting', votes: 234, status: 'Under Review' as const, priority: 'Medium' as const },
  { feature: 'Ramadan meal planner', votes: 198, status: 'Planned' as const, priority: 'Medium' as const },
  { feature: 'Photo albums', votes: 167, status: 'Under Review' as const, priority: 'Low' as const },
  { feature: 'Household chores', votes: 145, status: 'Planned' as const, priority: 'Medium' as const },
  { feature: 'Prayer time alerts', votes: 123, status: 'Shipped' as const, priority: 'High' as const },
  { feature: 'Expense splitting', votes: 98, status: 'Under Review' as const, priority: 'Low' as const },
]

// Pain points
const painPoints = [
  { title: 'Onboarding Drop-off', value: '28%', description: 'at family creation step', icon: AlertTriangle },
  { title: 'Task Abandonment', value: '15%', description: 'create but never complete', icon: CheckCircle2 },
  { title: 'Grocery List Confusion', value: '12%', description: 'create but never check items', icon: ShoppingCart },
  { title: 'Chat Low Engagement', value: '34%', description: 'never send a message', icon: MessageSquare },
]

// Support agents
const topAgents = [
  { name: 'Sara Al-Rashid', tickets: 47, avatar: 'SR' },
  { name: 'Ahmed Hassan', tickets: 39, avatar: 'AH' },
  { name: 'Layla Noor', tickets: 34, avatar: 'LN' },
]

// Resolution channels
const resolutionChannels = [
  { channel: 'In-App', percentage: 62, color: '#10B981' },
  { channel: 'Email', percentage: 28, color: '#6366F1' },
  { channel: 'Social', percentage: 10, color: '#F59E0B' },
]

// ─── Status badge helper ───────────────────────────────────
type Status = 'Under Review' | 'Planned' | 'In Progress' | 'Shipped'
type Priority = 'High' | 'Medium' | 'Low'

function getStatusColor(status: Status) {
  switch (status) {
    case 'Under Review': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'Planned': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    case 'In Progress': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'Shipped': return 'bg-violet-500/10 text-violet-400 border-violet-500/20'
  }
}

function getPriorityColor(priority: Priority) {
  switch (priority) {
    case 'High': return 'bg-red-500/10 text-red-400 border-red-500/20'
    case 'Medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'Low': return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  }
}

// ─── NPS Gauge Component ───────────────────────────────────
function NPSGauge({ score }: { score: number }) {
  const maxScore = 100
  const percentage = score / maxScore
  const angle = percentage * 180
  const radius = 60
  const cx = 70
  const cy = 70

  // Arc path helper
  const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(cx, cy, r, endAngle)
    const end = polarToCartesian(cx, cy, r, startAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
  }

  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const angleRad = ((angleDeg - 180) * Math.PI) / 180
    return {
      x: cx + r * Math.cos(angleRad),
      y: cy + r * Math.sin(angleRad),
    }
  }

  // Color zones: 0-30 red, 30-50 orange, 50-70 yellow, 70-100 emerald
  const getColor = (s: number) => {
    if (s >= 70) return '#10B981'
    if (s >= 50) return '#EAB308'
    if (s >= 30) return '#F97316'
    return '#EF4444'
  }

  const needleAngle = -180 + (percentage * 180)
  const needleEnd = polarToCartesian(cx, cy, radius - 15, needleAngle + 180)
  const needleBase1 = polarToCartesian(cx, cy, 4, needleAngle + 180 + 90)
  const needleBase2 = polarToCartesian(cx, cy, 4, needleAngle + 180 - 90)

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="80" viewBox="0 0 140 80">
        {/* Background arc - red zone (0-30) */}
        <path d={describeArc(cx, cy, radius, 0, 54)} fill="none" stroke="#EF4444" strokeWidth="8" strokeLinecap="round" opacity="0.3" />
        {/* Orange zone (30-50) */}
        <path d={describeArc(cx, cy, radius, 54, 90)} fill="none" stroke="#F97316" strokeWidth="8" strokeLinecap="round" opacity="0.3" />
        {/* Yellow zone (50-70) */}
        <path d={describeArc(cx, cy, radius, 90, 126)} fill="none" stroke="#EAB308" strokeWidth="8" strokeLinecap="round" opacity="0.3" />
        {/* Green zone (70-100) */}
        <path d={describeArc(cx, cy, radius, 126, 180)} fill="none" stroke="#10B981" strokeWidth="8" strokeLinecap="round" opacity="0.3" />

        {/* Filled arc up to score */}
        <path d={describeArc(cx, cy, radius, 0, angle)} fill="none" stroke={getColor(score)} strokeWidth="8" strokeLinecap="round" />

        {/* Needle */}
        <polygon
          points={`${needleEnd.x},${needleEnd.y} ${needleBase1.x},${needleBase1.y} ${needleBase2.x},${needleBase2.y}`}
          fill="#E5E7EB"
        />
        {/* Center circle */}
        <circle cx={cx} cy={cy} r="6" fill="#1A1A24" stroke="#E5E7EB" strokeWidth="2" />

        {/* Labels */}
        <text x="8" y={cy + 14} fill="white" fontSize="8" opacity="0.4">0</text>
        <text x={cx - 4} y="8" fill="white" fontSize="8" opacity="0.4">50</text>
        <text x="124" y={cy + 14} fill="white" fontSize="8" opacity="0.4">100</text>
      </svg>
      <div className="text-center -mt-1">
        <span className="text-2xl font-bold" style={{ color: getColor(score) }}>{score}</span>
        <span className="text-xs text-white/40 ml-1">/100</span>
      </div>
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
              className={`w-4 h-4 ${filled ? 'text-yellow-400 fill-yellow-400' : 'text-white/10'}`}
            />
            {partial && (
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${(score - Math.floor(score)) * 100}%` }}>
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
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
    <div className="bg-[#1A1A24] border border-white/[0.08] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs font-medium" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────
export function AdminSupport() {
  const maxVotes = Math.max(...featureRequests.map(r => r.votes))

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ── Section Header ──────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Support &amp; Product Improvement Center</h2>
          <p className="text-sm text-white/40 mt-1">Monitor tickets, analyze pain points, and track feature requests</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">Live</span>
          </div>
        </div>
      </motion.div>

      {/* ── 1. Support KPIs ─────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Tickets */}
        <div className="bg-[#111117] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Ticket className="w-4.5 h-4.5 text-indigo-400" />
            </div>
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <ArrowUpRight className="w-3 h-3" />
              +8 this week
            </span>
          </div>
          <p className="text-2xl font-bold text-white">23</p>
          <p className="text-xs text-white/40 mt-1">Open Tickets</p>
        </div>

        {/* Avg Resolution Time */}
        <div className="bg-[#111117] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Clock className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <ArrowDownRight className="w-3 h-3" />
              ↓0.8h
            </span>
          </div>
          <p className="text-2xl font-bold text-white">4.2<span className="text-sm font-normal text-white/40 ml-1">hours</span></p>
          <p className="text-xs text-white/40 mt-1">Avg Resolution Time</p>
        </div>

        {/* Satisfaction Score */}
        <div className="bg-[#111117] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Star className="w-4.5 h-4.5 text-yellow-400" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-bold text-white">4.6<span className="text-sm font-normal text-white/40">/5.0</span></p>
            <StarRating score={4.6} />
          </div>
          <p className="text-xs text-white/40 mt-1">Satisfaction Score</p>
        </div>

        {/* NPS Score */}
        <div className="bg-[#111117] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Gauge className="w-4.5 h-4.5 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-white/40 mb-1">NPS Score</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium border border-emerald-500/20">
                Excellent
              </span>
            </div>
            <NPSGauge score={72} />
          </div>
        </div>
      </motion.div>

      {/* ── 2. Ticket Trend ─────────────────────────────── */}
      <motion.div variants={itemVariants} className="bg-[#111117] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Ticket Trend</h3>
            <p className="text-xs text-white/40 mt-0.5">Opened vs Resolved — Last 30 days</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span className="text-xs text-white/50">Opened</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-white/50">Resolved</span>
            </div>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={ticketTrendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="openedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="opened"
                stroke="#6366F1"
                strokeWidth={2}
                fill="url(#openedGradient)"
                name="Opened"
              />
              <Area
                type="monotone"
                dataKey="resolved"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#resolvedGradient)"
                name="Resolved"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── 3. Common Issues ────────────────────────────── */}
      <motion.div variants={itemVariants} className="bg-[#111117] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Common Issues</h3>
            <p className="text-xs text-white/40 mt-0.5">Top 8 reported issues by frequency</p>
          </div>
          <TrendingDown className="w-4 h-4 text-white/30" />
        </div>
        <div className="space-y-3">
          {commonIssues.map((item, idx) => {
            const maxCount = Math.max(...commonIssues.map(i => i.count))
            const widthPercent = (item.count / maxCount) * 100
            const hue = idx < 2 ? 'bg-red-500' : idx < 4 ? 'bg-amber-500' : idx < 6 ? 'bg-indigo-500' : 'bg-gray-500'
            return (
              <div key={item.issue} className="group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/70 group-hover:text-white/90 transition-colors">{item.issue}</span>
                  <span className="text-xs font-mono text-white/50">{item.count}</span>
                </div>
                <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercent}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    className={`h-full rounded-full ${hue} opacity-80`}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* ── 4. Feature Requests ─────────────────────────── */}
      <motion.div variants={itemVariants} className="bg-[#111117] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Feature Requests</h3>
            <p className="text-xs text-white/40 mt-0.5">User-voted feature pipeline</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="pb-3 text-xs font-medium text-white/40 uppercase tracking-wider">Feature</th>
                <th className="pb-3 text-xs font-medium text-white/40 uppercase tracking-wider">Votes</th>
                <th className="pb-3 text-xs font-medium text-white/40 uppercase tracking-wider">Status</th>
                <th className="pb-3 text-xs font-medium text-white/40 uppercase tracking-wider">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {featureRequests.map((req) => (
                <tr key={req.feature} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 pr-4">
                    <span className="text-sm text-white/80 group-hover:text-white transition-colors">{req.feature}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500/60"
                          style={{ width: `${(req.votes / maxVotes) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-white/50">{req.votes}</span>
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
      </motion.div>

      {/* ── 5. User Pain Points ─────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white">User Pain Points</h3>
          <p className="text-xs text-white/40 mt-0.5">Key drop-off and engagement issues</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {painPoints.map((point, idx) => {
            const Icon = point.icon
            return (
              <motion.div
                key={point.title}
                variants={itemVariants}
                className="bg-[#111117] border border-amber-500/10 rounded-xl p-5 relative overflow-hidden"
              >
                {/* Amber accent line */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/60 via-amber-400/40 to-transparent" />

                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5 text-amber-400" />
                  </div>
                  <span className="text-xl font-bold text-amber-400">{point.value}</span>
                </div>
                <p className="text-sm font-medium text-white/80">{point.title}</p>
                <p className="text-xs text-white/40 mt-1">{point.description}</p>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* ── 6. Support Resolution Metrics ───────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* First Response Time */}
        <div className="bg-[#111117] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">First Response Time</h3>
              <p className="text-xs text-white/40">Average time to first reply</p>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-white">12</span>
            <span className="text-sm text-white/40">min avg</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <ArrowDownRight className="w-3 h-3 text-emerald-400" />
            <span className="text-xs text-emerald-400">2 min faster than last week</span>
          </div>
        </div>

        {/* Resolution by Channel */}
        <div className="bg-[#111117] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <Share2 className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Resolution by Channel</h3>
              <p className="text-xs text-white/40">Distribution of support channels</p>
            </div>
          </div>
          <div className="space-y-3">
            {resolutionChannels.map((ch) => (
              <div key={ch.channel}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {ch.channel === 'In-App' && <Phone className="w-3 h-3 text-white/40" />}
                    {ch.channel === 'Email' && <Mail className="w-3 h-3 text-white/40" />}
                    {ch.channel === 'Social' && <Share2 className="w-3 h-3 text-white/40" />}
                    <span className="text-xs text-white/60">{ch.channel}</span>
                  </div>
                  <span className="text-xs font-mono text-white/50">{ch.percentage}%</span>
                </div>
                <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${ch.percentage}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: ch.color, opacity: 0.8 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Support Agents */}
        <div className="bg-[#111117] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Top Support Agents</h3>
              <p className="text-xs text-white/40">By tickets resolved this month</p>
            </div>
          </div>
          <div className="space-y-3">
            {topAgents.map((agent, idx) => (
              <div key={agent.name} className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs font-bold text-white/20 w-4">
                  {idx + 1}
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-medium text-white">
                  {agent.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 truncate">{agent.name}</p>
                  <p className="text-xs text-white/40">{agent.tickets} tickets</p>
                </div>
                <div className="flex items-center gap-1">
                  {idx === 0 && <span className="text-yellow-400 text-xs">★</span>}
                  <div className="w-16 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-500/70"
                      style={{ width: `${(agent.tickets / topAgents[0].tickets) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
