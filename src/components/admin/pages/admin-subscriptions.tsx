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
  Eye,
  BarChart3,
  Wallet,
  Receipt,
  PiggyBank,
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
import { useSubscriptionData } from '@/hooks/use-admin-data'

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

// ─── Empty State Block ──────────────────────────────────────────────
function EmptyBlock({ title, subtitle, icon: Icon, className = '' }: {
  title: string
  subtitle: string
  icon: React.ElementType
  className?: string
}) {
  return (
    <motion.div variants={itemVariants} className={`bg-[#0D1F17] border border-emerald-500/10 rounded-xl p-6 flex flex-col items-center justify-center min-h-[180px] ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-emerald-500/15" />
      </div>
      <p className="text-sm font-medium text-white/30 mb-1">{title}</p>
      <p className="text-xs text-white/15 text-center max-w-[200px]">{subtitle}</p>
    </motion.div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────

export function AdminSubscriptions() {
  const { data: subData, isLoading, source } = useSubscriptionData()

  const hasData = !!subData?.metrics
  const metrics = subData?.metrics
  const planDistribution = subData?.planDistribution ?? []
  const revenueTimeSeries = subData?.revenueTimeSeries ?? []
  const monthlyBreakdown = subData?.monthlyBreakdown ?? []
  const conversionFunnel = subData?.conversionFunnel ?? []
  const cohortData = subData?.cohortData ?? []
  const cohortSummary = subData?.cohortSummary

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
          {/* Only show "Simulated" badge when there IS simulated data */}
          {source === 'demo' && hasData && (
            <span className="text-[10px] text-emerald-500/40 uppercase tracking-widest font-medium bg-emerald-500/5 border border-emerald-500/10 rounded-full px-3 py-1">
              Simulated
            </span>
          )}
          {source === 'live' && (
            <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-medium bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
              Live
            </span>
          )}
        </div>
      </motion.div>

      {/* ─── 1. Revenue KPI Ticker Bar (data-driven) ────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="bg-[#0D1F17] border border-emerald-500/15 rounded-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-green-500/5 pointer-events-none" />
          <div className="relative grid grid-cols-2 sm:grid-cols-4">
            {/* MRR */}
            <div className="flex items-center gap-3 px-4 py-3 min-w-0 border-b sm:border-b-0 sm:border-r border-emerald-500/10">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-emerald-400/50 font-medium uppercase tracking-widest">MRR</p>
                <p className={`text-lg font-bold leading-tight ${metrics?.mrr ? 'text-white' : 'text-white/15'}`}>
                  {metrics?.mrr ? `$${metrics.mrr.toLocaleString()}` : '—'}
                </p>
              </div>
            </div>
            {/* ARR */}
            <div className="flex items-center gap-3 px-4 py-3 min-w-0 border-b sm:border-b-0 sm:border-r border-emerald-500/10">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-emerald-400/50 font-medium uppercase tracking-widest">ARR</p>
                <p className={`text-lg font-bold leading-tight ${metrics?.arr ? 'text-white' : 'text-white/15'}`}>
                  {metrics?.arr ? `$${metrics.arr.toLocaleString()}` : '—'}
                </p>
              </div>
            </div>
            {/* Avg CLV */}
            <div className="flex items-center gap-3 px-4 py-3 min-w-0 border-b sm:border-b-0 sm:border-r border-emerald-500/10">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-emerald-400/50 font-medium uppercase tracking-widest">Avg CLV</p>
                <p className={`text-lg font-bold leading-tight ${metrics?.avgCLV ? 'text-white' : 'text-white/15'}`}>
                  {metrics?.avgCLV ? `$${metrics.avgCLV.toFixed(2)}` : '—'}
                </p>
                {!metrics?.avgCLV && <p className="text-[9px] text-white/10">Requires purchase history</p>}
              </div>
            </div>
            {/* Churn Rate */}
            <div className="flex items-center gap-3 px-4 py-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <TrendingDown className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-emerald-400/50 font-medium uppercase tracking-widest">Churn Rate</p>
                <p className={`text-lg font-bold leading-tight ${metrics?.churnRate ? 'text-white' : 'text-white/15'}`}>
                  {metrics?.churnRate ? `${(metrics.churnRate * 100).toFixed(1)}%` : '—'}
                </p>
                {!metrics?.churnRate && <p className="text-[9px] text-white/10">Requires churn tracking</p>}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── 2. Revenue Chart (or empty state) ─────────────────────── */}
      {revenueTimeSeries.length > 0 ? (
        <motion.div variants={itemVariants} className="bg-[#0D1F17] border border-emerald-500/15 rounded-xl p-4 md:p-6 relative overflow-hidden">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-semibold text-white">Revenue Trends</h3>
                <p className="text-xs text-emerald-400/40 mt-0.5">New subscriptions vs churned users</p>
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
                <AreaChart data={revenueTimeSeries} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
                    <filter id="emeraldGlow">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,185,129,0.06)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: 'rgba(16,185,129,0.4)', fontSize: 11 }} axisLine={{ stroke: 'rgba(16,185,129,0.1)' }} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(16,185,129,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="newSubs" stroke="#10B981" strokeWidth={2.5} fill="url(#emeraldNewSubsGradient)" filter="url(#emeraldGlow)" />
                  <Area type="monotone" dataKey="churned" stroke="#EF4444" strokeWidth={2} fill="url(#redChurnedGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      ) : (
        <EmptyBlock
          title="Revenue Trends"
          subtitle="Subscription time series will appear when payment data is available"
          icon={Receipt}
          className="min-h-[280px]"
        />
      )}

      {/* ─── 3. Plan Distribution: Vertical Pillar Cards ────────────── */}
      <motion.div variants={itemVariants}>
        <h3 className="text-base font-semibold text-white mb-4">Plan Distribution</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {planDistribution.length > 0 ? (
            planDistribution.map((plan) => {
              const planIcon = plan.name === 'Free' ? Users : plan.name === 'Pro' ? Zap : Crown
              const planIconBg = plan.name === 'Free' ? 'bg-gray-500/10 border-gray-500/20' : plan.name === 'Pro' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'
              const planIconColor = plan.name === 'Free' ? 'text-gray-400' : plan.name === 'Pro' ? 'text-emerald-400' : 'text-amber-400'
              const PlanIcon = planIcon
              return (
                <div
                  key={plan.name}
                  className="bg-[#0D1F17] border border-emerald-500/10 rounded-xl p-5 relative overflow-hidden group"
                  style={{
                    borderBottom: `2px solid ${plan.pillarColor}30`,
                  }}
                >
                  <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-2/3 rounded-full blur-3xl opacity-40 group-hover:opacity-70 transition-opacity duration-500"
                    style={{ background: plan.pillarGlow }}
                  />

                  <div className="relative flex flex-col items-center text-center">
                    <p className={`text-3xl font-bold ${plan.accentColor} mb-1`}>
                      {plan.price}
                    </p>
                    <p className="text-xs text-white/30 mb-4">{plan.name} Plan</p>

                    <div className="relative w-16 flex flex-col items-center mb-4">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-500 group-hover:scale-105`}
                        style={{
                          minHeight: `${Math.max(40, (plan.percentage / 100) * 160)}px`,
                          background: `linear-gradient(to top, ${plan.pillarColor}30, ${plan.pillarColor}15)`,
                        }}
                      >
                        <div className="flex flex-col items-center justify-center h-full py-3 gap-1">
                          <PlanIcon className="w-5 h-5" style={{ color: plan.pillarColor }} />
                          <span className="text-xs font-bold text-white/80">{plan.users.toLocaleString()}</span>
                          <span className="text-[9px] text-white/30">users</span>
                        </div>
                      </div>
                      <div className="w-20 h-2 rounded-b-md" style={{ background: `${plan.pillarColor}25` }} />
                      <div className="w-14 h-1.5 rounded-t-md -mb-0.5" style={{ background: `${plan.pillarColor}40` }} />
                    </div>

                    <p className="text-sm font-semibold text-white/60 mb-2">{plan.percentage}% of total</p>

                    <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden mb-3">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: plan.pillarColor }}
                        initial={{ width: 0 }}
                        animate={{ width: `${plan.percentage}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                      />
                    </div>

                    {plan.revenue !== '$0' && (
                      <div className="flex items-center justify-between w-full text-xs mb-2">
                        <span className="text-white/30">Revenue</span>
                        <span className="text-emerald-400 font-medium">{plan.revenue}</span>
                      </div>
                    )}

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
            })
          ) : (
            <>
              <EmptyBlock title="Free Plan" subtitle="User counts will appear here" icon={Users} />
              <EmptyBlock title="Pro Plan" subtitle="Subscriber data pending" icon={Zap} />
              <EmptyBlock title="Family+ Plan" subtitle="Subscriber data pending" icon={Crown} />
            </>
          )}
        </div>
      </motion.div>

      {/* ─── 4. Conversion Funnel (data-driven) ────────────────────── */}
      {conversionFunnel.length > 0 && metrics ? (
        <motion.div variants={itemVariants} className="bg-[#0D1F17] border border-emerald-500/15 rounded-xl p-5">
          <h3 className="text-base font-semibold text-white mb-5">Conversion Funnel</h3>
          <div className="flex items-center justify-center gap-3 md:gap-6 overflow-x-auto pb-2">
            {/* Free Plan */}
            <div className="flex flex-col items-center min-w-[100px]">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gray-500/10 border border-gray-500/20 flex items-center justify-center mb-2">
                <Users className="w-7 h-7 md:w-8 md:h-8 text-gray-400" />
              </div>
              <span className="text-sm font-semibold text-white">Free</span>
              <span className="text-xs text-white/30">{metrics.freeUsers.toLocaleString()} users</span>
            </div>

            {/* Arrow: Free → Pro */}
            <div className="flex flex-col items-center gap-1 min-w-[80px] md:min-w-[120px]">
              <div className="flex items-center gap-1">
                <div className="h-[2px] w-8 md:w-16 bg-gradient-to-r from-gray-500/30 to-emerald-500/30" />
                <ChevronRight className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-xs font-semibold text-emerald-400">{conversionFunnel[0]?.rate}%</span>
              </div>
              <span className="text-[10px] text-white/20">convert</span>
            </div>

            {/* Pro Plan */}
            <div className="flex flex-col items-center min-w-[100px]">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-2">
                <Zap className="w-7 h-7 md:w-8 md:h-8 text-emerald-400" />
              </div>
              <span className="text-sm font-semibold text-white">Pro</span>
              <span className="text-xs text-white/30">{metrics.proUsers.toLocaleString()} users</span>
            </div>

            {/* Arrow: Pro → Family+ */}
            {conversionFunnel.length > 1 && (
              <>
                <div className="flex flex-col items-center gap-1 min-w-[80px] md:min-w-[120px]">
                  <div className="flex items-center gap-1">
                    <div className="h-[2px] w-8 md:w-16 bg-gradient-to-r from-emerald-500/30 to-amber-500/30" />
                    <ChevronRight className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                    <span className="text-xs font-semibold text-amber-400">{conversionFunnel[1]?.rate}%</span>
                  </div>
                  <span className="text-[10px] text-white/20">upgrade</span>
                </div>

                {/* Family+ Plan */}
                <div className="flex flex-col items-center min-w-[100px]">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-2">
                    <Crown className="w-7 h-7 md:w-8 md:h-8 text-amber-400" />
                  </div>
                  <span className="text-sm font-semibold text-white">Family+</span>
                  <span className="text-xs text-white/30">{metrics.familyPlusUsers.toLocaleString()} users</span>
                </div>
              </>
            )}
          </div>
        </motion.div>
      ) : (
        <EmptyBlock
          title="Conversion Funnel"
          subtitle="Plan conversion rates will appear when subscription data is available"
          icon={BarChart3}
          className="min-h-[200px]"
        />
      )}

      {/* ─── 5. Monthly Revenue Breakdown Table (data-driven) ─────── */}
      {monthlyBreakdown.length > 0 ? (
        <motion.div variants={itemVariants} className="bg-[#0D1F17] border border-emerald-500/15 rounded-xl overflow-hidden">
          <div className="p-5 pb-0">
            <h3 className="text-base font-semibold text-white mb-1">Monthly Revenue Breakdown</h3>
            <p className="text-xs text-emerald-400/40">Detailed view of subscription metrics</p>
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
                    <td className="px-5 py-3 text-sm text-emerald-400 text-right font-medium">{row.newSubs}</td>
                    <td className="px-5 py-3 text-sm text-red-400 text-right">{row.churned}</td>
                    <td className="px-5 py-3 text-sm text-white/80 text-right font-medium">
                      <span className="inline-flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">+{row.netNew}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-emerald-300 text-right font-semibold">{row.revenue}</td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-sm text-white/40">{row.churnRate}</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      ) : (
        <EmptyBlock
          title="Monthly Breakdown"
          subtitle="Revenue breakdown will appear when payment data is available"
          icon={Receipt}
        />
      )}

      {/* ─── 6. Payment Health (data-driven) ──────────────────────── */}
      <motion.div variants={itemVariants}>
        <h3 className="text-base font-semibold text-white mb-4">Payment Health</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {subData?.paymentHealth ? (
            subData.paymentHealth.map((item) => {
              const colorMap: Record<string, { icon: React.ElementType }> = {
                'Failed Payments': { icon: AlertTriangle },
                'Refunds Processed': { icon: RotateCcw },
                'Avg Days to Churn': { icon: Clock },
                'Retry Success Rate': { icon: RefreshCw },
              }
              const IconComp = colorMap[item.label]?.icon || CreditCard
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
                        <IconComp className="w-3.5 h-3.5" style={{ color: item.color }} />
                      </div>
                      <span className="text-[11px] text-white/40 font-medium uppercase tracking-wider leading-tight">{item.label}</span>
                    </div>
                    <p className="text-xl font-bold text-white">{item.value}</p>
                    <p className="text-xs text-white/20 mt-0.5">{item.sub}</p>
                  </div>
                </div>
              )
            })
          ) : (
            <>
              <EmptyBlock title="Failed Payments" subtitle="Requires payment tracking" icon={AlertTriangle} className="min-h-[120px]" />
              <EmptyBlock title="Refunds" subtitle="Requires payment tracking" icon={RotateCcw} className="min-h-[120px]" />
              <EmptyBlock title="Avg Days to Churn" subtitle="Requires churn tracking" icon={Clock} className="min-h-[120px]" />
              <EmptyBlock title="Retry Rate" subtitle="Requires payment tracking" icon={RefreshCw} className="min-h-[120px]" />
            </>
          )}
        </div>
      </motion.div>

      {/* ─── 7. Cohort Analysis Heatmap ────────────────────────────── */}
      {cohortData.length > 0 ? (
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

          {cohortSummary && (
            <div className="mt-4 pt-4 border-t border-emerald-500/10 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-400">~{cohortSummary.m1}%</p>
                <p className="text-[11px] text-white/20">Month 1 Retention</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-400">~{cohortSummary.m3}%</p>
                <p className="text-[11px] text-white/20">Month 3 Retention</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-red-400">~{cohortSummary.m6}%</p>
                <p className="text-[11px] text-white/20">Month 6 Retention</p>
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        <EmptyBlock
          title="Cohort Retention Analysis"
          subtitle="Retention heatmap will appear when cohort tracking data is available. Requires subscription lifecycle events."
          icon={PiggyBank}
          className="min-h-[220px]"
        />
      )}
    </motion.div>
  )
}
