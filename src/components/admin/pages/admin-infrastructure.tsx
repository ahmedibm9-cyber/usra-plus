'use client'

import { useState, useEffect, useCallback, useRef, Component, type ReactNode } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  Activity, Clock, Database, HardDrive,
  RefreshCw, Loader2, Terminal, Server,
  Cpu, MemoryStick, TrendingUp, Users, Zap,
  CheckCircle2, AlertTriangle, XCircle
} from 'lucide-react'

// ─── Error Boundary ─────────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class InfrastructureErrorBoundary extends Component<
  { children: ReactNode; onRetry: () => void },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; onRetry: () => void }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Infrastructure page rendering error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <div className="w-16 h-16 rounded-2xl bg-[--status-danger-bg] border border-[--status-danger-border] flex items-center justify-center mb-5">
            <AlertTriangle className="w-8 h-8 text-[--status-danger]" />
          </div>
          <h3 className="text-lg font-semibold text-[--text-primary] mb-2">Rendering Error</h3>
          <p className="text-sm text-[--text-muted] text-center max-w-md mb-2">
            The infrastructure page encountered an error while rendering.
          </p>
          <p className="text-xs text-[--text-muted] text-center max-w-sm mb-6 bg-[--bg-surface-2] p-3 rounded-lg font-mono">
            {this.state.error?.message || 'Unknown rendering error'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              this.props.onRetry()
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[--status-warning-bg] border border-[--status-warning-border] text-[--status-warning] text-sm hover:bg-[--status-warning-bg] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Types ───────────────────────────────────────────────────────────

interface MemoryData {
  heapUsedMB: number
  heapTotalMB: number
  rssMB: number
  externalMB: number
  systemTotalMB: number
  systemFreeMB: number
  systemUsedMB: number
  systemUsagePercent: number
  heapUsagePercent: number
}

interface UptimeData {
  seconds: number
  formatted: string
  days: number
  hours: number
  minutes: number
}

interface DatabaseData {
  sizeBytes: number
  sizeMB: number | string
  totalRows: number
  tableCount: number
  available?: boolean
  type?: string
}

interface HealthCheck {
  name: string
  status: 'healthy' | 'degraded' | 'down'
  latency: number
  message: string
}

interface InfraAPIData {
  memory: MemoryData
  uptime: UptimeData
  database: DatabaseData
  tableCounts: Record<string, number>
  activeConnections: number
  recentActivity: Record<string, number>
  totalRecentActivity: number
  userGrowth: { thisWeek: number; lastWeek: number; growthRate: number }
  healthChecks: HealthCheck[]
}

// ─── Animation Variants ──────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getStatusColor(status: string) {
  switch (status) {
    case 'healthy': return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20', dot: 'bg-[var(--accent)]' }
    case 'degraded': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]', dot: 'bg-[--status-warning]' }
    case 'down': return { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]', border: 'border-[--status-danger-border]', dot: 'bg-[--status-danger]' }
    default: return { bg: 'bg-[--bg-surface]', text: 'text-[--text-muted]', border: 'border-[--border-subtle]', dot: 'bg-[--bg-surface-2]' }
  }
}

// ─── Terminal Block ──────────────────────────────────────────────────

function TerminalBlock({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[--bg-surface] border border-[--border-subtle] rounded-lg overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 mb-0 px-3 py-2 bg-[--bg-primary] border-b border-[--border-subtle]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[--status-danger]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[--status-warning]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[--status-success]" />
        </div>
        <span className="text-[10px] font-metric text-[--text-muted] ml-2">{title}</span>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  )
}

// ─── Metric Card ─────────────────────────────────────────────────────

function MetricCard({ label, value, unit, icon: Icon, color, sub }: {
  label: string; value: string | number; unit?: string; icon: React.ElementType; color: string; sub?: string
}) {
  return (
    <motion.div variants={itemVariants} className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/[0.02] to-transparent pointer-events-none rounded-bl-full" />
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-[--text-primary] font-metric">{value}</span>
        {unit && <span className="text-sm" style={{ color }}>{unit}</span>}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-[--text-muted]">{label}</span>
        {sub && <span className="text-[10px] text-[--text-muted]">{sub}</span>}
      </div>
    </motion.div>
  )
}

// ─── Progress Bar ────────────────────────────────────────────────────

function ProgressBar({ value, max, color = 'emerald' }: { value: number; max: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100)
  const colorMap: Record<string, string> = {
    emerald: 'bg-[var(--accent)]/60',
    amber: 'bg-[--status-warning]/60',
    red: 'bg-[--status-danger-bg]',
    orange: 'bg-[--status-warning]/60',
    cyan: 'bg-[var(--accent)]/60',
  }
  return (
    <div className="h-2 bg-[--bg-surface] rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`h-full rounded-full ${colorMap[color] || colorMap.emerald}`}
      />
    </div>
  )
}

// ─── Main Component (with Error Boundary) ──────────────────────────────

export function AdminInfrastructure() {
  const [retryKey, setRetryKey] = useState(0)
  const handleRetry = useCallback(() => setRetryKey(k => k + 1), [])

  return (
    <InfrastructureErrorBoundary key={retryKey} onRetry={handleRetry}>
      <AdminInfrastructureInner />
    </InfrastructureErrorBoundary>
  )
}

// ─── Inner Component ──────────────────────────────────────────────────

function AdminInfrastructureInner() {
  const [apiData, setApiData] = useState<InfraAPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/infrastructure', { credentials: 'same-origin' })
      if (!mountedRef.current) return
      if (res.status === 401) {
        const { useAdminAuthStore } = await import('@/stores/admin-auth-store')
        useAdminAuthStore.getState().logoutAdmin()
        return
      }
      if (!res.ok) throw new Error('Failed to fetch infrastructure data')
      const json = await safeJsonResponse(res)
      if (!mountedRef.current) return
      if (json.data) {
        setApiData(json.data)
      } else {
        setError(json.error || 'No data available')
      }
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[--text-muted] animate-spin mb-4" />
        <p className="text-sm text-[--text-muted] font-metric">Loading system metrics...</p>
      </div>
    )
  }

  if (error && !apiData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="w-12 h-12 text-[--status-warning] mb-4" />
        <h3 className="text-lg font-medium text-[--text-primary] mb-2">Failed to load data</h3>
        <p className="text-sm text-[--text-muted] mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-[var(--accent-primary)]/80 transition-colors">
          Retry
        </button>
      </div>
    )
  }

  const memory = apiData?.memory
  const uptime = apiData?.uptime
  const database = apiData?.database
  const tableCounts = apiData?.tableCounts || {}
  const activeConnections = apiData?.activeConnections || 0
  const recentActivity = apiData?.recentActivity || {}
  const userGrowth = apiData?.userGrowth
  const healthChecks = apiData?.healthChecks || []

  const healthyCount = healthChecks.filter(h => h.status === 'healthy').length
  const overallHealthy = healthyCount === healthChecks.length

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* ── Header ── */}
      <motion.div variants={itemVariants} className={`relative overflow-hidden rounded-xl p-5 ${overallHealthy ? 'bg-[var(--accent)]/5 border border-[var(--accent)]/15' : 'bg-[--status-warning-bg] border border-[--status-warning-border]'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-[var(--accent)]" />
            <div>
              <h2 className="text-xl font-bold text-[--text-primary] font-metric">Server Infrastructure</h2>
              <p className="text-sm text-[--text-muted]">Live system metrics · {healthyCount}/{healthChecks.length} components healthy</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
              <span className="text-[10px] font-metric text-[var(--accent)]">LIVE</span>
            </div>
            <span className="text-[10px] font-metric text-[--text-muted]">{currentTime.toLocaleTimeString()}</span>
            <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[--bg-surface] border border-[--border-subtle] text-[--text-muted] hover:text-[--text-secondary] transition-all">
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Core Metrics Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard label="Heap Used" value={memory?.heapUsedMB?.toFixed(1) || '—'} unit="MB" icon={MemoryStick} color="var(--accent)" sub={`of ${memory?.heapTotalMB?.toFixed(0) || '?'}MB`} />
        <MetricCard label="System RAM" value={memory?.systemUsagePercent?.toFixed(1) || '—'} unit="%" icon={Cpu} color={memory?.systemUsagePercent && memory.systemUsagePercent > 80 ? '#EF4444' : 'var(--accent)'} sub={`${memory?.systemUsedMB?.toFixed(0) || '?'}MB used`} />
        <MetricCard label="Uptime" value={uptime?.formatted || '—'} icon={Clock} color="var(--accent)" />
        <MetricCard label="DB Size" value={typeof database?.sizeMB === 'number' ? database.sizeMB.toFixed(2) : (database?.sizeMB || '—')} unit={typeof database?.sizeMB === 'number' ? 'MB' : undefined} icon={Database} color="#F97316" sub={database ? `${database.totalRows} rows` : ''} />
        <MetricCard label="Sessions" value={activeConnections} icon={Users} color="var(--primary)" sub="active" />
        <MetricCard label="Growth" value={userGrowth ? `${userGrowth.growthRate >= 0 ? '+' : ''}${userGrowth.growthRate.toFixed(1)}` : '—'} unit="%" icon={TrendingUp} color={userGrowth && userGrowth.growthRate >= 0 ? 'var(--accent)' : '#EF4444'} sub="week/week" />
      </div>

      {/* ── Memory & DB Details ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Memory Breakdown */}
        <motion.div variants={itemVariants}>
          <TerminalBlock title="memory.stats">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-metric text-[--text-muted] uppercase tracking-wider">Heap Usage</span>
                  <span className="text-[10px] font-metric text-[var(--accent)]">{memory?.heapUsedMB?.toFixed(1)} / {memory?.heapTotalMB?.toFixed(1)} MB</span>
                </div>
                <ProgressBar value={memory?.heapUsedMB || 0} max={memory?.heapTotalMB || 1} color="emerald" />
                <span className="text-[10px] text-[--text-muted] font-metric">{memory?.heapUsagePercent?.toFixed(1)}% utilized</span>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-metric text-[--text-muted] uppercase tracking-wider">System RAM</span>
                  <span className="text-[10px] font-metric text-[--status-warning]">{memory?.systemUsedMB?.toFixed(0)} / {memory?.systemTotalMB?.toFixed(0)} MB</span>
                </div>
                <ProgressBar value={memory?.systemUsedMB || 0} max={memory?.systemTotalMB || 1} color="amber" />
                <span className="text-[10px] text-[--text-muted] font-metric">{memory?.systemUsagePercent?.toFixed(1)}% utilized</span>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-metric text-[--text-muted] uppercase tracking-wider">RSS (Resident Set)</span>
                  <span className="text-[10px] font-metric text-[var(--accent)]">{memory?.rssMB?.toFixed(1)} MB</span>
                </div>
                <ProgressBar value={memory?.rssMB || 0} max={memory?.systemTotalMB || 1} color="cyan" />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-[--bg-primary] rounded-lg p-3">
                  <span className="text-[9px] text-[--text-muted] font-metric uppercase">External</span>
                  <p className="text-sm font-metric text-[--text-secondary]">{memory?.externalMB?.toFixed(1) || '—'} MB</p>
                </div>
                <div className="bg-[--bg-primary] rounded-lg p-3">
                  <span className="text-[9px] text-[--text-muted] font-metric uppercase">Free RAM</span>
                  <p className="text-sm font-metric text-[var(--accent)]">{memory?.systemFreeMB?.toFixed(0) || '—'} MB</p>
                </div>
              </div>
            </div>
          </TerminalBlock>
        </motion.div>

        {/* Database Table Details */}
        <motion.div variants={itemVariants}>
          <TerminalBlock title="db.table.stats">
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[--text-primary]">Table Row Counts</span>
                <span className="text-[10px] font-metric text-[--status-warning]">{database?.tableCount} tables · {database?.totalRows} total rows</span>
              </div>
              {Object.entries(tableCounts).sort((a, b) => b[1] - a[1]).map(([table, count], i) => {
                const maxCount = Math.max(...Object.values(tableCounts), 1)
                return (
                  <motion.div key={table} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-metric text-[--text-muted]">{table}</span>
                      <span className="text-[10px] font-metric text-[--text-muted]">{count.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-[--bg-surface] rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(count / maxCount) * 100}%` }} transition={{ delay: 0.2 + i * 0.04, duration: 0.5 }} className="h-full rounded-full bg-gradient-to-r from-orange-500/60 to-red-500/50" />
                    </div>
                  </motion.div>
                )
              })}
              {Object.keys(tableCounts).length === 0 && (
                <p className="text-xs text-[--text-muted] text-center py-4">No table data available</p>
              )}
            </div>
          </TerminalBlock>
        </motion.div>
      </div>

      {/* ── Recent Activity & Health ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Activity */}
        <motion.div variants={itemVariants}>
          <TerminalBlock title="activity.24h">
            <div className="space-y-2">
              <div className="text-[10px] font-metric text-[--status-success] mb-2">$ db-activity --last-24h</div>
              {Object.entries(recentActivity).sort((a, b) => b[1] - a[1]).map(([table, count], i) => {
                const maxVal = Math.max(...Object.values(recentActivity), 1)
                const barLen = Math.max(Math.round((count / maxVal) * 20), 1)
                const bar = '█'.repeat(barLen) + '░'.repeat(Math.max(20 - barLen, 0))
                const color = count > 10 ? 'text-[--status-success]' : count > 3 ? 'text-[--status-warning]' : 'text-[--text-muted]'
                return (
                  <motion.div key={table} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-2 text-[10px] font-metric">
                    <span className="text-[--text-muted] w-28 truncate">{table}</span>
                    <span className={color}>{bar}</span>
                    <span className="text-[--text-muted]">{count.toLocaleString()}</span>
                  </motion.div>
                )
              })}
              {Object.keys(recentActivity).length === 0 && (
                <p className="text-xs text-[--text-muted] text-center py-4">No activity in the last 24h</p>
              )}
              <div className="mt-2 text-[10px] font-metric text-[--text-muted]">Total: {apiData?.totalRecentActivity || 0} events</div>
            </div>
          </TerminalBlock>
        </motion.div>

        {/* Health Checks */}
        <motion.div variants={itemVariants}>
          <TerminalBlock title="health.checks">
            <div className="space-y-3">
              {healthChecks.map(check => {
                const c = getStatusColor(check.status)
                return (
                  <div key={check.name} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${c.dot} shrink-0`} />
                    <span className="text-xs text-[--text-secondary] font-metric min-w-[80px]">{check.name}</span>
                    <span className={`text-xs ${c.text} capitalize font-metric`}>{check.status}</span>
                    {check.latency > 0 && <span className="text-[10px] text-[--text-muted] font-metric">{check.latency}ms</span>}
                    <span className="text-[10px] text-[--text-muted] font-metric flex-1 truncate">{check.message}</span>
                  </div>
                )
              })}
              {/* Uptime display */}
              <div className="mt-4 pt-3 border-t border-[--border-subtle]">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[--text-secondary]" />
                  <span className="text-[10px] font-metric text-[--text-muted]">Server Uptime</span>
                  <span className="text-sm font-metric text-[var(--accent)] ml-auto">{uptime?.formatted || '—'}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <HardDrive className="w-4 h-4 text-[--status-warning]" />
                  <span className="text-[10px] font-metric text-[--text-muted]">Database Size</span>
                  <span className="text-sm font-metric text-[--status-warning] ml-auto">{typeof database?.sizeMB === 'number' ? `${database.sizeMB.toFixed(2)} MB` : (database?.sizeMB || '—')}</span>
                </div>
              </div>
            </div>
          </TerminalBlock>
        </motion.div>
      </div>

      {/* ── Growth Rate ── */}
      {userGrowth && (
        <motion.div variants={itemVariants} className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-5">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[--text-primary]">User Growth</h3>
            <span className={`px-2 py-0.5 rounded text-[10px] font-metric ${userGrowth.growthRate >= 0 ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-[--status-danger-bg] text-[--status-danger]'}`}>
              {userGrowth.growthRate >= 0 ? '+' : ''}{userGrowth.growthRate.toFixed(1)}%
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[--bg-primary] rounded-lg p-3">
              <span className="text-[9px] text-[--text-muted] font-metric uppercase">This Week</span>
              <p className="text-lg font-bold text-[var(--accent)] font-metric">{userGrowth.thisWeek}</p>
            </div>
            <div className="bg-[--bg-primary] rounded-lg p-3">
              <span className="text-[9px] text-[--text-muted] font-metric uppercase">Last Week</span>
              <p className="text-lg font-bold text-[--text-muted] font-metric">{userGrowth.lastWeek}</p>
            </div>
            <div className="bg-[--bg-primary] rounded-lg p-3">
              <span className="text-[9px] text-[--text-muted] font-metric uppercase">Growth</span>
              <p className={`text-lg font-bold font-metric ${userGrowth.growthRate >= 0 ? 'text-[var(--accent)]' : 'text-[--status-danger]'}`}>
                {userGrowth.growthRate >= 0 ? '+' : ''}{userGrowth.growthRate.toFixed(1)}%
              </p>
            </div>
            <div className="bg-[--bg-primary] rounded-lg p-3">
              <span className="text-[9px] text-[--text-muted] font-metric uppercase">Net Change</span>
              <p className={`text-lg font-bold font-metric ${userGrowth.thisWeek - userGrowth.lastWeek >= 0 ? 'text-[var(--accent)]' : 'text-[--status-danger]'}`}>
                {userGrowth.thisWeek - userGrowth.lastWeek >= 0 ? '+' : ''}{userGrowth.thisWeek - userGrowth.lastWeek}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Footer ── */}
      <motion.div variants={itemVariants} className="flex items-center justify-center gap-4 pt-2 pb-4 font-metric">
        <div className="flex items-center gap-1.5 text-[10px] text-[--text-muted]">
          <Server className="w-3 h-3" /> USRA+ INFRA
        </div>
        <span className="text-[--text-muted]">·</span>
        <span className="text-[10px] text-[--text-muted]">{currentTime.toLocaleTimeString()}</span>
      </motion.div>
    </motion.div>
  )
}
