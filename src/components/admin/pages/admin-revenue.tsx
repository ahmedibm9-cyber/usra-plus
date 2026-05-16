'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, ArrowUpRight,
  ArrowDownRight, RefreshCw, Filter, CheckCircle2, XCircle,
  Clock, BarChart3, PieChart, Activity, AlertTriangle, Loader2,
  Rocket, Calendar, Zap, ShieldCheck, Eye, Download
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import type { TransactionType, TransactionStatus, RefundStatus } from '@/types/admin'
import { safeJsonResponse } from '@/lib/safe-fetch'

// ─── Animation Variants ──────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
}

// ─── Helpers ──────────────────────────────────────────────────────────

function transactionTypeBadge(type: TransactionType) {
  switch (type) {
    case 'payment': return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20' }
    case 'refund': return { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]', border: 'border-[--status-danger-border]' }
    case 'credit': return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20' }
    case 'coupon': return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20' }
    case 'trial': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]' }
    case 'upgrade': return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20' }
    case 'downgrade': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]' }
  }
}

function transactionStatusBadge(status: TransactionStatus) {
  switch (status) {
    case 'pending': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]' }
    case 'completed': return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20' }
    case 'failed': return { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]', border: 'border-[--status-danger-border]' }
    case 'refunded': return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20' }
    case 'disputed': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]' }
  }
}

function refundStatusBadge(status: RefundStatus) {
  switch (status) {
    case 'pending': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]' }
    case 'approved': return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20' }
    case 'processed': return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20' }
    case 'rejected': return { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]', border: 'border-[--status-danger-border]' }
    case 'disputed': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]' }
    default: return { bg: 'bg-[--bg-surface]', text: 'text-[--text-muted]', border: 'border-[--border-subtle]' }
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

// ─── Custom Tooltip ──────────────────────────────────────────────────

function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[--bg-primary]/95 border border-[var(--accent)]/20 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-sm">
      <p className="text-xs text-[--text-muted] mb-1">{label}</p>
      <p className="text-lg font-bold text-[--text-primary]">${payload[0].value.toLocaleString()}</p>
      <p className="text-xs text-[var(--accent)]">Revenue</p>
    </div>
  )
}

// ─── Revenue Data Types ──────────────────────────────────────────────

interface RevenueTransactionData {
  id: string
  userId: string | null
  subscriptionId: string | null
  type: TransactionType
  amount: number
  currency: string
  originalAmount: number | null
  discountAmount: number
  couponId: string | null
  paymentProvider: string | null
  status: TransactionStatus
  description: string | null
  createdAt: string
}

interface RefundData {
  id: string
  transactionId: string
  userId: string | null
  amount: number
  reason: string
  category: string
  status: RefundStatus
  approvedBy: string | null
  approvedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface RevenueAnalyticsData {
  isPreLaunch: boolean
  totalRevenue: number
  mrr: number
  arr: number
  avgCLV: number
  churnRate: number
  monthlyRevenue: { month: string; revenue: number; newSubs: number; churned: number }[]
  revenueByPlan: { plan: string; revenue: number; percentage: number }[]
  refundRate: number
  pendingRefunds: number
  totalTransactions: number
  totalRefunded: number
  transactions: RevenueTransactionData[]
  refunds: RefundData[]
}

// ─── Donut Chart SVG ─────────────────────────────────────────────────

function RevenueDonutChart({ data }: { data: { plan: string; revenue: number; percentage: number }[] }) {
  const size = 160
  const strokeWidth = 18
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2
  const total = data.reduce((s, d) => s + d.revenue, 0)
  const colors = ['var(--accent)', 'var(--accent-primary)', 'var(--accent)', 'var(--primary)', '#EF4444']

  if (total === 0) {
    return (
      <div className="relative flex flex-col items-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth={strokeWidth} />
        </svg>
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-bold text-[--text-muted]">--</span>
      </div>
    )
  }

  const segments = data.reduce<Array<typeof data[number] & { dashLength: number; offset: number; color: string }>>((acc, item, i) => {
    const dashLength = (item.percentage / 100) * circumference
    const offset = acc.length === 0 ? 0 : acc[acc.length - 1].offset + acc[acc.length - 1].dashLength + 4
    acc.push({ ...item, dashLength, offset, color: colors[i % colors.length] })
    return acc
  }, [])

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--border-subtle)" strokeWidth={strokeWidth} />
        {segments.map((seg) => (
          <circle key={seg.plan} cx={center} cy={center} r={radius} fill="none" stroke={seg.color}
            strokeWidth={strokeWidth} strokeLinecap="round"
            strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
            strokeDashoffset={-seg.offset}
            className="transition-all duration-700"
            style={{ filter: `drop-shadow(0 0 6px ${seg.color}40)` }} />
        ))}
      </svg>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <span className="text-lg font-bold text-[--text-primary]">${total.toLocaleString()}</span>
        <p className="text-[10px] text-[--text-muted]">Total</p>
      </div>
    </div>
  )
}

// ─── No Revenue Data Banner ───────────────────────────────────────────────

function NoRevenueBanner() {
  return (
    <motion.div variants={itemVariants}
      className="bg-gradient-to-br from-[var(--accent)]/5 via-[--bg-surface] to-[var(--accent)]/5 border border-[var(--accent)]/15 rounded-2xl p-8 md:p-12 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[var(--accent)]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-[var(--accent)]/5 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center mb-6">
          <Rocket className="w-8 h-8 text-[var(--accent)]" />
        </div>

        <h3 className="text-2xl font-bold text-[--text-primary] mb-2">No Revenue Data Yet</h3>
        <p className="text-sm text-[--text-muted] max-w-md mb-6">
          Revenue analytics will populate once users start subscribing to paid plans.
          This page will show MRR, ARR, LTV, churn, and payment history.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-lg">
          {[
            { icon: DollarSign, label: 'MRR Tracking', desc: 'Monthly recurring revenue' },
            { icon: TrendingUp, label: 'ARR Growth', desc: 'Annual run rate' },
            { icon: CreditCard, label: 'Payment History', desc: 'Transaction records' },
            { icon: BarChart3, label: 'Churn Analysis', desc: 'Retention metrics' },
          ].map(item => (
            <div key={item.label} className="flex flex-col items-center gap-1.5 p-3 bg-[--bg-surface] rounded-xl border border-[--border-subtle]">
              <item.icon className="w-5 h-5 text-[--text-muted]" />
              <span className="text-[10px] text-[--text-muted] font-medium">{item.label}</span>
              <span className="text-[9px] text-[--text-muted]">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────

export function AdminRevenue() {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'refunds'>('overview')
  const [txTypeFilter, setTxTypeFilter] = useState<string>('all')
  const [txStatusFilter, setTxStatusFilter] = useState<string>('all')
  const [analytics, setAnalytics] = useState<RevenueAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchRevenue = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/revenue', { credentials: 'same-origin' })
      if (res.ok) {
        const json = await safeJsonResponse(res)
        setAnalytics(json.data)
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchRevenue() }, [fetchRevenue])

  const isEmpty = analytics?.isPreLaunch ?? true

  const transactions = analytics?.transactions ?? []
  const refunds = analytics?.refunds ?? []

  const filteredTx = transactions.filter(tx => {
    if (txTypeFilter !== 'all' && tx.type !== txTypeFilter) return false
    if (txStatusFilter !== 'all' && tx.status !== txStatusFilter) return false
    return true
  })

  const pendingRefunds = refunds.filter(r => r.status === 'pending')

  const handleApproveRefund = async (refundId: string) => {
    try {
      const res = await fetch('/api/admin/revenue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ refundId, action: 'approve' }),
      })
      if (!res.ok) {
        const err = await safeJsonResponse(res)
        toast.error(err.error || 'Failed to approve refund')
        return
      }
      toast.success('Refund approved')
      fetchRevenue()
    } catch {
      toast.error('Failed to approve refund')
    }
  }

  const handleRejectRefund = async (refundId: string) => {
    try {
      const res = await fetch('/api/admin/revenue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ refundId, action: 'reject' }),
      })
      if (!res.ok) {
        const err = await safeJsonResponse(res)
        toast.error(err.error || 'Failed to reject refund')
        return
      }
      toast.success('Refund rejected')
      fetchRevenue()
    } catch {
      toast.error('Failed to reject refund')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[--bg-surface] rounded-xl border border-[--border-subtle] p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
        <div className="bg-[--bg-surface] rounded-xl border border-[--border-subtle] p-4">
          <Skeleton className="h-64 w-full" />
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
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[--text-primary] flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[var(--accent)]" />
            Revenue Analytics
          </h2>
          <p className="text-sm text-[--text-muted] mt-1">Financial overview, transactions, and refund management</p>
        </div>
        {isEmpty && (
          <span className="text-[10px] text-[--status-warning] uppercase tracking-widest font-medium bg-[--status-warning-bg] border border-[--status-warning-border] rounded-full px-3 py-1">
            No Data
          </span>
        )}
        {/* Export buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/admin/export?type=revenue&format=csv', { credentials: 'same-origin' })
                if (res.ok) {
                  const json = await safeJsonResponse(res)
                  const blob = new Blob([json.data], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `revenue-export-${new Date().toISOString().split('T')[0]}.csv`
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                }
              } catch { /* ignore */ }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[--bg-surface] border border-[--border-subtle] text-[--text-muted] hover:text-[--text-secondary] transition-colors"
          >
            <Download className="w-3 h-3" /> CSV
          </button>
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/admin/export?type=revenue&format=json', { credentials: 'same-origin' })
                if (res.ok) {
                  const json = await safeJsonResponse(res)
                  const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `revenue-export-${new Date().toISOString().split('T')[0]}.json`
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                }
              } catch { /* ignore */ }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[--bg-surface] border border-[--border-subtle] text-[--text-muted] hover:text-[--text-secondary] transition-colors"
          >
            <Download className="w-3 h-3" /> JSON
          </button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'MRR', value: analytics?.mrr ?? 0, prefix: '$', icon: DollarSign, color: 'text-[var(--accent)]' },
          { label: 'ARR', value: analytics?.arr ?? 0, prefix: '$', icon: TrendingUp, color: 'text-[var(--accent)]' },
          { label: 'Avg CLV', value: analytics?.avgCLV ?? 0, prefix: '$', icon: CreditCard, color: 'text-[var(--accent)]' },
          { label: 'Churn Rate', value: analytics?.churnRate ?? 0, suffix: '%', icon: TrendingDown, color: 'text-[--status-danger]' },
          { label: 'Refund Rate', value: analytics?.refundRate ?? 0, suffix: '%', icon: RefreshCw, color: 'text-[--status-warning]' },
        ].map(stat => (
          <motion.div key={stat.label} variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-[10px] text-[--text-muted] uppercase tracking-wider">{stat.label}</span>
            </div>
            <div className="flex items-baseline gap-1">
              {stat.prefix && <span className="text-sm text-[--text-muted]">{stat.prefix}</span>}
              <span className="text-2xl font-bold text-[--text-primary]">{stat.value > 0 ? stat.value.toLocaleString() : '—'}</span>
              {stat.suffix && stat.value > 0 && <span className="text-sm text-[--text-muted]">{stat.suffix}</span>}
            </div>
          </motion.div>
        ))}
      </div>

      {/* No Revenue Banner (shown when no revenue data) */}
      {isEmpty && <NoRevenueBanner />}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-1">
        {[
          { id: 'overview' as const, label: 'Overview', icon: <BarChart3 className="w-3.5 h-3.5" /> },
          { id: 'transactions' as const, label: 'Transactions', icon: <CreditCard className="w-3.5 h-3.5" /> },
          { id: 'refunds' as const, label: 'Refunds', icon: <RefreshCw className="w-3.5 h-3.5" />, badge: pendingRefunds.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                : 'text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-surface]'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-[--status-warning-bg] text-[--status-warning] border border-[--status-warning-border]">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Revenue Chart */}
              {analytics && analytics.monthlyRevenue.length > 0 ? (
                <motion.div variants={itemVariants} className="bg-[--bg-primary] border border-[var(--accent)]/10 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider mb-4">Monthly Revenue</h3>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.monthlyRevenue} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                            <stop offset="80%" stopColor="var(--accent)" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} dy={6} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} dx={-4} />
                        <Tooltip content={<RevenueTooltip />} />
                        <Area type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2} fill="url(#revGradient)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              ) : (
                <motion.div variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-6 flex flex-col items-center justify-center min-h-[280px]">
                  <BarChart3 className="w-10 h-10 text-[--text-muted] mb-3" />
                  <p className="text-sm text-[--text-muted]">Revenue chart</p>
                  <p className="text-xs text-[--text-muted] mt-1">Will populate with subscription revenue data after launch</p>
                </motion.div>
              )}

              {/* Revenue by Plan */}
              <motion.div variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider mb-4">Revenue by Plan</h3>
                {analytics && analytics.revenueByPlan.length > 0 ? (
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <RevenueDonutChart data={analytics.revenueByPlan} />
                    <div className="flex-1 space-y-3 w-full">
                      {analytics.revenueByPlan.map((plan, i) => {
                        const colors = ['var(--accent)', 'var(--accent-primary)', 'var(--accent)', 'var(--primary)', '#EF4444']
                        return (
                          <div key={plan.plan}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                                <span className="text-sm text-[--text-secondary] capitalize">{plan.plan.replace(/_/g, ' ')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-[--text-primary]">${plan.revenue.toLocaleString()}</span>
                                <span className="text-xs text-[--text-muted]">{plan.percentage}%</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-[--bg-surface] rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${plan.percentage}%` }}
                                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                className="h-full rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <PieChart className="w-10 h-10 text-[--text-muted] mb-3" />
                    <p className="text-sm text-[--text-muted]">No plan revenue data</p>
                    <p className="text-xs text-[--text-muted] mt-1">Will show revenue breakdown by subscription tier after launch</p>
                  </div>
                )}
              </motion.div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="w-4 h-4 text-[--text-muted]" />
                <select value={txTypeFilter} onChange={e => setTxTypeFilter(e.target.value)}
                  className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg text-xs text-[--text-muted] px-2 py-1.5 focus:outline-none focus:border-[var(--accent)]/30">
                  <option value="all">All Types</option>
                  <option value="payment">Payment</option>
                  <option value="refund">Refund</option>
                  <option value="credit">Credit</option>
                  <option value="coupon">Coupon</option>
                  <option value="trial">Trial</option>
                  <option value="upgrade">Upgrade</option>
                  <option value="downgrade">Downgrade</option>
                </select>
                <select value={txStatusFilter} onChange={e => setTxStatusFilter(e.target.value)}
                  className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg text-xs text-[--text-muted] px-2 py-1.5 focus:outline-none focus:border-[var(--accent)]/30">
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                  <option value="disputed">Disputed</option>
                </select>
              </div>

              {filteredTx.length === 0 ? (
                <motion.div variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px]">
                  <CreditCard className="w-10 h-10 text-[--text-muted] mb-3" />
                  <p className="text-sm text-[--text-muted] mb-1">No transactions yet</p>
                  <p className="text-xs text-[--text-muted]">Revenue transactions will appear here after launch</p>
                </motion.div>
              ) : (
                <div className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl overflow-hidden">
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {filteredTx.map(tx => {
                      const tc = transactionTypeBadge(tx.type)
                      const sc = transactionStatusBadge(tx.status)
                      return (
                        <div key={tx.id} className="flex items-center gap-3 px-4 py-3 border-b border-[--border-subtle] hover:bg-[--bg-surface] transition-colors">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${tc.bg} ${tc.text} border ${tc.border} capitalize`}>{tx.type}</span>
                          <span className="text-xs text-[--text-secondary] flex-1 truncate">{tx.description || tx.type}</span>
                          <span className={`text-sm font-semibold ${tx.type === 'refund' ? 'text-[--status-danger]' : 'text-[var(--accent)]'}`}>
                            {tx.type === 'refund' ? '-' : '+'}${tx.amount.toFixed(2)}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] ${sc.bg} ${sc.text} border ${sc.border}`}>{tx.status}</span>
                          <span className="text-[10px] text-[--text-muted]">{timeAgo(tx.createdAt)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Refunds Tab */}
          {activeTab === 'refunds' && (
            <div className="space-y-4">
              {/* Refund Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[--bg-primary] border border-[--border-subtle] rounded-xl p-4">
                  <p className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1">Pending Refunds</p>
                  <span className="text-2xl font-bold text-[--status-warning]">{analytics?.pendingRefunds ?? 0}</span>
                </div>
                <div className="bg-[--bg-primary] border border-[--border-subtle] rounded-xl p-4">
                  <p className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1">Total Refunded</p>
                  <span className="text-2xl font-bold text-[--status-danger]">${(analytics?.totalRefunded ?? 0).toFixed(2)}</span>
                </div>
                <div className="bg-[--bg-primary] border border-[--border-subtle] rounded-xl p-4">
                  <p className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1">Refund Rate</p>
                  <span className="text-2xl font-bold text-[--text-primary]">{analytics?.refundRate ?? 0}%</span>
                </div>
              </div>

              {pendingRefunds.length === 0 ? (
                <motion.div variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-8 flex flex-col items-center justify-center min-h-[250px]">
                  <CheckCircle2 className="w-10 h-10 text-[--text-muted] mb-3" />
                  <p className="text-sm text-[--text-muted] mb-1">No pending refunds</p>
                  <p className="text-xs text-[--text-muted]">Refund requests requiring approval will appear here after launch</p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {pendingRefunds.map(refund => {
                    const sc = refundStatusBadge(refund.status as RefundStatus)
                    return (
                      <div key={refund.id} className="bg-[--bg-primary] border border-[--border-subtle] rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${sc.bg} ${sc.text} border ${sc.border} capitalize`}>{refund.status}</span>
                            <span className="text-sm font-bold text-[--text-primary]">${refund.amount.toFixed(2)}</span>
                          </div>
                          <span className="text-[10px] text-[--text-muted]">{timeAgo(refund.createdAt)}</span>
                        </div>
                        <p className="text-xs text-[--text-muted] mb-3">{refund.reason}</p>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleApproveRefund(refund.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-all">
                            <CheckCircle2 className="w-3 h-3" /> Approve
                          </button>
                          <button onClick={() => handleRejectRefund(refund.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[--status-danger-bg] border border-[--status-danger-border] text-[--status-danger] hover:bg-[--status-danger-bg] transition-all">
                            <XCircle className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
