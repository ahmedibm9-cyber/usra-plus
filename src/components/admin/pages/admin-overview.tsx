'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from 'recharts'
import {
  Users, Activity, Home, DollarSign, TrendingUp, TrendingDown,
  Server, Database, HardDrive, AlertTriangle, Shield, Zap,
  UserPlus, CreditCard, Globe, Clock, ArrowUpRight, ArrowDownRight,
  Wifi, CheckCircle2
} from 'lucide-react'

// ─── Animated Counter Hook ───────────────────────────────────────────────────
function useAnimatedCounter(target: number, duration = 1200, startOnMount = true) {
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

// ─── Animation Variants ──────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
}

// ─── Custom Tooltip for Charts ───────────────────────────────────────────────
function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1A1A24] border border-white/[0.08] rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs text-white/40 mb-1">{label} 2025</p>
      <p className="text-lg font-bold text-white">${payload[0].value.toLocaleString()}</p>
      <p className="text-xs text-indigo-400">MRR</p>
    </div>
  )
}

function UserGrowthTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1A1A24] border border-white/[0.08] rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs text-white/40 mb-1">{label} 2025</p>
      <p className="text-lg font-bold text-white">{payload[0].value.toLocaleString()}</p>
      <p className="text-xs text-indigo-400">Registrations</p>
    </div>
  )
}

// ─── KPI Card Component ──────────────────────────────────────────────────────
function KPICard({
  title, value, prefix, suffix, trend, trendLabel, icon: Icon, delay = 0
}: {
  title: string
  value: number
  prefix?: string
  suffix?: string
  trend: number
  trendLabel: string
  icon: React.ElementType
  delay?: number
}) {
  const animatedValue = useAnimatedCounter(value)
  const isPositive = trend > 0

  return (
    <motion.div
      variants={itemVariants}
      className="group relative bg-[#111117] border border-white/[0.06] rounded-2xl p-5 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-indigo-500/30"
    >
      {/* Gradient accent on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.06))' }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Icon className="w-5 h-5 text-indigo-400" />
          </div>
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
            isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        </div>

        <div className="mb-1">
          <span className="text-3xl font-bold text-white tracking-tight">
            {prefix}{animatedValue.toLocaleString()}{suffix}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-white/40">{title}</p>
          <p className="text-xs text-white/25">{trendLabel}</p>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Metric Card for Key Metrics Grid ────────────────────────────────────────
function MetricCard({ label, value, sublabel, icon: Icon }: {
  label: string; value: string; sublabel?: string; icon: React.ElementType
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="bg-[#111117] border border-white/[0.06] rounded-xl p-4 backdrop-blur-sm hover:border-indigo-500/20 transition-all duration-300 group"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
          <Icon className="w-4 h-4 text-indigo-400" />
        </div>
        <p className="text-xs text-white/40 font-medium">{label}</p>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      {sublabel && <p className="text-xs text-white/25 mt-1">{sublabel}</p>}
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function AdminOverview() {
  // Plan distribution total for percentages
  const planTotal = planData.reduce((s, d) => s + d.value, 0)

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ─── Section 1: KPI Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Users"
          value={12847}
          trend={18.3}
          trendLabel="vs last month"
          icon={Users}
          delay={0}
        />
        <KPICard
          title="Monthly Active Users"
          value={8429}
          trend={12.1}
          trendLabel="vs last month"
          icon={Activity}
          delay={0.05}
        />
        <KPICard
          title="Total Families"
          value={3256}
          trend={15.7}
          trendLabel="vs last month"
          icon={Home}
          delay={0.1}
        />
        <KPICard
          title="MRR Revenue"
          value={28940}
          prefix="$"
          trend={22.4}
          trendLabel="vs last month"
          icon={DollarSign}
          delay={0.15}
        />
      </div>

      {/* ─── Section 2: Revenue Chart ──────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="bg-[#111117] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Monthly Recurring Revenue</h3>
            <p className="text-sm text-white/30 mt-0.5">Last 12 months performance</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-sm font-semibold text-indigo-400">$347,280 ARR</span>
            </div>
          </div>
        </div>

        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} />
                  <stop offset="80%" stopColor="#6366F1" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.3)' }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.3)' }}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                dx={-4}
              />
              <Tooltip content={<RevenueTooltip />} cursor={{ stroke: 'rgba(99,102,241,0.3)', strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="mrr"
                stroke="#6366F1"
                strokeWidth={2.5}
                fill="url(#mrrGradient)"
                dot={false}
                activeDot={{ r: 5, fill: '#6366F1', stroke: '#111117', strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ─── Section 3: Two-Column Middle ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: User Growth Bar Chart */}
        <motion.div
          variants={itemVariants}
          className="bg-[#111117] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-sm"
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
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }}
                  dy={6}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.3)' }}
                  dx={-4}
                />
                <Tooltip content={<UserGrowthTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar
                  dataKey="registrations"
                  fill="#6366F1"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Right: Plan Distribution */}
        <motion.div
          variants={itemVariants}
          className="bg-[#111117] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-sm"
        >
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Plan Distribution</h3>
            <p className="text-sm text-white/30 mt-0.5">Users by subscription tier</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Donut Chart */}
            <div className="relative w-[180px] h-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  >
                    {planData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-white">{planTotal.toLocaleString()}</span>
                <span className="text-xs text-white/30">Total</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-4 w-full">
              {planData.map((plan) => (
                <div key={plan.name} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: plan.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white/70">{plan.name}</span>
                      <span className="text-sm font-semibold text-white">{plan.value.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(plan.value / planTotal) * 100}%` }}
                        transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: plan.color }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ─── Section 4: Three-Column Bottom ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left: Regional Distribution */}
        <motion.div
          variants={itemVariants}
          className="bg-[#111117] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-sm"
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
                <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
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
          className="bg-[#111117] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-sm"
        >
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-white">Platform Health</h3>
            <p className="text-sm text-white/30 mt-0.5">System vitals</p>
          </div>

          <div className="space-y-5">
            {platformHealth.map((metric) => {
              const IconComp = metric.icon
              const displayValue = metric.label === 'Error Rate' ? `${metric.value}%` : `${metric.value}%`
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
                      {displayValue}
                    </span>
                  </div>
                  <div className="w-full h-6 bg-white/[0.04] rounded-lg overflow-hidden relative">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: '100%' }}
                      transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="rounded-lg"
                      style={{
                        width: `${barPercent}%`,
                        backgroundColor: metric.color,
                        opacity: 0.25,
                      }}
                    />
                    {/* Vertical fill bar */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barPercent}%` }}
                      transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute top-0 left-0 h-full rounded-lg"
                      style={{ backgroundColor: metric.color, opacity: 0.6 }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Right: Activity Feed */}
        <motion.div
          variants={itemVariants}
          className="bg-[#111117] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold text-white">Activity Feed</h3>
              <p className="text-sm text-white/30 mt-0.5">Recent platform events</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <div className="space-y-1 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
            {activityFeed.map((item) => {
              const IconComp = item.icon
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: item.id * 0.06, duration: 0.3 }}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/[0.02] transition-colors group"
                >
                  <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform`}>
                    <IconComp className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/60 leading-snug">{item.text}</p>
                    <p className="text-xs text-white/20 mt-1">{item.time}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* ─── Section 5: Key Metrics Grid ───────────────────────────────── */}
      <div>
        <motion.div variants={itemVariants} className="mb-4">
          <h3 className="text-lg font-semibold text-white">Key Metrics</h3>
          <p className="text-sm text-white/30">Core performance indicators</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard
            label="DAU/MAU"
            value="34.2%"
            sublabel="Stickiness ratio"
            icon={Activity}
          />
          <MetricCard
            label="Churn Rate"
            value="3.8%"
            sublabel="Monthly"
            icon={TrendingDown}
          />
          <MetricCard
            label="Upgrade Rate"
            value="12.4%"
            sublabel="Free → Paid"
            icon={TrendingUp}
          />
          <MetricCard
            label="Avg Session"
            value="8m 42s"
            sublabel="Per visit"
            icon={Clock}
          />
          <MetricCard
            label="EN / AR"
            value="58 / 42%"
            sublabel="Language split"
            icon={Globe}
          />
          <MetricCard
            label="Mobile / Desktop"
            value="72 / 28%"
            sublabel="Device split"
            icon={Wifi}
          />
        </div>
      </div>
    </motion.div>
  )
}
