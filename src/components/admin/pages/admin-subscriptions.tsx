'use client'

import { motion } from 'framer-motion'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  Clock,
  RefreshCw,
  Zap,
  Crown,
  Gift,
  UserCheck,
  ChevronRight,
  Landmark,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// ─── Demo Data ──────────────────────────────────────────────────────

const revenueChartData = [
  { month: 'Mar \'24', newSubs: 1820, churned: 320, mrr: 19400 },
  { month: 'Apr \'24', newSubs: 1960, churned: 305, mrr: 20220 },
  { month: 'May \'24', newSubs: 2100, churned: 290, mrr: 21150 },
  { month: 'Jun \'24', newSubs: 2180, churned: 275, mrr: 22080 },
  { month: 'Jul \'24', newSubs: 2240, churned: 260, mrr: 23120 },
  { month: 'Aug \'24', newSubs: 2320, churned: 248, mrr: 24200 },
  { month: 'Sep \'24', newSubs: 2380, churned: 235, mrr: 25280 },
  { month: 'Oct \'24', newSubs: 2450, churned: 220, mrr: 26420 },
  { month: 'Nov \'24', newSubs: 2510, churned: 210, mrr: 27550 },
  { month: 'Dec \'24', newSubs: 2580, churned: 195, mrr: 28760 },
  { month: 'Jan \'25', newSubs: 2650, churned: 185, mrr: 29980 },
  { month: 'Feb \'25', newSubs: 2720, churned: 172, mrr: 28940 },
]

const planDistribution = [
  {
    name: 'Free',
    users: 9612,
    percentage: 74.8,
    price: '$0',
    revenue: '$0',
    icon: Users,
    pillarColor: '#4B5563',
    pillarGlow: 'rgba(75,85,99,0.15)',
    pillarBg: 'from-gray-600/20 to-gray-700/10',
    accentColor: 'text-gray-400',
    lifetime: 412,
    trial: 238,
    height: 'h-24',
  },
  {
    name: 'Pro',
    users: 2158,
    percentage: 16.8,
    price: '$9.99/mo',
    revenue: '$21,558',
    icon: Zap,
    pillarColor: '#10B981',
    pillarGlow: 'rgba(16,185,129,0.25)',
    pillarBg: 'from-emerald-500/30 to-emerald-600/15',
    accentColor: 'text-emerald-400',
    lifetime: 89,
    trial: 156,
    height: 'h-44',
  },
  {
    name: 'Family+',
    users: 1077,
    percentage: 8.4,
    price: '$19.99/mo',
    revenue: '$7,382',
    icon: Crown,
    pillarColor: '#F59E0B',
    pillarGlow: 'rgba(245,158,11,0.25)',
    pillarBg: 'from-amber-500/30 to-amber-600/15',
    accentColor: 'text-amber-400',
    lifetime: 34,
    trial: 78,
    height: 'h-36',
  },
]

const conversionFunnel = [
  { from: 'Free', to: 'Pro', rate: 22.4, color: '#10B981' },
  { from: 'Pro', to: 'Family+', rate: 33.1, color: '#F59E0B' },
]

const monthlyBreakdown = [
  { month: 'Mar \'24', newSubs: 182, churned: 87, netNew: 95, revenue: '$19,400', churnRate: '5.1%' },
  { month: 'Apr \'24', newSubs: 196, churned: 82, netNew: 114, revenue: '$20,220', churnRate: '4.9%' },
  { month: 'May \'24', newSubs: 210, churned: 78, netNew: 132, revenue: '$21,150', churnRate: '4.7%' },
  { month: 'Jun \'24', newSubs: 218, churned: 74, netNew: 144, revenue: '$22,080', churnRate: '4.6%' },
  { month: 'Jul \'24', newSubs: 224, churned: 70, netNew: 154, revenue: '$23,120', churnRate: '4.4%' },
  { month: 'Aug \'24', newSubs: 232, churned: 67, netNew: 165, revenue: '$24,200', churnRate: '4.3%' },
  { month: 'Sep \'24', newSubs: 238, churned: 64, netNew: 174, revenue: '$25,280', churnRate: '4.2%' },
  { month: 'Oct \'24', newSubs: 245, churned: 60, netNew: 185, revenue: '$26,420', churnRate: '4.1%' },
  { month: 'Nov \'24', newSubs: 251, churned: 57, netNew: 194, revenue: '$27,550', churnRate: '4.0%' },
  { month: 'Dec \'24', newSubs: 258, churned: 53, netNew: 205, revenue: '$28,760', churnRate: '3.8%' },
  { month: 'Jan \'25', newSubs: 265, churned: 50, netNew: 215, revenue: '$29,980', churnRate: '3.6%' },
  { month: 'Feb \'25', newSubs: 272, churned: 47, netNew: 225, revenue: '$28,940', churnRate: '4.2%' },
]

const paymentHealth = [
  { label: 'Failed Payments', value: '23', sub: 'this month', icon: AlertTriangle, color: '#EF4444', bgGlow: 'rgba(239,68,68,0.1)' },
  { label: 'Refunds Processed', value: '7', sub: '($69.93)', icon: RotateCcw, color: '#F59E0B', bgGlow: 'rgba(245,158,11,0.1)' },
  { label: 'Avg Days to Churn', value: '47', sub: 'days', icon: Clock, color: '#10B981', bgGlow: 'rgba(16,185,129,0.1)' },
  { label: 'Retry Success Rate', value: '68%', sub: 'recovery', icon: RefreshCw, color: '#22C55E', bgGlow: 'rgba(34,197,94,0.1)' },
]

// Cohort data: 6 cohorts x 6 months retention percentages
const cohortData = [
  { cohort: 'Sep \'24', months: [100, 89, 78, 68, 61, 55] },
  { cohort: 'Oct \'24', months: [100, 91, 80, 70, 63, 0] },
  { cohort: 'Nov \'24', months: [100, 92, 82, 72, 0, 0] },
  { cohort: 'Dec \'24', months: [100, 93, 84, 0, 0, 0] },
  { cohort: 'Jan \'25', months: [100, 94, 0, 0, 0, 0] },
  { cohort: 'Feb \'25', months: [100, 0, 0, 0, 0, 0] },
]

// ─── Animation Variants ─────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

// ─── Custom Tooltip for AreaChart ────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload) return null
  return (
    <div className="bg-[#0D1F17] border border-emerald-500/20 rounded-lg px-4 py-3 shadow-xl shadow-emerald-500/5">
      <p className="text-xs text-emerald-300/60 mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-emerald-300/50 capitalize">
            {entry.dataKey === 'newSubs' ? 'New Subs' : 'Churned'}:
          </span>
          <span className="text-emerald-200 font-medium">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Cohort Heatmap Cell ────────────────────────────────────────────

function CohortCell({ value }: { value: number }) {
  if (value === 0) {
    return (
      <td className="p-0">
        <div className="w-full h-full flex items-center justify-center text-[11px] text-[#4B5563] bg-[#0B0B0F]">
          —
        </div>
      </td>
    )
  }

  // Emerald gradient scale: higher = more saturated emerald, lower = dimmer
  const intensity = value / 100
  const bgOpacity = Math.max(0.08, intensity * 0.55)
  const textColor = value >= 70 ? '#D1FAE5' : value >= 50 ? '#6EE7B7' : '#34D399'

  return (
    <td className="p-0">
      <div
        className="w-full h-full flex items-center justify-center text-[11px] font-medium transition-all duration-200"
        style={{
          background: `rgba(16, 185, 129, ${bgOpacity})`,
          color: textColor,
        }}
      >
        {value}%
      </div>
    </td>
  )
}

// ─── KPI Item for Ticker Bar ────────────────────────────────────────

function KpiTickerItem({ label, value, trend, trendLabel, icon: Icon, isLast }: {
  label: string; value: string; trend?: string; trendLabel?: string
  icon: React.ComponentType<{ className?: string }>; isLast?: boolean
}) {
  return (
    <div className="flex-1 flex items-center gap-3 px-4 py-3 min-w-0">
      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-emerald-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-emerald-400/50 font-medium uppercase tracking-widest">{label}</p>
        <p className="text-lg font-bold text-white leading-tight">{value}</p>
        {trend && (
          <div className="flex items-center gap-1 mt-0.5">
            {trend.startsWith('+') || trend.startsWith('↑') ? (
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3 h-3 text-emerald-400" />
            )}
            <span className="text-[10px] text-emerald-400 font-medium">{trend}</span>
            {trendLabel && <span className="text-[10px] text-white/25">{trendLabel}</span>}
          </div>
        )}
      </div>
      {!isLast && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-px bg-emerald-500/15" />
      )}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────

export function AdminSubscriptions() {
  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ─── Section Header: Revenue Vault ────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Landmark className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Revenue Vault</h2>
              <div className="h-[2px] w-full mt-1 rounded-full bg-gradient-to-r from-emerald-500 via-green-400 to-transparent" />
            </div>
          </div>
          <p className="text-sm text-white/40 mt-2 ml-[52px]">Monitor MRR, churn, plan distribution & payment health</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-[10px] text-emerald-500/40 uppercase tracking-widest font-medium bg-emerald-500/5 border border-emerald-500/10 rounded-full px-3 py-1">
            Simulated
          </span>
          <div className="flex items-center gap-2 text-xs text-white/30 bg-[#0D1F17] border border-emerald-500/10 rounded-lg px-3 py-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            Last 12 months
          </div>
        </div>
      </motion.div>

      {/* ─── 1. Revenue KPI Ticker Bar ──────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="bg-[#0D1F17] border border-emerald-500/15 rounded-xl relative overflow-hidden">
          {/* Ambient glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-green-500/5 pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row">
            <KpiTickerItem
              label="MRR"
              value="$28,940"
              trend="+22.4%"
              trendLabel="vs last month"
              icon={DollarSign}
            />
            <div className="hidden sm:block absolute left-[25%] top-1/2 -translate-y-1/2 h-8 w-px bg-emerald-500/15" />
            <KpiTickerItem
              label="ARR"
              value="$347,280"
              trend="+18.6%"
              trendLabel="vs last year"
              icon={TrendingUp}
            />
            <div className="hidden sm:block absolute left-[50%] top-1/2 -translate-y-1/2 h-8 w-px bg-emerald-500/15" />
            <KpiTickerItem
              label="Avg CLV"
              value="$127.40"
              trendLabel="Customer lifetime value"
              icon={CreditCard}
            />
            <div className="hidden sm:block absolute left-[75%] top-1/2 -translate-y-1/2 h-8 w-px bg-emerald-500/15" />
            <KpiTickerItem
              label="Churn Rate"
              value="4.2%"
              trend="-1.1%"
              trendLabel="improvement"
              icon={TrendingDown}
              isLast
            />
            {/* Mobile dividers */}
            <div className="sm:hidden flex flex-col divide-y divide-emerald-500/10">
              {/* Items render as column on mobile via flex-col above */}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── 2. Revenue Chart (Emerald Area) ─────────────────────────── */}
      <motion.div variants={itemVariants} className="bg-[#0D1F17] border border-emerald-500/15 rounded-xl p-4 md:p-6 relative overflow-hidden">
        {/* Glow effect behind chart */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-white">Revenue Trends</h3>
              <p className="text-xs text-emerald-400/40 mt-0.5">New subscriptions vs churned users over 12 months</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-white/40">New Subs</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-xs text-white/40">Churned</span>
              </div>
            </div>
          </div>
          <div className="h-72 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="emeraldNewSubsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.45} />
                    <stop offset="50%" stopColor="#22C55E" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="redChurnedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} />
                  </linearGradient>
                  {/* Glow filter */}
                  <filter id="emeraldGlow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,0.06)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: 'rgba(16,185,129,0.4)', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(16,185,129,0.1)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'rgba(16,185,129,0.4)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="newSubs"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fill="url(#emeraldNewSubsGradient)"
                  filter="url(#emeraldGlow)"
                />
                <Area
                  type="monotone"
                  dataKey="churned"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fill="url(#redChurnedGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* ─── 3. Plan Distribution: Vertical Pillar Cards ────────────── */}
      <motion.div variants={itemVariants}>
        <h3 className="text-base font-semibold text-white mb-4">Plan Distribution</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {planDistribution.map((plan) => {
            const Icon = plan.icon
            return (
              <div
                key={plan.name}
                className="bg-[#0D1F17] border border-emerald-500/10 rounded-xl p-5 relative overflow-hidden group"
                style={{
                  borderBottom: `2px solid ${plan.pillarColor}30`,
                }}
              >
                {/* Pillar glow effect */}
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-2/3 rounded-full blur-3xl opacity-40 group-hover:opacity-70 transition-opacity duration-500"
                  style={{ background: plan.pillarGlow }}
                />

                <div className="relative flex flex-col items-center text-center">
                  {/* Dollar Amount at Top */}
                  <p className={`text-3xl font-bold ${plan.accentColor} mb-1`}>
                    {plan.price}
                  </p>
                  <p className="text-xs text-white/30 mb-4">{plan.name} Plan</p>

                  {/* Vertical Pillar */}
                  <div className="relative w-16 flex flex-col items-center mb-4">
                    <div
                      className={`w-full rounded-t-lg bg-gradient-to-t ${plan.pillarBg} transition-all duration-500 group-hover:scale-105`}
                      style={{ minHeight: '80px' }}
                    >
                      <div className="flex flex-col items-center justify-center h-full py-3 gap-1">
                        <Icon className="w-5 h-5" style={{ color: plan.pillarColor }} />
                        <span className="text-xs font-bold text-white/80">{plan.users.toLocaleString()}</span>
                        <span className="text-[9px] text-white/30">users</span>
                      </div>
                    </div>
                    {/* Pillar base */}
                    <div className="w-20 h-2 rounded-b-md" style={{ background: `${plan.pillarColor}25` }} />
                    {/* Pillar cap */}
                    <div className="w-14 h-1.5 rounded-t-md -mb-0.5" style={{ background: `${plan.pillarColor}40` }} />
                  </div>

                  {/* Percentage */}
                  <p className="text-sm font-semibold text-white/60 mb-2">{plan.percentage}% of total</p>

                  {/* Percentage Bar */}
                  <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden mb-3">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: plan.pillarColor }}
                      initial={{ width: 0 }}
                      animate={{ width: `${plan.percentage}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    />
                  </div>

                  {/* Revenue contribution */}
                  {plan.revenue !== '$0' && (
                    <div className="flex items-center justify-between w-full text-xs mb-2">
                      <span className="text-white/30">Revenue</span>
                      <span className="text-emerald-400 font-medium">{plan.revenue}</span>
                    </div>
                  )}

                  {/* Sub-metrics */}
                  <div className="flex items-center gap-3 pt-3 border-t border-white/[0.04] w-full">
                    <div className="flex items-center gap-1.5">
                      <Gift className="w-3 h-3 text-white/20" />
                      <span className="text-[11px] text-white/30">{plan.lifetime} lifetime</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3 h-3 text-white/20" />
                      <span className="text-[11px] text-white/30">{plan.trial} trial</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* ─── 4. Conversion Funnel ──────────────────────────────────── */}
      <motion.div variants={itemVariants} className="bg-[#0D1F17] border border-emerald-500/15 rounded-xl p-5">
        <h3 className="text-base font-semibold text-white mb-5">Conversion Funnel</h3>
        <div className="flex items-center justify-center gap-3 md:gap-6 overflow-x-auto pb-2">
          {/* Free Plan */}
          <div className="flex flex-col items-center min-w-[100px]">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gray-500/10 border border-gray-500/20 flex items-center justify-center mb-2">
              <Users className="w-7 h-7 md:w-8 md:h-8 text-gray-400" />
            </div>
            <span className="text-sm font-semibold text-white">Free</span>
            <span className="text-xs text-white/30">9,612 users</span>
          </div>

          {/* Arrow: Free → Pro */}
          <div className="flex flex-col items-center gap-1 min-w-[80px] md:min-w-[120px]">
            <div className="flex items-center gap-1">
              <div className="h-[2px] w-8 md:w-16 bg-gradient-to-r from-gray-500/30 to-emerald-500/30" />
              <ChevronRight className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-xs font-semibold text-emerald-400">{conversionFunnel[0].rate}%</span>
            </div>
            <span className="text-[10px] text-white/20">convert</span>
          </div>

          {/* Pro Plan */}
          <div className="flex flex-col items-center min-w-[100px]">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-2">
              <Zap className="w-7 h-7 md:w-8 md:h-8 text-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-white">Pro</span>
            <span className="text-xs text-white/30">2,158 users</span>
          </div>

          {/* Arrow: Pro → Family+ */}
          <div className="flex flex-col items-center gap-1 min-w-[80px] md:min-w-[120px]">
            <div className="flex items-center gap-1">
              <div className="h-[2px] w-8 md:w-16 bg-gradient-to-r from-emerald-500/30 to-amber-500/30" />
              <ChevronRight className="w-4 h-4 text-amber-400" />
            </div>
            <div className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <span className="text-xs font-semibold text-amber-400">{conversionFunnel[1].rate}%</span>
            </div>
            <span className="text-[10px] text-white/20">upgrade</span>
          </div>

          {/* Family+ Plan */}
          <div className="flex flex-col items-center min-w-[100px]">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-2">
              <Crown className="w-7 h-7 md:w-8 md:h-8 text-amber-400" />
            </div>
            <span className="text-sm font-semibold text-white">Family+</span>
            <span className="text-xs text-white/30">1,077 users</span>
          </div>
        </div>
      </motion.div>

      {/* ─── 5. Monthly Revenue Breakdown Table ───────────────────── */}
      <motion.div variants={itemVariants} className="bg-[#0D1F17] border border-emerald-500/15 rounded-xl overflow-hidden">
        <div className="p-5 pb-0">
          <h3 className="text-base font-semibold text-white mb-1">Monthly Revenue Breakdown</h3>
          <p className="text-xs text-emerald-400/40">Detailed view of subscription metrics over the past 12 months</p>
        </div>
        <div className="overflow-x-auto custom-scrollbar mt-4">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-emerald-500/10">
                <th className="text-left text-[11px] font-medium text-emerald-400/50 uppercase tracking-wider px-5 py-3">Month</th>
                <th className="text-right text-[11px] font-medium text-emerald-400/50 uppercase tracking-wider px-5 py-3">New Subs</th>
                <th className="text-right text-[11px] font-medium text-red-400/50 uppercase tracking-wider px-5 py-3">Churned</th>
                <th className="text-right text-[11px] font-medium text-emerald-400/50 uppercase tracking-wider px-5 py-3">Net New</th>
                <th className="text-right text-[11px] font-medium text-emerald-400/50 uppercase tracking-wider px-5 py-3">Revenue</th>
                <th className="text-right text-[11px] font-medium text-emerald-400/50 uppercase tracking-wider px-5 py-3">Churn Rate</th>
              </tr>
            </thead>
            <tbody>
              {monthlyBreakdown.map((row, i) => (
                <motion.tr
                  key={row.month}
                  className="border-b border-emerald-500/5 hover:bg-emerald-500/5 transition-colors"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <td className="px-5 py-3 text-sm text-white/80 font-medium">{row.month}</td>
                  <td className="px-5 py-3 text-sm text-emerald-400 text-right font-medium">${row.newSubs}</td>
                  <td className="px-5 py-3 text-sm text-red-400 text-right">${row.churned}</td>
                  <td className="px-5 py-3 text-sm text-white/80 text-right font-medium">
                    <span className="inline-flex items-center gap-1">
                      <ArrowRight className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">+{row.netNew}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-emerald-300 text-right font-semibold">{row.revenue}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-sm">
                      <span className={parseFloat(row.churnRate) <= 4.0 ? 'text-emerald-400' : 'text-amber-400'}>
                        {row.churnRate}
                      </span>
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ─── 6. Payment Health ────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <h3 className="text-base font-semibold text-white mb-4">Payment Health</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {paymentHealth.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className="bg-[#0D1F17] border border-emerald-500/10 rounded-xl p-4 relative overflow-hidden group hover:border-emerald-500/20 transition-colors"
              >
                <div
                  className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl -translate-y-6 translate-x-6 opacity-40 group-hover:opacity-70 transition-opacity duration-300"
                  style={{ background: item.bgGlow }}
                />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: `${item.color}15` }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                    </div>
                    <span className="text-[11px] text-white/40 font-medium uppercase tracking-wider leading-tight">{item.label}</span>
                  </div>
                  <p className="text-xl font-bold text-white">{item.value}</p>
                  <p className="text-xs text-white/20 mt-0.5">{item.sub}</p>
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* ─── 7. Cohort Analysis Heatmap (Emerald Scale) ──────────── */}
      <motion.div variants={itemVariants} className="bg-[#0D1F17] border border-emerald-500/15 rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-white">Cohort Retention Analysis</h3>
            <p className="text-xs text-emerald-400/40 mt-0.5">Monthly user retention by signup cohort</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/20">Low</span>
            <div className="flex items-center gap-0.5">
              {[8, 20, 35, 50, 65, 80].map((opacity) => (
                <div
                  key={opacity}
                  className="w-5 h-3 rounded-sm"
                  style={{ background: `rgba(16, 185, 129, ${opacity / 100})` }}
                />
              ))}
            </div>
            <span className="text-[10px] text-white/20">High</span>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[420px]">
            <thead>
              <tr>
                <th className="text-left text-[11px] font-medium text-emerald-400/50 uppercase tracking-wider px-3 py-2">Cohort</th>
                {[...Array(6)].map((_, i) => (
                  <th key={i} className="text-center text-[11px] font-medium text-emerald-400/50 uppercase tracking-wider px-3 py-2">
                    M{i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohortData.map((row) => (
                <tr key={row.cohort}>
                  <td className="px-3 py-0 text-xs text-white/70 font-medium whitespace-nowrap h-10">
                    {row.cohort}
                  </td>
                  {row.months.map((val, j) => (
                    <CohortCell key={j} value={val} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cohort Summary */}
        <div className="mt-4 pt-4 border-t border-emerald-500/10 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-400">~90%</p>
            <p className="text-[11px] text-white/20">Month 1 Retention</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber-400">~75%</p>
            <p className="text-[11px] text-white/20">Month 3 Retention</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-red-400">~60%</p>
            <p className="text-[11px] text-white/20">Month 6 Retention</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
