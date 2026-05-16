'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import { safeJsonResponse } from '@/lib/safe-fetch'
import {
  Shield, AlertTriangle, Search, Filter, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, Loader2, RefreshCw, Clock,
  Eye, UserX, Ban, UserCheck, Settings, FileDown, ShieldAlert,
  Zap, CreditCard, Megaphone, Ticket, Activity
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: string
  adminEmail: string
  action: string
  targetType: string
  targetId: string | null
  details: Record<string, unknown>
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

interface AuditStats {
  actionsToday: number
  mostActiveAdmin: string
  mostCommonAction: string
  highRiskCount: number
}

interface AuditAPIData {
  logs: AuditLogEntry[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
  stats: AuditStats
  actionTypes: string[]
  adminEmails: string[]
}

// ─── Animation Variants ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

function isHighRiskAction(action: string): boolean {
  return ['ban_user', 'impersonate_user', 'delete_user', 'system_shutdown', 'emergency_shutdown', 'revoke_session', 'shadow_ban'].includes(action)
}

function getActionColor(action: string) {
  if (isHighRiskAction(action)) return { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]', border: 'border-[--status-danger-border]', dot: 'bg-[--status-danger]' }

  switch (action) {
    case 'login':
    case 'logout':
      return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20', dot: 'bg-[var(--accent)]' }
    case 'view_user':
    case 'export_data':
      return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20', dot: 'bg-[var(--accent)]' }
    case 'ban_user':
    case 'shadow_ban':
    case 'unban_user':
      return { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]', border: 'border-[--status-danger-border]', dot: 'bg-[--status-danger]' }
    case 'impersonate_user':
      return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]', dot: 'bg-[--status-warning]' }
    case 'update_subscription':
    case 'grant_premium':
    case 'revoke_premium':
      return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]', dot: 'bg-[--status-warning]' }
    case 'feature_flag_toggle':
    case 'system_config_change':
      return { bg: 'bg-[var(--accent-primary)]/10', text: 'text-[var(--accent-primary)]', border: 'border-[var(--accent-primary)]/20', dot: 'bg-[var(--accent-primary)]' }
    case 'clear_errors':
    case 'run_autoheal':
      return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20', dot: 'bg-[var(--accent)]' }
    case 'create_coupon':
      return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20', dot: 'bg-[var(--accent)]' }
    case 'send_announcement':
      return { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]', border: 'border-[--status-danger-border]', dot: 'bg-[--status-danger]' }
    case 'resolve_fraud_alert':
      return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20', dot: 'bg-[var(--accent)]' }
    default:
      return { bg: 'bg-[--bg-surface]', text: 'text-[--text-muted]', border: 'border-[--border-subtle]', dot: 'bg-[--bg-surface-2]' }
  }
}

function getActionIcon(action: string) {
  switch (action) {
    case 'login': case 'logout': return <Shield className="w-3.5 h-3.5" />
    case 'view_user': return <Eye className="w-3.5 h-3.5" />
    case 'ban_user': case 'shadow_ban': return <Ban className="w-3.5 h-3.5" />
    case 'unban_user': return <UserCheck className="w-3.5 h-3.5" />
    case 'impersonate_user': return <UserX className="w-3.5 h-3.5" />
    case 'update_subscription': case 'grant_premium': case 'revoke_premium': return <CreditCard className="w-3.5 h-3.5" />
    case 'feature_flag_toggle': case 'system_config_change': return <Settings className="w-3.5 h-3.5" />
    case 'clear_errors': case 'run_autoheal': return <Zap className="w-3.5 h-3.5" />
    case 'export_data': return <FileDown className="w-3.5 h-3.5" />
    case 'create_coupon': return <Ticket className="w-3.5 h-3.5" />
    case 'send_announcement': return <Megaphone className="w-3.5 h-3.5" />
    case 'resolve_fraud_alert': return <ShieldAlert className="w-3.5 h-3.5" />
    case 'bulk_action': return <Activity className="w-3.5 h-3.5" />
    default: return <Shield className="w-3.5 h-3.5" />
  }
}

function getTargetTypeColor(targetType: string) {
  switch (targetType) {
    case 'user': return 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20'
    case 'system': return 'bg-[--status-danger-bg] text-[--status-danger] border-[--status-danger-border]'
    case 'subscription': return 'bg-[--status-warning-bg] text-[--status-warning] border-[--status-warning-border]'
    case 'feature_flag': return 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-[var(--accent-primary)]/20'
    case 'coupon': return 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20'
    case 'moderation': return 'bg-[--status-warning-bg] text-[--status-warning] border-[--status-warning-border]'
    case 'announcement': return 'bg-[--status-danger-bg] text-[--status-danger] border-[--status-danger-border]'
    case 'session': return 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20'
    default: return 'bg-[--bg-surface] text-[--text-muted] border-[--border-subtle]'
  }
}

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Stats Card ──────────────────────────────────────────────────────────────

function StatsCard({ title, value, icon: Icon, color, sub }: {
  title: string
  value: string | number
  icon: React.ElementType
  color: string
  sub?: string
}) {
  return (
    <motion.div variants={itemVariants} className="bg-[--bg-surface] border border-[--border-subtle] rounded-xl p-4 relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/[0.02] to-transparent pointer-events-none rounded-bl-full" />
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-[--text-primary] font-metric">{value}</div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-[--text-muted]">{title}</span>
        {sub && <span className="text-[10px] text-[--text-muted]">{sub}</span>}
      </div>
    </motion.div>
  )
}

// ─── JSON Viewer ─────────────────────────────────────────────────────────────

function JsonViewer({ data }: { data: Record<string, unknown> }) {
  return (
    <pre className="text-[10px] text-[--text-muted] font-mono whitespace-pre-wrap break-words max-h-40 overflow-y-auto custom-scrollbar">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AdminAudit() {
  const [data, setData] = useState<AuditAPIData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [source, setSource] = useState<'live' | 'demo' | 'loading'>('loading')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Filters
  const [actionFilter, setActionFilter] = useState('')
  const [adminFilter, setAdminFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '20',
      })
      if (actionFilter) params.set('action', actionFilter)
      if (adminFilter) params.set('admin', adminFilter)
      if (searchQuery) params.set('search', searchQuery)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const res = await fetch(`/api/admin/audit?${params}`, {
        signal: controller.signal,
        credentials: 'same-origin',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await safeJsonResponse(res)
      if (!controller.signal.aborted) {
        setData(json.data)
        setSource(json.source === 'live' ? 'live' : 'demo')
      }
    } catch {
      if (!controller.signal.aborted) {
        setSource('demo')
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [page, actionFilter, adminFilter, searchQuery, dateFrom, dateTo])

  useEffect(() => {
    fetchData()
    return () => { if (abortRef.current) abortRef.current.abort() }
  }, [fetchData])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [actionFilter, adminFilter, searchQuery, dateFrom, dateTo])

  const stats = data?.stats
  const logs = data?.logs || []
  const total = data?.total || 0
  const hasMore = data?.hasMore || false
  const actionTypes = data?.actionTypes || []
  const adminEmails = data?.adminEmails || []

  const totalPages = Math.ceil(total / 20)

  if (isLoading && !data) {
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
      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[400px] h-[300px] opacity-100" style={{ background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.08) 0%, transparent 60%)' }} />
          <div className="absolute bottom-0 left-0 w-[300px] h-[200px] opacity-100" style={{ background: 'radial-gradient(ellipse at center, color-mix(in srgb, var(--accent) 6%, transparent) 0%, transparent 60%)' }} />
        </div>
        <div className="relative z-10 px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[--text-primary]">
                Audit
                <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent)] bg-clip-text text-transparent"> Log</span>
              </h1>
              <p className="text-sm text-[--text-muted] mt-1">Complete audit trail of all admin actions and system changes</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${
                source === 'live' ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20' : 'bg-[--status-warning-bg] text-[--status-warning] border border-[--status-warning-border]'
              }`}>
                <Shield className="w-3 h-3" />
                {source === 'live' ? 'Live Data' : 'Demo Data'}
              </div>
              <button
                onClick={fetchData}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[--bg-surface] border border-[--border-subtle] text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-surface-2] transition-all"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[var(--bg-primary)] to-transparent pointer-events-none" />
      </motion.div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard
          title="Actions Today"
          value={stats?.actionsToday ?? '—'}
          icon={Activity}
          color="var(--accent)"
        />
        <StatsCard
          title="Most Active Admin"
          value={stats?.mostActiveAdmin ? stats.mostActiveAdmin.split('@')[0] : '—'}
          icon={Shield}
          color="var(--accent)"
          sub={stats?.mostActiveAdmin || ''}
        />
        <StatsCard
          title="Most Common Action"
          value={stats?.mostCommonAction ? formatAction(stats.mostCommonAction) : '—'}
          icon={Zap}
          color="var(--primary)"
        />
        <StatsCard
          title="High-Risk Actions"
          value={stats?.highRiskCount ?? '—'}
          icon={AlertTriangle}
          color="#EF4444"
          sub="ban, impersonate, etc."
        />
      </div>

      {/* ── Audit Log Table ── */}
      <motion.div variants={itemVariants} className="bg-[--bg-surface] border border-[--border-subtle] rounded-xl overflow-hidden">
        {/* Header with Filters */}
        <div className="px-4 py-3 border-b border-[--border-subtle]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[--text-primary] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--accent)]" />
              Audit Log
              <span className="text-xs text-[--text-muted] font-normal">({total} entries)</span>
            </h3>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[--text-muted]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="pl-7 pr-3 py-1.5 bg-[--bg-surface] border border-[--border-subtle] rounded-lg text-xs text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[var(--accent)]/30 w-36"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                  showFilters ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20' : 'bg-[--bg-surface] text-[--text-muted] border border-[--border-subtle] hover:text-[--text-secondary]'
                }`}
              >
                <Filter className="w-3 h-3" />
                Filters
              </button>
            </div>
          </div>

          {/* Expandable Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3 pt-3 border-t border-[--border-subtle]">
                  <div>
                    <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Action Type</label>
                    <select
                      value={actionFilter}
                      onChange={e => setActionFilter(e.target.value)}
                      className="w-full bg-[--bg-surface] border border-[--border-subtle] rounded-lg text-xs text-[--text-muted] px-2 py-1.5 focus:outline-none focus:border-[var(--accent)]/30"
                    >
                      <option value="">All Actions</option>
                      {actionTypes.map(t => (
                        <option key={t} value={t}>{formatAction(t)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Admin</label>
                    <select
                      value={adminFilter}
                      onChange={e => setAdminFilter(e.target.value)}
                      className="w-full bg-[--bg-surface] border border-[--border-subtle] rounded-lg text-xs text-[--text-muted] px-2 py-1.5 focus:outline-none focus:border-[var(--accent)]/30"
                    >
                      <option value="">All Admins</option>
                      {adminEmails.map(e => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">From Date</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={e => setDateFrom(e.target.value)}
                      className="w-full bg-[--bg-surface] border border-[--border-subtle] rounded-lg text-xs text-[--text-muted] px-2 py-1.5 focus:outline-none focus:border-[var(--accent)]/30"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">To Date</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={e => setDateTo(e.target.value)}
                      className="w-full bg-[--bg-surface] border border-[--border-subtle] rounded-lg text-xs text-[--text-muted] px-2 py-1.5 focus:outline-none focus:border-[var(--accent)]/30"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Table Header */}
        <div className="hidden lg:grid grid-cols-[140px_160px_140px_100px_120px_100px_1fr_32px] gap-2 px-4 py-2 bg-[--bg-primary] border-b border-[--border-subtle] text-[10px] font-medium text-[--text-muted] uppercase tracking-wider">
          <span>Timestamp</span>
          <span>Admin</span>
          <span>Action</span>
          <span>Target Type</span>
          <span>Target ID</span>
          <span>IP Address</span>
          <span>Details</span>
          <span></span>
        </div>

        {/* Table Body */}
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Shield className="w-8 h-8 text-[--text-muted] mb-3" />
            <p className="text-sm text-[--text-muted]">No audit logs found</p>
            <p className="text-[10px] text-[--text-muted] mt-1">Admin actions will be logged here</p>
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
            {logs.map((log) => {
              const ac = getActionColor(log.action)
              const isExpanded = expandedId === log.id
              const isHighRisk = isHighRiskAction(log.action)

              return (
                <div key={log.id} className="border-b border-[--border-subtle]">
                  {/* Desktop Row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="hidden lg:grid grid-cols-[140px_160px_140px_100px_120px_100px_1fr_32px] gap-2 px-4 py-2.5 hover:bg-[--bg-surface] transition-colors items-center text-left w-full"
                  >
                    <div className="flex items-center gap-2">
                      {isHighRisk && <AlertTriangle className="w-3 h-3 text-[--status-danger] shrink-0" />}
                      <span className="text-[10px] text-[--text-muted] font-metric">{new Date(log.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <span className="text-xs text-[--text-muted] truncate">{log.adminEmail}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] ${ac.bg} ${ac.text} border ${ac.border} w-fit`}>
                      {getActionIcon(log.action)}
                      {formatAction(log.action)}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] border ${getTargetTypeColor(log.targetType)}`}>{log.targetType}</span>
                    <span className="text-[10px] text-[--text-muted] font-metric truncate">{log.targetId || '—'}</span>
                    <span className="text-[10px] text-[--text-muted] font-metric">{log.ipAddress || '—'}</span>
                    <span className="text-[10px] text-[--text-muted] truncate">{typeof log.details?.reason === 'string' ? log.details.reason : String(JSON.stringify(log.details)).slice(0, 50)}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3 text-[--text-muted]" /> : <ChevronDown className="w-3 h-3 text-[--text-muted]" />}
                  </button>

                  {/* Mobile Row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="lg:hidden flex items-center gap-3 px-4 py-3 hover:bg-[--bg-surface] transition-colors w-full text-left"
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${ac.bg} ${ac.text}`}>
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${ac.text}`}>{formatAction(log.action)}</span>
                        {isHighRisk && <AlertTriangle className="w-3 h-3 text-[--status-danger]" />}
                      </div>
                      <p className="text-[10px] text-[--text-muted] mt-0.5">{log.adminEmail} · {timeAgo(log.createdAt)}</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-3 h-3 text-[--text-muted]" /> : <ChevronDown className="w-3 h-3 text-[--text-muted]" />}
                  </button>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 pl-8 lg:pl-6">
                          <div className="bg-[--bg-primary] rounded-lg p-3 space-y-2">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                              <div>
                                <span className="text-[--text-muted] block text-[10px]">Admin Email</span>
                                <span className="text-[--text-secondary]">{log.adminEmail}</span>
                              </div>
                              <div>
                                <span className="text-[--text-muted] block text-[10px]">Action</span>
                                <span className={ac.text}>{formatAction(log.action)}</span>
                              </div>
                              <div>
                                <span className="text-[--text-muted] block text-[10px]">Target</span>
                                <span className="text-[--text-secondary]">{log.targetType} {log.targetId || ''}</span>
                              </div>
                              <div>
                                <span className="text-[--text-muted] block text-[10px]">IP Address</span>
                                <span className="text-[--text-secondary] font-metric">{log.ipAddress || '—'}</span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-[--text-muted] block text-[10px]">Timestamp</span>
                                <span className="text-[--text-secondary]">{new Date(log.createdAt).toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-[--text-muted] block text-[10px]">User Agent</span>
                                <span className="text-[--text-muted] truncate block">{log.userAgent || '—'}</span>
                              </div>
                            </div>
                            {log.details && Object.keys(log.details).length > 0 && (
                              <div>
                                <span className="text-[--text-muted] block text-[10px] mb-1">Details (JSON)</span>
                                <div className="bg-[--bg-primary] rounded-lg p-2 border border-[--border-subtle]">
                                  <JsonViewer data={log.details} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-[--border-subtle] flex items-center justify-between">
            <span className="text-xs text-[--text-muted]">
              Page {page} of {totalPages} · {total} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs bg-[--bg-surface] border border-[--border-subtle] text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-surface-2] transition-all disabled:opacity-30"
              >
                <ChevronLeft className="w-3 h-3" />
                Prev
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!hasMore}
                className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs bg-[--bg-surface] border border-[--border-subtle] text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-surface-2] transition-all disabled:opacity-30"
              >
                Next
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Demo badge */}
      {source === 'demo' && (
        <div className="text-center">
          <span className="text-[10px] font-metric text-[--text-muted] tracking-widest uppercase">Simulated Data — Connect Supabase for live audit logs</span>
        </div>
      )}
    </motion.div>
  )
}
