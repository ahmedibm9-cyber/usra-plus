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
    color: '#6B7280',
    bgGlow: 'rgba(107,114,128,0.1)',
    lifetime: 412,
    trial: 238,
  },
  {
    name: 'Pro',
    users: 2158,
    percentage: 16.8,
    price: '$9.99/mo',
    revenue: '$21,558',
    icon: Zap,
    color: '#10B981',
    bgGlow: 'rgba(16,185,129,0.1)',
    lifetime: 89,
    trial: 156,
  },
  {
    name: 'Family+',
    users: 1077,
    percentage: 8.4,
    price: '$19.99/mo',
    revenue: '$7,382',
    icon: Crown,
    color: '#F59E0B',
    bgGlow: 'rgba(245,158,11,0.1)',
    lifetime: 34,
    trial: 78,
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
  { label: 'Avg Days to Churn', value: '47', sub: 'days', icon: Clock, color: '#6366F1', bgGlow: 'rgba(99,102,241,0.1)' },
  { label: 'Retry Success Rate', value: '68%', sub: 'recovery', icon: RefreshCw, color: '#10B981', bgGlow: 'rgba(16,185,129,0.1)' },
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
    <div className="bg-[#1A1A22] border border-white/[0.08] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-[#9CA3AF] mb-1.5">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="text-[#9CA3AF] capitalize">
            {entry.dataKey === 'newSubs' ? 'New Subs' : 'Churned'}:
          </span>
          <span className="text-[#E5E7EB] font-medium">{entry.value.toLocaleString()}</span>
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

  // Emerald gradient: higher = more saturated emerald, lower = dimmer
  const intensity = value / 100
  const bgOpacity = Math.max(0.08, intensity * 0.55)
  const textColor = value >= 70 ? '#D1FAE5' : value >= 50 ? '#A7F3D0' : '#6EE7B7'

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

// ─── Main Component ─────────────────────────────────────────────────

export function AdminSubscriptions() {
  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ─── Section Header ──────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#E5E7EB]">Subscriptions & Revenue</h2>
          <p className="text-sm text-[#9CA3AF] mt-1">Monitor MRR, churn, plan distribution, and payment health</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-[#9CA3AF] bg-[#111117] border border-white/[0.06] rounded-lg px-3 py-1.5">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          Last 12 months
        </div>
      </motion.div>

      {/* ─── 1. Revenue KPIs ─────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <div className="bg-[#111117] border border-white/[0.06] rounded-xl p-4 relative overflow-hidden group card-hover">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-emerald-500/5 blur-2xl -translate-y-8 translate-x-8 group-hover:bg-emerald-500/10 transition-colors duration-300" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#9CA3AF] font-medium uppercase tracking-wider">MRR</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#E5E7EB]">$28,940</p>
            <div className="flex items-center gap-1 mt-1.5">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">22.4%</span>
              <span className="text-xs text-[#6B7280]">vs last month</span>
            </div>
          </div>
        </div>

        {/* ARR */}
        <div className="bg-[#111117] border border-white/[0.06] rounded-xl p-4 relative overflow-hidden group card-hover">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-emerald-500/5 blur-2xl -translate-y-8 translate-x-8 group-hover:bg-emerald-500/10 transition-colors duration-300" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#9CA3AF] font-medium uppercase tracking-wider">ARR</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#E5E7EB]">$347,280</p>
            <div className="flex items-center gap-1 mt-1.5">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">18.6%</span>
              <span className="text-xs text-[#6B7280]">vs last year</span>
            </div>
          </div>
        </div>

        {/* Avg CLV */}
        <div className="bg-[#111117] border border-white/[0.06] rounded-xl p-4 relative overflow-hidden group card-hover">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-indigo-500/5 blur-2xl -translate-y-8 translate-x-8 group-hover:bg-indigo-500/10 transition-colors duration-300" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#9CA3AF] font-medium uppercase tracking-wider">Avg CLV</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#E5E7EB]">$127.40</p>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-xs text-[#6B7280]">Customer lifetime value</span>
            </div>
          </div>
        </div>

        {/* Churn Rate */}
        <div className="bg-[#111117] border border-white/[0.06] rounded-xl p-4 relative overflow-hidden group card-hover">
          <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-red-500/5 blur-2xl -translate-y-8 translate-x-8 group-hover:bg-red-500/10 transition-colors duration-300" />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#9CA3AF] font-medium uppercase tracking-wider">Churn Rate</span>
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#E5E7EB]">4.2%</p>
            <div className="flex items-center gap-1 mt-1.5">
              <TrendingDown className="w-3 h-3 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">1.1%</span>
              <span className="text-xs text-[#6B7280]">improvement</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── 2. Revenue Chart ────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="bg-[#111117] border border-white/[0.06] rounded-xl p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-[#E5E7EB]">Revenue Trends</h3>
            <p className="text-xs text-[#9CA3AF] mt-0.5">New subscriptions vs churned users over 12 months</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-[#9CA3AF]">New Subs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-xs text-[#9CA3AF]">Churned</span>
            </div>
          </div>
        </div>
        <div className="h-72 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="newSubsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="churnedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: '#6B7280', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6B7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="newSubs"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#newSubsGradient)"
              />
              <Area
                type="monotone"
                dataKey="churned"
                stroke="#EF4444"
                strokeWidth={2}
                fill="url(#churnedGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ─── 3. Plan Distribution ────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <h3 className="text-base font-semibold text-[#E5E7EB] mb-4">Plan Distribution</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {planDistribution.map((plan) => {
            const Icon = plan.icon
            return (
              <div
                key={plan.name}
                className="bg-[#111117] border border-white/[0.06] rounded-xl p-5 relative overflow-hidden group card-hover"
              >
                {/* Glow effect */}
                <div
                  className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-10 translate-x-10 group-hover:opacity-100 opacity-60 transition-opacity duration-500"
                  style={{ background: plan.bgGlow }}
                />

                <div className="relative">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: `${plan.color}15` }}
                      >
                        <Icon className="w-4.5 h-4.5" style={{ color: plan.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#E5E7EB]">{plan.name}</p>
                        <p className="text-xs text-[#9CA3AF]">{plan.price}</p>
                      </div>
                    </div>
                  </div>

                  {/* Count */}
                  <p className="text-2xl font-bold text-[#E5E7EB] mb-1">
                    {plan.users.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#9CA3AF] mb-4">
                    {plan.percentage}% of total users
                  </p>

                  {/* Percentage Bar */}
                  <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden mb-4">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: plan.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${plan.percentage}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    />
                  </div>

                  {/* Revenue contribution */}
                  {plan.revenue !== '$0' && (
                    <div className="flex items-center justify-between text-xs mb-3">
                      <span className="text-[#9CA3AF]">Revenue</span>
                      <span className="text-emerald-400 font-medium">{plan.revenue}</span>
                    </div>
                  )}

                  {/* Sub-metrics */}
                  <div className="flex items-center gap-3 pt-3 border-t border-white/[0.04]">
                    <div className="flex items-center gap-1.5">
                      <Gift className="w-3 h-3 text-[#6B7280]" />
                      <span className="text-[11px] text-[#9CA3AF]">{plan.lifetime} lifetime</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3 h-3 text-[#6B7280]" />
                      <span className="text-[11px] text-[#9CA3AF]">{plan.trial} trial</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* ─── 4. Conversion Funnel ────────────────────────────────── */}
      <motion.div variants={itemVariants} className="bg-[#111117] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-base font-semibold text-[#E5E7EB] mb-5">Conversion Funnel</h3>
        <div className="flex items-center justify-center gap-3 md:gap-6 overflow-x-auto pb-2">
          {/* Free Plan */}
          <div className="flex flex-col items-center min-w-[100px]">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gray-500/10 border border-gray-500/20 flex items-center justify-center mb-2">
              <Users className="w-7 h-7 md:w-8 md:h-8 text-gray-400" />
            </div>
            <span className="text-sm font-semibold text-[#E5E7EB]">Free</span>
            <span className="text-xs text-[#9CA3AF]">9,612 users</span>
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
            <span className="text-[10px] text-[#6B7280]">convert</span>
          </div>

          {/* Pro Plan */}
          <div className="flex flex-col items-center min-w-[100px]">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-2">
              <Zap className="w-7 h-7 md:w-8 md:h-8 text-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-[#E5E7EB]">Pro</span>
            <span className="text-xs text-[#9CA3AF]">2,158 users</span>
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
            <span className="text-[10px] text-[#6B7280]">upgrade</span>
          </div>

          {/* Family+ Plan */}
          <div className="flex flex-col items-center min-w-[100px]">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-2">
              <Crown className="w-7 h-7 md:w-8 md:h-8 text-amber-400" />
            </div>
            <span className="text-sm font-semibold text-[#E5E7EB]">Family+</span>
            <span className="text-xs text-[#9CA3AF]">1,077 users</span>
          </div>
        </div>
      </motion.div>

      {/* ─── 5. Monthly Revenue Breakdown Table ───────────────────── */}
      <motion.div variants={itemVariants} className="bg-[#111117] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="p-5 pb-0">
          <h3 className="text-base font-semibold text-[#E5E7EB] mb-1">Monthly Revenue Breakdown</h3>
          <p className="text-xs text-[#9CA3AF]">Detailed view of subscription metrics over the past 12 months</p>
        </div>
        <div className="overflow-x-auto custom-scrollbar mt-4">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="text-left text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider px-5 py-3">Month</th>
                <th className="text-right text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider px-5 py-3">New Subs</th>
                <th className="text-right text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider px-5 py-3">Churned</th>
                <th className="text-right text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider px-5 py-3">Net New</th>
                <th className="text-right text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider px-5 py-3">Revenue</th>
                <th className="text-right text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider px-5 py-3">Churn Rate</th>
              </tr>
            </thead>
            <tbody>
              {monthlyBreakdown.map((row, i) => (
                <motion.tr
                  key={row.month}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <td className="px-5 py-3 text-sm text-[#E5E7EB] font-medium">{row.month}</td>
                  <td className="px-5 py-3 text-sm text-emerald-400 text-right">{row.newSubs}</td>
                  <td className="px-5 py-3 text-sm text-red-400 text-right">{row.churned}</td>
                  <td className="px-5 py-3 text-sm text-[#E5E7EB] text-right font-medium">
                    <span className="inline-flex items-center gap-1">
                      <ArrowRight className="w-3 h-3 text-emerald-400" />
                      +{row.netNew}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-emerald-400 text-right font-medium">{row.revenue}</td>
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
        <h3 className="text-base font-semibold text-[#E5E7EB] mb-4">Payment Health</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {paymentHealth.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className="bg-[#111117] border border-white/[0.06] rounded-xl p-4 relative overflow-hidden group card-hover"
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
                    <span className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-wider leading-tight">{item.label}</span>
                  </div>
                  <p className="text-xl font-bold text-[#E5E7EB]">{item.value}</p>
                  <p className="text-xs text-[#6B7280] mt-0.5">{item.sub}</p>
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* ─── 7. Cohort Analysis Heatmap ───────────────────────────── */}
      <motion.div variants={itemVariants} className="bg-[#111117] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-[#E5E7EB]">Cohort Retention Analysis</h3>
            <p className="text-xs text-[#9CA3AF] mt-0.5">Monthly user retention by signup cohort</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#6B7280]">Low</span>
            <div className="flex items-center gap-0.5">
              {[8, 20, 35, 50, 65, 80].map((opacity) => (
                <div
                  key={opacity}
                  className="w-5 h-3 rounded-sm"
                  style={{ background: `rgba(16, 185, 129, ${opacity / 100})` }}
                />
              ))}
            </div>
            <span className="text-[10px] text-[#6B7280]">High</span>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[420px]">
            <thead>
              <tr>
                <th className="text-left text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider px-3 py-2">Cohort</th>
                {[...Array(6)].map((_, i) => (
                  <th key={i} className="text-center text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider px-3 py-2">
                    M{i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohortData.map((row) => (
                <tr key={row.cohort}>
                  <td className="px-3 py-0 text-xs text-[#E5E7EB] font-medium whitespace-nowrap h-10">
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
        <div className="mt-4 pt-4 border-t border-white/[0.04] grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-400">~90%</p>
            <p className="text-[11px] text-[#6B7280]">Month 1 Retention</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber-400">~75%</p>
            <p className="text-[11px] text-[#6B7280]">Month 3 Retention</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-red-400">~60%</p>
            <p className="text-[11px] text-[#6B7280]">Month 6 Retention</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
