'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  Bug, Activity, Database, Wifi, WifiOff, AlertTriangle,
  CheckCircle, XCircle, Clock, RefreshCw, ChevronDown, ChevronUp,
  Shield, Server, HardDrive, Zap, TrendingUp, TrendingDown,
  Minus, Loader2, Copy, Check, Send, Filter, Search,
  AlertCircle, Info, Terminal, Eye, Trash2, Heart, Wrench,
  BarChart3, Gauge, Download, Play, Pause, RotateCcw, Globe, Timer
} from 'lucide-react'
import type {
  HealthStatus, BugSeverity, BugStatus, HealthCheck,
  BugReport, DatabaseTableStatus, ConnectionTest, PerformanceMetric
} from '@/types/admin'
import { getCapturedErrors, clearCapturedErrors } from '@/lib/error-capture'
import { safeJsonResponse } from '@/lib/safe-fetch'
import {
  initAdminErrorMonitor, getMonitoredErrors, clearMonitoredErrors,
  getErrorMonitorStats, getErrorTrend, getSeverityDistribution,
  getPerformanceSnapshot, refreshPerformanceSnapshot,
  onErrorCaptured, getLiveErrorCount,
  type MonitoredError, type MonitorSeverity, type PerformanceSnapshot, type ErrorMonitorStats
} from '@/lib/admin-error-monitor'

// Initialize the enhanced error monitor on first import
if (typeof window !== 'undefined') {
  initAdminErrorMonitor()
}

// ─── Types ───────────────────────────────────────────────────────────

interface CapturedError {
  id: string
  message: string
  source: string
  stack?: string
  severity: 'error' | 'warning' | 'critical'
  timestamp: string
  metadata?: Record<string, unknown>
}

interface BugsAPIData {
  overallStatus: HealthStatus
  healthChecks: HealthCheck[]
  tableStatuses: DatabaseTableStatus[]
  connectionTests: ConnectionTest[]
  performanceMetrics: PerformanceMetric[]
  bugReports: BugReport[]
  lastUpdated: string
}

interface PerformanceAPIData {
  source: string
  timestamp: string
  metrics: {
    apiResponseTime: { avg: number; p50: number; p95: number; p99: number; sampleSize: number }
    pageLoadTime: number | null
    dbQueryTime: number | null
  }
  errorRate: {
    errorsLast24h: number
    resolvedErrors: number
    resolutionRate: number
    trend: { hour: string; count: number }[]
  }
  slowQueries: { id: string; name: string; durationMs: number; status: string; createdAt: string }[]
  dbUsage: { totalRows: number; tablesMeasured: number; estimatedSizeMB: number; growthRate: string }
  uptime: { percentage: number; lastChecked: string; status: 'healthy' | 'degraded' | 'down' }
  performanceData: { id: string; type: string; name: string; durationMs: number; status: string; createdAt: string }[]
}

interface HealActionResult {
  action: string
  affected_rows: number
  success: boolean
  message: string
  duration_ms: number
}

type TabId = 'health' | 'errors' | 'performance' | 'autoheal' | 'report' | 'apihealth'

// ─── Animation Variants ──────────────────────────────────────────────

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

// ─── Helper Functions ────────────────────────────────────────────────

function getStatusColor(status: HealthStatus | 'pass' | 'fail' | 'warning' | 'ok' | 'critical') {
  switch (status) {
    case 'healthy':
    case 'pass':
    case 'ok':
      return { bg: 'bg-[#10B981]/10', text: 'text-[#10B981]', border: 'border-[#10B981]/20', dot: 'bg-[#10B981]' }
    case 'degraded':
    case 'warning':
      return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]', dot: 'bg-[--status-warning]' }
    case 'down':
    case 'fail':
    case 'critical':
      return { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]', border: 'border-[--status-danger-border]', dot: 'bg-[--status-danger]' }
    case 'unknown':
    default:
      return { bg: 'bg-[--bg-surface]', text: 'text-[--text-muted]', border: 'border-[--border-subtle]', dot: 'bg-[--bg-surface-2]' }
  }
}

function getSeverityColor(severity: BugSeverity) {
  switch (severity) {
    case 'critical': return { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]', border: 'border-[--status-danger-border]' }
    case 'high': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]' }
    case 'medium': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]' }
    case 'low': return { bg: 'bg-[#10B981]/10', text: 'text-[#10B981]', border: 'border-[#10B981]/20' }
    case 'info': return { bg: 'bg-[--bg-surface]', text: 'text-[--text-muted]', border: 'border-[--border-subtle]' }
  }
}

function getMonitorSeverityColor(severity: MonitorSeverity) {
  switch (severity) {
    case 'critical': return { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]', border: 'border-[--status-danger-border]', dot: 'bg-[--status-danger]' }
    case 'error': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]', dot: 'bg-[--status-warning]' }
    case 'warning': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]', dot: 'bg-[--status-warning]' }
    case 'info': return { bg: 'bg-[--bg-surface]', text: 'text-[--text-muted]', border: 'border-[--border-subtle]', dot: 'bg-[--bg-surface-2]' }
  }
}

function getStatusBadgeColor(status: BugStatus) {
  switch (status) {
    case 'open': return { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]', border: 'border-[--status-danger-border]' }
    case 'investigating': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]' }
    case 'fixing': return { bg: 'bg-[#10B981]/10', text: 'text-[#10B981]', border: 'border-[#10B981]/20' }
    case 'resolved': return { bg: 'bg-[#10B981]/10', text: 'text-[#10B981]', border: 'border-[#10B981]/20' }
    case 'wontfix': return { bg: 'bg-[--bg-surface]', text: 'text-[--text-muted]', border: 'border-[--border-subtle]' }
  }
}

function getCategoryColor(category: 'core' | 'admin' | 'new' | 'business') {
  switch (category) {
    case 'core': return 'text-[#10B981]'
    case 'admin': return 'text-[--status-warning]'
    case 'new': return 'text-[#0D9488]'
    case 'business': return 'text-[--status-danger]'
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

function getHealthIcon(name: string) {
  switch (name) {
    case 'Database': return <Database className="w-4 h-4" />
    case 'Auth': return <Shield className="w-4 h-4" />
    case 'Storage': return <HardDrive className="w-4 h-4" />
    case 'Realtime': return <Wifi className="w-4 h-4" />
    case 'API': return <Server className="w-4 h-4" />
    default: return <Activity className="w-4 h-4" />
  }
}

// ─── Mini Chart: SVG Sparkline ───────────────────────────────────────

function SparklineChart({ data, height = 32, color = '#10b981' }: { data: number[]; height?: number; color?: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const w = 100
  const step = w / (data.length - 1)

  const points = data.map((v, i) => `${i * step},${height - (v / max) * (height - 4) - 2}`).join(' ')
  const areaPoints = `0,${height} ${points} ${w},${height}`

  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ maxHeight: height }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Donut Chart: Severity Distribution ──────────────────────────────

function SeverityDonut({ distribution }: { distribution: { severity: MonitorSeverity; count: number; percentage: number }[] }) {
  if (distribution.length === 0) return null

  const total = distribution.reduce((a, d) => a + d.count, 0)
  if (total === 0) return null

  const colorMap: Record<MonitorSeverity, string> = {
    critical: '#ef4444',
    error: '#f97316',
    warning: '#f59e0b',
    info: '#6b7280',
  }

  const size = 80
  const strokeWidth = 14
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  // Pre-compute cumulative offsets for each segment
  const segments = distribution.map((d, i) => {
    const pct = d.percentage / 100
    const cumulativeOffset = distribution.slice(0, i).reduce((sum, prev) => sum + prev.percentage / 100, 0)
    return { ...d, pct, cumulativeOffset }
  })

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg) => {
          const dashLength = circumference * seg.pct
          const dashOffset = -seg.cumulativeOffset * circumference

          return (
            <circle
              key={seg.severity}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={colorMap[seg.severity]}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="transition-all duration-500"
            />
          )
        })}
      </svg>
      <div className="space-y-1">
        {distribution.map(d => (
          <div key={d.severity} className="flex items-center gap-2 text-[10px]">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorMap[d.severity] }} />
            <span className="text-[--text-muted] capitalize">{d.severity}</span>
            <span className="text-[--text-secondary] font-metric">{d.count}</span>
            <span className="text-[--text-muted]">({d.percentage}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Live Pulse Dot ──────────────────────────────────────────────────

function LivePulseDot({ color = 'bg-[#10B981]' }: { color?: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-40`} />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
    </span>
  )
}

// ─── Section: Overall Health Banner ──────────────────────────────────

function OverallHealthBanner({ status, healthChecks, lastUpdated, onRefresh, isLoading, autoRefresh }: {
  status: HealthStatus
  healthChecks: HealthCheck[]
  lastUpdated: string
  onRefresh: () => void
  isLoading: boolean
  autoRefresh: boolean
}) {
  const c = getStatusColor(status)
  const healthyCount = healthChecks.filter(h => h.status === 'healthy').length
  const totalCount = healthChecks.length

  return (
    <motion.div variants={itemVariants} className={`relative overflow-hidden ${c.bg} border ${c.border} rounded-xl p-5`}>
      {/* Gradient background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
            {status === 'healthy' ? <CheckCircle className={`w-7 h-7 ${c.text}`} />
              : status === 'degraded' ? <AlertTriangle className={`w-7 h-7 ${c.text}`} />
                : status === 'down' ? <XCircle className={`w-7 h-7 ${c.text}`} />
                  : <Activity className={`w-7 h-7 ${c.text}`} />}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-[--text-primary]">System Health: {status.charAt(0).toUpperCase() + status.slice(1)}</h2>
              {autoRefresh && <LivePulseDot color={c.dot} />}
            </div>
            <p className="text-sm text-[--text-muted]">
              {healthyCount}/{totalCount} components healthy · Updated {timeAgo(lastUpdated)}
            </p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[--bg-surface] border border-[--border-subtle] text-sm text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-surface-2] transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
    </motion.div>
  )
}

// ─── Section: Health Check Cards ─────────────────────────────────────

function HealthCheckCards({ healthChecks }: { healthChecks: HealthCheck[] }) {
  return (
    <motion.div variants={itemVariants}>
      <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4 text-[#10B981]" />
        Component Health
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {healthChecks.map(check => {
          const c = getStatusColor(check.status)
          return (
            <div key={check.name} className={`bg-[--bg-surface] border ${c.border} rounded-lg p-4 hover:bg-[--bg-surface-2] transition-colors`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center ${c.text}`}>
                  {getHealthIcon(check.name)}
                </div>
                {check.status === 'healthy'
                  ? <LivePulseDot color={c.dot} />
                  : <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                }
              </div>
              <h4 className="text-sm font-semibold text-[--text-primary] mb-1">{check.name}</h4>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${c.text} capitalize`}>{check.status}</span>
                {check.latency !== undefined && (
                  <span className="text-[10px] text-[--text-muted]">{check.latency}ms</span>
                )}
              </div>
              {check.message && (
                <p className="text-[10px] text-[--text-muted] mt-1 truncate" title={check.message}>{check.message}</p>
              )}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ─── Section: Database Table Status ──────────────────────────────────

function DatabaseTableStatusSection({ tableStatuses }: { tableStatuses: DatabaseTableStatus[] }) {
  const [filter, setFilter] = useState<'all' | 'core' | 'admin' | 'new'>('all')
  const [showMissingOnly, setShowMissingOnly] = useState(false)
  const [copiedTable, setCopiedTable] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = tableStatuses
    if (filter !== 'all') list = list.filter(t => t.category === filter)
    if (showMissingOnly) list = list.filter(t => !t.exists)
    return list
  }, [tableStatuses, filter, showMissingOnly])

  const missingTables = tableStatuses.filter(t => !t.exists)
  const existingTables = tableStatuses.filter(t => t.exists)
  const tablesWithRLS = existingTables.filter(t => t.hasRLS)
  const totalTables = tableStatuses.length
  const coreCount = tableStatuses.filter(t => t.category === 'core' && t.exists).length
  const adminCount = tableStatuses.filter(t => t.category === 'admin' && t.exists).length
  const newCount = tableStatuses.filter(t => t.category === 'new' && t.exists).length

  const copySQL = (tableName: string) => {
    const sql = `-- Run in Supabase SQL Editor to create the ${tableName} table\n-- See supabase/additional-tables.sql for the complete migration`
    navigator.clipboard.writeText(sql)
    setCopiedTable(tableName)
    setTimeout(() => setCopiedTable(null), 2000)
  }

  return (
    <motion.div variants={itemVariants}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-[--status-warning]" />
          Database Tables
          {missingTables.length > 0 && (
            <span className="px-2 py-0.5 rounded text-[10px] bg-[--status-danger-bg] text-[--status-danger] border border-[--status-danger-border]">
              {missingTables.length} missing
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#10B981]">{coreCount}/10 core</span>
          <span className="text-[10px] text-[--status-warning]">{adminCount}/8 admin</span>
          <span className="text-[10px] text-[#0D9488]">{newCount}/6 new</span>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-3 mb-3">
        <div className="flex items-center gap-4 mb-2">
          <span className="text-[10px] text-[--text-muted] uppercase tracking-wider">Table Summary</span>
        </div>
        <div className="flex items-center gap-1 h-3 rounded-full overflow-hidden bg-[--bg-surface]">
          {existingTables.length > 0 && (
            <div className="bg-[#10B981]/60 h-full transition-all" style={{ width: `${(existingTables.length / totalTables) * 100}%` }} />
          )}
          {missingTables.length > 0 && (
            <div className="bg-[--status-danger-bg] h-full transition-all" style={{ width: `${(missingTables.length / totalTables) * 100}%` }} />
          )}
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-[--text-muted]">{existingTables.length}/{totalTables} tables exist</span>
          <span className="text-[10px] text-[--text-muted]">{tablesWithRLS.length}/{totalTables} have RLS</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-3">
        {(['all', 'core', 'admin', 'new'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-lg text-xs transition-all ${
              filter === f
                ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20'
                : 'bg-[--bg-surface] text-[--text-muted] border border-[--border-subtle] hover:text-[--text-secondary]'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <button
          onClick={() => setShowMissingOnly(!showMissingOnly)}
          className={`px-3 py-1 rounded-lg text-xs transition-all ml-auto ${
            showMissingOnly
              ? 'bg-[--status-danger-bg] text-[--status-danger] border border-[--status-danger-border]'
              : 'bg-[--bg-surface] text-[--text-muted] border border-[--border-subtle] hover:text-[--text-secondary]'
          }`}
        >
          <Filter className="w-3 h-3 inline mr-1" />
          Missing Only
        </button>
      </div>

      {/* Table List */}
      <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_80px_80px_80px_40px] gap-2 px-4 py-2 bg-[--bg-primary] border-b border-[--border-subtle] text-[10px] font-medium text-[--text-muted] uppercase tracking-wider">
          <span>Table</span>
          <span>Status</span>
          <span>Rows</span>
          <span>RLS</span>
          <span></span>
        </div>
        <div className="max-h-80 overflow-y-auto custom-scrollbar">
          {filtered.map(table => (
            <div key={table.tableName} className="grid grid-cols-[1fr_80px_80px_80px_40px] gap-2 px-4 py-2.5 border-b border-[--border-subtle] hover:bg-[--bg-surface] transition-colors items-center">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-metric ${getCategoryColor(table.category)}`}>{table.tableName}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] ${
                  table.category === 'core' ? 'bg-[#10B981]/10 text-[#10B981]'
                    : table.category === 'admin' ? 'bg-[--status-warning-bg] text-[--status-warning]'
                      : table.category === 'business' ? 'bg-[--status-danger-bg] text-[--status-danger]'
                        : 'bg-[#0D9488]/10 text-[#0D9488]'
                }`}>
                  {table.category}
                </span>
              </div>
              <div>
                {table.exists ? (
                  <span className="flex items-center gap-1 text-xs text-[#10B981]">
                    <CheckCircle className="w-3 h-3" /> Exists
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-[--status-danger]">
                    <XCircle className="w-3 h-3" /> Missing
                  </span>
                )}
              </div>
              <span className="text-xs text-[--text-muted] font-metric">{table.exists ? table.rowCount.toLocaleString() : '—'}</span>
              <span className="text-xs text-[--text-muted]">{table.hasRLS ? '✓' : '—'}</span>
              <div>
                {!table.exists && (
                  <button
                    onClick={() => copySQL(table.tableName)}
                    className="p-1 rounded text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-surface] transition-all"
                    title="Copy migration SQL hint"
                  >
                    {copiedTable === table.tableName ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Section: Connection Tests ───────────────────────────────────────

function ConnectionTestsSection({ connectionTests, onRetest }: { connectionTests: ConnectionTest[]; onRetest: () => void }) {
  return (
    <motion.div variants={itemVariants}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2">
          <Wifi className="w-4 h-4 text-[#10B981]" />
          Connection Tests
        </h3>
        <button
          onClick={onRetest}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs bg-[--bg-surface] border border-[--border-subtle] text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-surface-2] transition-all"
        >
          <RefreshCw className="w-3 h-3" />
          Retest All
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {connectionTests.map(test => {
          const c = getStatusColor(test.status)
          return (
            <div key={test.name} className={`bg-[--bg-surface] border ${c.border} rounded-lg p-4`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {test.type === 'supabase' ? <Database className="w-3.5 h-3.5 text-[--text-muted]" />
                    : test.type === 'api' ? <Server className="w-3.5 h-3.5 text-[--text-muted]" />
                      : test.type === 'storage' ? <HardDrive className="w-3.5 h-3.5 text-[--text-muted]" />
                        : <Wifi className="w-3.5 h-3.5 text-[--text-muted]" />}
                  <span className="text-xs font-medium text-[--text-primary]">{test.name}</span>
                </div>
                {test.status === 'pass' ? <LivePulseDot color={c.dot} /> : <span className={`w-2 h-2 rounded-full ${c.dot}`} />}
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs ${c.text} capitalize font-medium`}>{test.status}</span>
                <span className="text-[10px] text-[--text-muted]">{test.latency}ms</span>
              </div>
              <p className="text-[10px] text-[--text-muted] truncate" title={test.message}>{test.message}</p>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ─── Section: Performance Metrics (Enhanced) ─────────────────────────

function PerformanceMetricsSection({ metrics }: { metrics: PerformanceMetric[] }) {
  return (
    <motion.div variants={itemVariants}>
      <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-[--status-warning]" />
        Performance Metrics
      </h3>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map(metric => {
          const c = getStatusColor(metric.status)
          const pct = Math.min((metric.value / metric.threshold) * 100, 100)

          const trendIcon = metric.trend === 'up'
            ? <TrendingUp className="w-3 h-3 text-[--text-secondary]" />
            : metric.trend === 'down'
              ? <TrendingDown className="w-3 h-3 text-[--status-danger]/60" />
              : <Minus className="w-3 h-3 text-[--text-muted]" />

          return (
            <div key={metric.name} className={`relative overflow-hidden bg-[--bg-surface] border ${c.border} rounded-lg p-4`}>
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/[0.02] to-transparent pointer-events-none rounded-bl-full" />
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-[--text-muted] uppercase tracking-wider">{metric.name}</span>
                  {trendIcon}
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold text-[--text-primary] font-metric">{metric.value.toLocaleString()}</span>
                  <span className={`text-xs ${c.text}`}>{metric.unit}</span>
                </div>
                <div className="h-1.5 bg-[--bg-surface] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${metric.status === 'ok' ? 'bg-[#10B981]/60' : metric.status === 'warning' ? 'bg-[--status-warning]/60' : 'bg-[--status-danger-bg]'}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[9px] text-[--text-muted]">threshold: {metric.threshold}</span>
                  <span className={`text-[9px] ${c.text}`}>{metric.status}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ─── Section: Error Log (Enhanced with Live Mode + Charts) ───────────

function ErrorLogSection() {
  const [errors, setErrors] = useState<CapturedError[]>(() => getCapturedErrors())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [liveMode, setLiveMode] = useState(false)
  const [monitorStats, setMonitorStats] = useState<ErrorMonitorStats | null>(() => getErrorMonitorStats())
  const [errorTrend, setErrorTrend] = useState<{ hour: string; count: number }[]>(() => getErrorTrend())
  const [severityDist, setSeverityDist] = useState<{ severity: MonitorSeverity; count: number; percentage: number }[]>(() => getSeverityDistribution())

  const loadErrors = useCallback(() => {
    setErrors(getCapturedErrors())
    setMonitorStats(getErrorMonitorStats())
    setErrorTrend(getErrorTrend())
    setSeverityDist(getSeverityDistribution())
  }, [])

  useEffect(() => {
    const interval = setInterval(loadErrors, liveMode ? 2000 : 30000)
    return () => clearInterval(interval)
  }, [liveMode, loadErrors])

  // Subscribe to live errors
  useEffect(() => {
    if (!liveMode) return
    const unsubscribe = onErrorCaptured(() => {
      loadErrors()
    })
    return unsubscribe
  }, [liveMode, loadErrors])

  const filteredErrors = useMemo(() => {
    if (severityFilter === 'all') return errors
    return errors.filter(e => e.severity === severityFilter)
  }, [errors, severityFilter])

  const handleClear = () => {
    clearCapturedErrors()
    clearMonitoredErrors()
    setErrors([])
    setMonitorStats(null)
  }

  const handleExport = () => {
    const data = JSON.stringify(errors, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `usra-error-log-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <motion.div variants={itemVariants} className="space-y-4">
      {/* Error Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[--bg-surface] border border-[--status-danger-border] rounded-lg p-3">
          <div className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1">Total Errors</div>
          <div className="text-xl font-bold text-[--text-primary] font-metric">{monitorStats?.totalErrors ?? errors.length}</div>
        </div>
        <div className="bg-[--bg-surface] border border-[--status-warning-border] rounded-lg p-3">
          <div className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1">Errors/Hour</div>
          <div className="text-xl font-bold text-[--status-warning] font-metric">{monitorStats?.errorsPerHour ?? 0}</div>
        </div>
        <div className="bg-[--bg-surface] border border-[--status-danger-border] rounded-lg p-3">
          <div className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1">Critical</div>
          <div className="text-xl font-bold text-[--status-danger] font-metric">{monitorStats?.criticalCount ?? 0}</div>
        </div>
        <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-3">
          <div className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1">Live Count</div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#10B981] font-metric">{getLiveErrorCount()}</span>
            <LivePulseDot />
          </div>
        </div>
      </div>

      {/* Error Trend + Severity Distribution */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] text-[--text-muted] uppercase tracking-wider">Error Trend (24h)</h4>
            <TrendingUp className="w-3 h-3 text-[--text-muted]" />
          </div>
          <SparklineChart data={errorTrend.map(t => t.count)} height={40} color="#ef4444" />
          <div className="flex items-center justify-between mt-1">
            <span className="text-[9px] text-[--text-muted]">{errorTrend[0]?.hour}</span>
            <span className="text-[9px] text-[--text-muted]">{errorTrend[errorTrend.length - 1]?.hour}</span>
          </div>
        </div>
        <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] text-[--text-muted] uppercase tracking-wider">Severity Distribution</h4>
            <AlertTriangle className="w-3 h-3 text-[--text-muted]" />
          </div>
          <SeverityDonut distribution={severityDist} />
        </div>
      </div>

      {/* Error List Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[--status-danger]" />
          Client Error Log
          {errors.length > 0 && (
            <span className="px-2 py-0.5 rounded text-[10px] bg-[--status-danger-bg] text-[--status-danger] border border-[--status-danger-border]">
              {errors.length}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {/* Live Mode Toggle */}
          <button
            onClick={() => setLiveMode(!liveMode)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all ${
              liveMode
                ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20'
                : 'bg-[--bg-surface] text-[--text-muted] border border-[--border-subtle] hover:text-[--text-secondary]'
            }`}
          >
            {liveMode ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {liveMode ? 'Live' : 'Live Mode'}
            {liveMode && <LivePulseDot color="bg-[#10B981]" />}
          </button>
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg text-xs text-[--text-muted] px-2 py-1 focus:outline-none focus:border-[#10B981]/30"
          >
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
          </select>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleClear}
          disabled={errors.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[--status-danger-bg] border border-[--status-danger-border] text-[--status-danger] hover:bg-[--status-danger-bg] transition-all disabled:opacity-30"
        >
          <Trash2 className="w-3 h-3" />
          Clear All Errors
        </button>
        <button
          onClick={handleExport}
          disabled={errors.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[--bg-surface] border border-[--border-subtle] text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-surface-2] transition-all disabled:opacity-30"
        >
          <Download className="w-3 h-3" />
          Export Error Log
        </button>
      </div>

      {/* Error List */}
      <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg overflow-hidden">
        {filteredErrors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="w-8 h-8 text-[--text-muted] mb-2" />
            <p className="text-sm text-[--text-muted]">No client errors captured</p>
            <p className="text-[10px] text-[--text-muted] mt-1">Errors will appear here as they occur in the browser</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {filteredErrors.map(err => {
              const sc = getStatusColor(err.severity === 'critical' ? 'critical' : err.severity === 'error' ? 'fail' : 'warning')
              const isExpanded = expandedId === err.id
              return (
                <div key={err.id} className="border-b border-[--border-subtle]">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : err.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[--bg-surface] transition-colors text-left"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
                    <span className="text-xs text-[--text-secondary] flex-1 truncate font-metric">{err.message}</span>
                    <span className="text-[10px] text-[--text-muted] shrink-0">{err.source}</span>
                    <span className="text-[10px] text-[--text-muted] shrink-0">{timeAgo(err.timestamp)}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3 text-[--text-muted]" /> : <ChevronDown className="w-3 h-3 text-[--text-muted]" />}
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 pl-9">
                          <div className="bg-[--bg-primary] rounded-lg p-3 font-metric text-[11px] text-[--text-muted] space-y-1">
                            <div><span className="text-[--text-muted]">Message:</span> {err.message}</div>
                            <div><span className="text-[--text-muted]">Source:</span> {err.source}</div>
                            <div><span className="text-[--text-muted]">Severity:</span> <span className={sc.text}>{err.severity}</span></div>
                            <div><span className="text-[--text-muted]">Time:</span> {new Date(err.timestamp).toLocaleString()}</div>
                            {err.stack && (
                              <div className="mt-2">
                                <span className="text-[--text-muted]">Stack Trace:</span>
                                <pre className="mt-1 text-[10px] text-[--text-muted] whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar">{err.stack}</pre>
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
      </div>
    </motion.div>
  )
}

// ─── Section: Bug Reporter ───────────────────────────────────────────

function BugReporterSection({ onSubmit }: { onSubmit: (bug: { title: string; description: string; severity: BugSeverity; source: string; errorType: string; stackTrace: string }) => Promise<void> }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<BugSeverity>('medium')
  const [source, setSource] = useState('')
  const [errorType, setErrorType] = useState('')
  const [stackTrace, setStackTrace] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSubmitting(true)
    try {
      await onSubmit({ title: title.trim(), description: description.trim(), severity, source: source.trim(), errorType: errorType.trim(), stackTrace: stackTrace.trim() })
      setTitle('')
      setDescription('')
      setSeverity('medium')
      setSource('')
      setErrorType('')
      setStackTrace('')
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3000)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div variants={itemVariants}>
      <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2 mb-3">
        <Bug className="w-4 h-4 text-[--status-danger]" />
        Report a Bug
      </h3>

      <form onSubmit={handleSubmit} className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Brief description of the bug"
              required
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/30"
            />
          </div>

          <div>
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Severity</label>
            <select
              value={severity}
              onChange={e => setSeverity(e.target.value as BugSeverity)}
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#10B981]/30"
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Error Type</label>
            <select
              value={errorType}
              onChange={e => setErrorType(e.target.value)}
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#10B981]/30"
            >
              <option value="">Select type...</option>
              <option value="TypeError">TypeError</option>
              <option value="NetworkError">NetworkError</option>
              <option value="AuthError">AuthError</option>
              <option value="DatabaseError">DatabaseError</option>
              <option value="UIError">UI / Render Error</option>
              <option value="Performance">Performance</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Source / Page</label>
            <input
              type="text"
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="e.g., dashboard, settings, admin/bugs"
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/30"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the bug, steps to reproduce, expected vs actual behavior..."
              rows={3}
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/30 resize-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Stack Trace (optional)</label>
            <textarea
              value={stackTrace}
              onChange={e => setStackTrace(e.target.value)}
              placeholder="Paste stack trace if available..."
              rows={3}
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-[11px] text-[--text-secondary] font-metric placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/30 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-[--text-primary] text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Submit Bug Report
          </button>
          {submitted && (
            <span className="flex items-center gap-1 text-xs text-[#10B981]">
              <CheckCircle className="w-3 h-3" /> Report submitted
            </span>
          )}
        </div>
      </form>
    </motion.div>
  )
}

// ─── Section: Bug Reports List ───────────────────────────────────────

function BugReportsListSection({ bugReports }: { bugReports: BugReport[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <motion.div variants={itemVariants}>
      <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2 mb-3">
        <Terminal className="w-4 h-4 text-[--status-warning]" />
        Bug Reports
        {bugReports.length > 0 && (
          <span className="px-2 py-0.5 rounded text-[10px] bg-[--status-warning-bg] text-[--status-warning] border border-[--status-warning-border]">
            {bugReports.length}
          </span>
        )}
      </h3>

      <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg overflow-hidden">
        {bugReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bug className="w-8 h-8 text-[--text-muted] mb-2" />
            <p className="text-sm text-[--text-muted]">No bug reports</p>
            <p className="text-[10px] text-[--text-muted] mt-1">Use the form above to report a bug</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {bugReports.map(report => {
              const sc = getSeverityColor(report.severity)
              const stc = getStatusBadgeColor(report.status)
              const isExpanded = expandedId === report.id
              return (
                <div key={report.id} className="border-b border-[--border-subtle]">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : report.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[--bg-surface] transition-colors text-left"
                  >
                    <span className={`px-1.5 py-0.5 rounded text-[9px] ${sc.bg} ${sc.text} border ${sc.border}`}>{report.severity}</span>
                    <span className="text-xs text-[--text-secondary] flex-1 truncate">{report.title}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] ${stc.bg} ${stc.text} border ${stc.border}`}>{report.status}</span>
                    <span className="text-[10px] text-[--text-muted] shrink-0">{timeAgo(report.reportedAt)}</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3 text-[--text-muted]" /> : <ChevronDown className="w-3 h-3 text-[--text-muted]" />}
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-3 pl-9">
                          <div className="bg-[--bg-primary] rounded-lg p-3 text-[11px] text-[--text-muted] space-y-1.5">
                            {report.description && <div><span className="text-[--text-muted]">Description:</span> {report.description}</div>}
                            <div><span className="text-[--text-muted]">Source:</span> {report.source}</div>
                            <div><span className="text-[--text-muted]">Error Type:</span> {report.errorType}</div>
                            <div><span className="text-[--text-muted]">Reported By:</span> {report.reportedBy}</div>
                            <div><span className="text-[--text-muted]">Reported At:</span> {new Date(report.reportedAt).toLocaleString()}</div>
                            {report.assignedTo && <div><span className="text-[--text-muted]">Assigned To:</span> {report.assignedTo}</div>}
                            {report.resolvedAt && <div><span className="text-[--text-muted]">Resolved At:</span> {new Date(report.resolvedAt).toLocaleString()}</div>}
                            {report.stackTrace && (
                              <div className="mt-2">
                                <span className="text-[--text-muted]">Stack Trace:</span>
                                <pre className="mt-1 text-[10px] text-[--text-muted] font-metric whitespace-pre-wrap max-h-40 overflow-y-auto custom-scrollbar bg-[--bg-primary] rounded p-2">{report.stackTrace}</pre>
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
      </div>
    </motion.div>
  )
}

// ─── NEW Tab: Performance Monitor ────────────────────────────────────

function PerformanceMonitorTab({ bugApiMetrics }: { bugApiMetrics: PerformanceMetric[] }) {
  const [perfData, setPerfData] = useState<PerformanceAPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [clientPerf, setClientPerf] = useState<PerformanceSnapshot | null>(null)

  const fetchPerfData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/performance', { credentials: 'same-origin' })
      if (res.ok) {
        const json = await safeJsonResponse(res)
        setPerfData(json)
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPerfData()
    setClientPerf(getPerformanceSnapshot())

    // Refresh client performance
    const interval = setInterval(() => {
      setClientPerf(refreshPerformanceSnapshot())
    }, 15000)

    // Refresh API data every 30s
    const apiInterval = setInterval(fetchPerfData, 30000)

    return () => {
      clearInterval(interval)
      clearInterval(apiInterval)
    }
  }, [fetchPerfData])

  const apiResponseTime = perfData?.metrics?.apiResponseTime
  const errorRateTrend = perfData?.errorRate?.trend || []
  const slowQueries = perfData?.slowQueries || []
  const dbUsage = perfData?.dbUsage
  const uptime = perfData?.uptime

  // Page load gauge value
  const pageLoadMs = clientPerf?.pageLoadTime ?? perfData?.metrics?.pageLoadTime ?? 0

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Page Load Gauge */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2 mb-3">
          <Gauge className="w-4 h-4 text-[#10B981]" />
          Page Performance
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Page Load', value: clientPerf?.pageLoadTime, unit: 'ms', threshold: 3000, status: (clientPerf?.pageLoadTime ?? 0) > 3000 ? 'critical' : (clientPerf?.pageLoadTime ?? 0) > 1500 ? 'warning' : 'ok' },
            { label: 'DOM Ready', value: clientPerf?.domReadyTime, unit: 'ms', threshold: 2000, status: (clientPerf?.domReadyTime ?? 0) > 2000 ? 'critical' : (clientPerf?.domReadyTime ?? 0) > 1000 ? 'warning' : 'ok' },
            { label: 'First Paint', value: clientPerf?.firstPaint, unit: 'ms', threshold: 1800, status: (clientPerf?.firstPaint ?? 0) > 1800 ? 'critical' : (clientPerf?.firstPaint ?? 0) > 1000 ? 'warning' : 'ok' },
            { label: 'First Contentful Paint', value: clientPerf?.firstContentfulPaint, unit: 'ms', threshold: 1800, status: (clientPerf?.firstContentfulPaint ?? 0) > 1800 ? 'critical' : (clientPerf?.firstContentfulPaint ?? 0) > 1000 ? 'warning' : 'ok' },
          ].map(m => {
            const c = getStatusColor(m.status as 'ok' | 'warning' | 'critical')
            const val = m.value ?? 0
            const pct = Math.min((val / m.threshold) * 100, 100)
            return (
              <div key={m.label} className={`relative overflow-hidden bg-[--bg-surface] border ${c.border} rounded-lg p-4`}>
                <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-white/[0.02] to-transparent pointer-events-none rounded-bl-full" />
                <span className="text-[10px] text-[--text-muted] uppercase tracking-wider">{m.label}</span>
                <div className="flex items-baseline gap-1 mt-1 mb-2">
                  <span className="text-2xl font-bold text-[--text-primary] font-metric">{val || '—'}</span>
                  {val > 0 && <span className={`text-xs ${c.text}`}>{m.unit}</span>}
                </div>
                {val > 0 && (
                  <div className="h-1.5 bg-[--bg-surface] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${m.status === 'ok' ? 'bg-[#10B981]/60' : m.status === 'warning' ? 'bg-[--status-warning]/60' : 'bg-[--status-danger-bg]'}`} style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* API Response Time */}
      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2 mb-3">
          <Server className="w-4 h-4 text-[#10B981]" />
          API Response Times
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Average', value: apiResponseTime?.avg ?? 0, color: 'text-[#10B981]' },
            { label: 'P50', value: apiResponseTime?.p50 ?? 0, color: 'text-[#10B981]' },
            { label: 'P95', value: apiResponseTime?.p95 ?? 0, color: 'text-[--status-warning]' },
            { label: 'P99', value: apiResponseTime?.p99 ?? 0, color: 'text-[--status-danger]' },
          ].map(m => (
            <div key={m.label} className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-4">
              <span className="text-[10px] text-[--text-muted] uppercase tracking-wider">{m.label}</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-bold text-[--text-primary] font-metric">{m.value}</span>
                <span className={`text-xs ${m.color}`}>ms</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Error Rate Trend + Uptime */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] text-[--text-muted] uppercase tracking-wider">Error Rate (24h)</h4>
            <BarChart3 className="w-3 h-3 text-[--text-muted]" />
          </div>
          <SparklineChart data={errorRateTrend.map(t => t.count)} height={48} color="#ef4444" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-[--text-muted]">{perfData?.errorRate?.errorsLast24h ?? 0} errors (24h)</span>
            <span className="text-[10px] text-[--text-secondary]">{perfData?.errorRate?.resolutionRate ?? 100}% resolved</span>
          </div>
        </div>
        <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] text-[--text-muted] uppercase tracking-wider">System Uptime</h4>
            {uptime?.status === 'healthy' ? <LivePulseDot /> : <AlertCircle className="w-3 h-3 text-[--text-muted]" />}
          </div>
          <div className="text-4xl font-bold text-[--text-primary] font-metric mt-2">
            {uptime?.percentage.toFixed(2) ?? '100.00'}%
          </div>
          <div className="mt-2 h-2 bg-[--bg-surface] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                (uptime?.percentage ?? 100) >= 99.5 ? 'bg-[#10B981]/60'
                  : (uptime?.percentage ?? 100) >= 95 ? 'bg-[--status-warning]/60'
                    : 'bg-[--status-danger-bg]'
              }`}
              style={{ width: `${uptime?.percentage ?? 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[9px] text-[--text-muted]">Last checked: {uptime ? timeAgo(uptime.lastChecked) : 'n/a'}</span>
            <span className={`text-[9px] ${(uptime?.percentage ?? 100) >= 99.5 ? 'text-[#10B981]' : (uptime?.percentage ?? 100) >= 95 ? 'text-[--status-warning]' : 'text-[--status-danger]'}`}>
              {uptime?.status ?? 'healthy'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Memory/DB Usage + Slow Queries */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-4">
          <h4 className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Database className="w-3 h-3 text-[--text-muted]" />
            DB Usage
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[--text-muted]">Total Rows</span>
              <span className="text-xs text-[--text-primary] font-metric">{dbUsage?.totalRows.toLocaleString() ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[--text-muted]">Tables Measured</span>
              <span className="text-xs text-[--text-primary] font-metric">{dbUsage?.tablesMeasured ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[--text-muted]">Estimated Size</span>
              <span className="text-xs text-[--text-primary] font-metric">{dbUsage?.estimatedSizeMB ?? 0} MB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[--text-muted]">Growth Rate</span>
              <span className="text-xs text-[#10B981] flex items-center gap-1">
                {dbUsage?.growthRate === 'stable' && <Minus className="w-3 h-3" />}
                {dbUsage?.growthRate === 'up' && <TrendingUp className="w-3 h-3" />}
                {dbUsage?.growthRate === 'down' && <TrendingDown className="w-3 h-3" />}
                {dbUsage?.growthRate ?? 'stable'}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-4">
          <h4 className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-3 h-3 text-[--text-muted]" />
            Slow Queries (&gt;1s)
          </h4>
          {slowQueries.length === 0 ? (
            <div className="flex items-center justify-center py-6">
              <CheckCircle className="w-5 h-5 text-[--text-muted] mr-2" />
              <span className="text-xs text-[--text-muted]">No slow queries detected</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
              {slowQueries.map(q => (
                <div key={q.id} className="flex items-center justify-between py-1.5 border-b border-[--border-subtle] last:border-0">
                  <span className="text-[10px] text-[--text-muted] font-metric truncate flex-1">{q.name}</span>
                  <span className="text-[10px] text-[--status-danger] font-metric ml-2">{q.durationMs}ms</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── NEW Tab: Auto-Heal ──────────────────────────────────────────────

function AutoHealTab() {
  const [results, setResults] = useState<HealActionResult[]>([])
  const [running, setRunning] = useState<string | null>(null)
  const [lastRun, setLastRun] = useState<string | null>(null)

  const healActions = [
    {
      id: 'clear_stale_sessions',
      title: 'Clear Stale Sessions',
      description: 'Remove expired sessions from user_sessions table',
      icon: <Shield className="w-4 h-4" />,
      risk: 'low' as const,
      color: 'text-[#10B981]',
    },
    {
      id: 'resolve_old_errors',
      title: 'Resolve Old Errors',
      description: 'Mark error_logs older than 30 days as resolved',
      icon: <CheckCircle className="w-4 h-4" />,
      risk: 'low' as const,
      color: 'text-[#10B981]',
    },
    {
      id: 'cleanup_orphaned_data',
      title: 'Cleanup Orphaned Data',
      description: 'Remove orphaned records (family_members without families, etc.)',
      icon: <Trash2 className="w-4 h-4" />,
      risk: 'medium' as const,
      color: 'text-[--status-warning]',
    },
    {
      id: 'reset_stuck_jobs',
      title: 'Reset Stuck Jobs',
      description: 'Reset stuck/in-progress moderation items back to pending',
      icon: <RotateCcw className="w-4 h-4" />,
      risk: 'medium' as const,
      color: 'text-[--status-warning]',
    },
    {
      id: 'vacuum_database',
      title: 'Vacuum Database',
      description: 'Analyze key tables and optimize query plans',
      icon: <Database className="w-4 h-4" />,
      risk: 'low' as const,
      color: 'text-[#0D9488]',
    },
    {
      id: 'recalculate_trust_scores',
      title: 'Recalculate Trust Scores',
      description: 'Trigger trust score recalculation for users with stale scores',
      icon: <Heart className="w-4 h-4" />,
      risk: 'medium' as const,
      color: 'text-[--status-danger]',
    },
  ]

  const runAction = async (actionId: string) => {
    setRunning(actionId)
    try {
      const res = await fetch('/api/admin/auto-heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: actionId }),
      })

      if (!res.ok) {
        const err = await safeJsonResponse(res)
        setResults(prev => [{
          action: actionId,
          affected_rows: 0,
          success: false,
          message: err.error || 'Failed to execute action',
          duration_ms: 0,
        }, ...prev])
      } else {
        const data = await safeJsonResponse(res)
        const result = data.results ? data.results[0] : data
        setResults(prev => [result, ...prev])
      }
      setLastRun(new Date().toISOString())
    } catch {
      setResults(prev => [{
        action: actionId,
        affected_rows: 0,
        success: false,
        message: 'Network error',
        duration_ms: 0,
      }, ...prev])
    } finally {
      setRunning(null)
    }
  }

  const runAllActions = async () => {
    setRunning('run_all')
    try {
      const res = await fetch('/api/admin/auto-heal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'run_all' }),
      })

      if (res.ok) {
        const data = await safeJsonResponse(res)
        if (data.results) {
          setResults(prev => [...data.results, ...prev])
        }
      }
      setLastRun(new Date().toISOString())
    } catch {
      // Silently fail
    } finally {
      setRunning(null)
    }
  }

  const riskColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low': return 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/20'
      case 'medium': return 'text-[--status-warning] bg-[--status-warning-bg] border-[--status-warning-border]'
      case 'high': return 'text-[--status-danger] bg-[--status-danger-bg] border-[--status-danger-border]'
    }
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[--status-warning]" />
            Auto-Heal Actions
          </h3>
          {lastRun && (
            <p className="text-[10px] text-[--text-muted] mt-1">Last run: {timeAgo(lastRun)}</p>
          )}
        </div>
        <button
          onClick={runAllActions}
          disabled={running !== null}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#10B981] to-[#10B981] text-[--text-primary] text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {running === 'run_all' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          Run All Actions
        </button>
      </motion.div>

      {/* Actions Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {healActions.map(action => {
          const isRunning = running === action.id
          const result = results.find(r => r.action === action.id)

          return (
            <div key={action.id} className="relative overflow-hidden bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-4 hover:border-[--border-subtle] transition-all">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-white/[0.01] to-transparent pointer-events-none rounded-bl-full" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-8 h-8 rounded-lg bg-[--bg-surface] flex items-center justify-center ${action.color}`}>
                    {action.icon}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] border ${riskColor(action.risk)}`}>
                    {action.risk} risk
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-[--text-primary] mb-1">{action.title}</h4>
                <p className="text-[10px] text-[--text-muted] mb-3 leading-relaxed">{action.description}</p>
                <button
                  onClick={() => runAction(action.id)}
                  disabled={running !== null}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[--bg-surface] border border-[--border-subtle] text-xs text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-surface-2] transition-all disabled:opacity-30"
                >
                  {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  {isRunning ? 'Running...' : 'Run'}
                </button>
              </div>
            </div>
          )
        })}
      </motion.div>

      {/* Results */}
      {results.length > 0 && (
        <motion.div variants={itemVariants}>
          <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2 mb-3">
            <Terminal className="w-4 h-4 text-[#10B981]" />
            Results
            <span className="px-2 py-0.5 rounded text-[10px] bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
              {results.length}
            </span>
          </h3>
          <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg overflow-hidden">
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {results.map((result, i) => (
                <div key={`${result.action}-${i}`} className="flex items-center gap-3 px-4 py-3 border-b border-[--border-subtle]">
                  {result.success
                    ? <CheckCircle className="w-4 h-4 text-[#10B981] shrink-0" />
                    : <XCircle className="w-4 h-4 text-[--status-danger] shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-[--text-primary]">{result.action.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-[--text-muted]">{result.duration_ms}ms</span>
                    </div>
                    <p className="text-[10px] text-[--text-muted] truncate">{result.message}</p>
                  </div>
                  <span className={`text-xs font-metric shrink-0 ${result.affected_rows > 0 ? 'text-[--status-warning]' : 'text-[--text-muted]'}`}>
                    {result.affected_rows} rows
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

// ─── Section: API Route Health Check ────────────────────────────────

interface APIRouteHealth {
  path: string
  method: string
  name: string
  category: 'analytics' | 'operations' | 'business' | 'core'
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  responseTime: number | null
  statusCode: number | null
  lastTested: string | null
  error: string | null
}

interface APIHealthSummary {
  total: number
  healthy: number
  degraded: number
  down: number
  avgResponseTime: number
}

interface ClientAPIFailure {
  id: string
  path: string
  method: string
  statusCode: number | null
  error: string
  timestamp: string
  responseTime: number
}

// Client-side failure tracker (module-level store)
const clientFailureLog: ClientAPIFailure[] = []
const MAX_FAILURE_LOG = 100

function logClientAPIFailure(failure: Omit<ClientAPIFailure, 'id'>) {
  const entry: ClientAPIFailure = {
    ...failure,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  }
  clientFailureLog.unshift(entry)
  if (clientFailureLog.length > MAX_FAILURE_LOG) {
    clientFailureLog.pop()
  }
}

function getClientFailures(): ClientAPIFailure[] {
  return [...clientFailureLog]
}

function clearClientFailures() {
  clientFailureLog.length = 0
}

function getCategoryBadgeStyle(category: string) {
  switch (category) {
    case 'analytics': return 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'
    case 'operations': return 'bg-[--status-warning-bg] text-[--status-warning] border-[--status-warning-border]'
    case 'business': return 'bg-[--status-danger-bg] text-[--status-danger] border-[--status-danger-border]'
    case 'core': return 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'
    default: return 'bg-[--bg-surface] text-[--text-muted] border-[--border-subtle]'
  }
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'analytics': return <BarChart3 className="w-3.5 h-3.5" />
    case 'operations': return <Server className="w-3.5 h-3.5" />
    case 'business': return <Globe className="w-3.5 h-3.5" />
    case 'core': return <Shield className="w-3.5 h-3.5" />
    default: return <Activity className="w-3.5 h-3.5" />
  }
}

function getResponseTimeColor(ms: number | null) {
  if (ms === null) return 'text-[--text-muted]'
  if (ms < 200) return 'text-[#10B981]'
  if (ms < 500) return 'text-[--status-warning]'
  if (ms < 1500) return 'text-[--status-warning]'
  return 'text-[--status-danger]'
}

function ApiHealthTab() {
  const [routes, setRoutes] = useState<APIRouteHealth[]>([])
  const [summary, setSummary] = useState<APIHealthSummary | null>(null)
  const [testedAt, setTestedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'analytics' | 'operations' | 'business' | 'core'>('all')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [failures, setFailures] = useState<ClientAPIFailure[]>([])
  const [showFailures, setShowFailures] = useState(false)
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null)

  const testAllRoutes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/api-health?test=true', {
        credentials: 'same-origin',
      })
      if (!res.ok) {
        const errData = await safeJsonResponse(res).catch(() => ({}))
        throw new Error(errData.error || `HTTP ${res.status}`)
      }
      const json = await safeJsonResponse(res)
      if (json.data) {
        setRoutes(json.data.routes || [])
        setSummary(json.data.summary || null)
        setTestedAt(json.data.testedAt || new Date().toISOString())

        // Log any down/degraded routes as client-side failures
        const downRoutes = (json.data.routes || []).filter(
          (r: APIRouteHealth) => r.status === 'down' || r.status === 'degraded'
        )
        for (const route of downRoutes) {
          logClientAPIFailure({
            path: route.path,
            method: route.method,
            statusCode: route.statusCode,
            error: route.error || `Route ${route.status}`,
            timestamp: route.lastTested || new Date().toISOString(),
            responseTime: route.responseTime || 0,
          })
        }
        setFailures(getClientFailures())
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test API routes')
      logClientAPIFailure({
        path: '/api/admin/api-health',
        method: 'GET',
        statusCode: null,
        error: err instanceof Error ? err.message : 'Failed to test API routes',
        timestamp: new Date().toISOString(),
        responseTime: 0,
      })
      setFailures(getClientFailures())
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }, [])

  // Load route list on mount (without testing), then test
  useEffect(() => {
    const loadInitial = async () => {
      setInitialLoading(true)
      try {
        // First get the route list
        const listRes = await fetch('/api/admin/api-health', {
          credentials: 'same-origin',
        })
        if (listRes.ok) {
          const listJson = await safeJsonResponse(listRes)
          if (listJson.data) {
            setRoutes(listJson.data.routes || [])
          }
        }
      } catch {
        // ignore list load error
      }
      setInitialLoading(false)
      // Auto-test on first load
      testAllRoutes()
    }
    loadInitial()
  }, [testAllRoutes])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(testAllRoutes, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, testAllRoutes])

  // Refresh failure log periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setFailures(getClientFailures())
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const filteredRoutes = useMemo(() => {
    if (categoryFilter === 'all') return routes
    return routes.filter(r => r.category === categoryFilter)
  }, [routes, categoryFilter])

  // Group routes by category
  const groupedRoutes = useMemo(() => {
    const groups: Record<string, APIRouteHealth[]> = {}
    for (const route of filteredRoutes) {
      if (!groups[route.category]) groups[route.category] = []
      groups[route.category].push(route)
    }
    return groups
  }, [filteredRoutes])

  const categoryOrder = ['analytics', 'operations', 'business', 'core']

  const clearFailures = () => {
    clearClientFailures()
    setFailures([])
  }

  // Loading state for initial load
  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Server className="w-10 h-10 text-[--text-muted] mb-3" />
        <Loader2 className="w-6 h-6 text-[--text-muted] animate-spin mb-3" />
        <p className="text-sm text-[--text-muted] font-metric">Testing API routes...</p>
      </div>
    )
  }

  return (
    <motion.div variants={itemVariants} className="space-y-4">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-3">
            <div className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1">Total Routes</div>
            <div className="text-xl font-bold text-[--text-primary] font-metric">{summary.total}</div>
          </div>
          <div className="bg-[--bg-surface] border border-[#10B981]/10 rounded-lg p-3">
            <div className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1">Healthy</div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-[#10B981] font-metric">{summary.healthy}</span>
              {summary.total > 0 && (
                <span className="text-[10px] text-[--text-muted]">{Math.round((summary.healthy / summary.total) * 100)}%</span>
              )}
            </div>
          </div>
          <div className="bg-[--bg-surface] border border-[--status-warning-border] rounded-lg p-3">
            <div className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1">Degraded</div>
            <div className="text-xl font-bold text-[--status-warning] font-metric">{summary.degraded}</div>
          </div>
          <div className="bg-[--bg-surface] border border-[--status-danger-border] rounded-lg p-3">
            <div className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1">Down</div>
            <div className="text-xl font-bold text-[--status-danger] font-metric">{summary.down}</div>
          </div>
          <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-3">
            <div className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1">Avg Response</div>
            <div className="flex items-center gap-1.5">
              <span className={`text-xl font-bold font-metric ${getResponseTimeColor(summary.avgResponseTime)}`}>
                {summary.avgResponseTime}
              </span>
              <span className="text-[10px] text-[--text-muted]">ms</span>
            </div>
          </div>
        </div>
      )}

      {/* Summary Health Bar */}
      {summary && summary.total > 0 && (
        <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-[--text-muted] uppercase tracking-wider">Route Health Distribution</span>
            {testedAt && (
              <span className="text-[10px] text-[--text-muted] ml-auto">Tested {timeAgo(testedAt)}</span>
            )}
          </div>
          <div className="flex items-center gap-1 h-3 rounded-full overflow-hidden bg-[--bg-surface]">
            {summary.healthy > 0 && (
              <div className="bg-[#10B981]/60 h-full transition-all" style={{ width: `${(summary.healthy / summary.total) * 100}%` }} />
            )}
            {summary.degraded > 0 && (
              <div className="bg-[--status-warning]/60 h-full transition-all" style={{ width: `${(summary.degraded / summary.total) * 100}%` }} />
            )}
            {summary.down > 0 && (
              <div className="bg-[--status-danger-bg] h-full transition-all" style={{ width: `${(summary.down / summary.total) * 100}%` }} />
            )}
          </div>
          <div className="flex items-center gap-4 mt-1.5">
            <span className="flex items-center gap-1 text-[10px] text-[--text-secondary]">
              <span className="w-2 h-2 rounded-full bg-[#10B981]/60" /> Healthy
            </span>
            <span className="flex items-center gap-1 text-[10px] text-[--status-warning]/60">
              <span className="w-2 h-2 rounded-full bg-[--status-warning]/60" /> Degraded
            </span>
            <span className="flex items-center gap-1 text-[10px] text-[--status-danger]/60">
              <span className="w-2 h-2 rounded-full bg-[--status-danger-bg]" /> Down
            </span>
          </div>
        </div>
      )}

      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Filters */}
          {(['all', 'analytics', 'operations', 'business', 'core'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-lg text-xs transition-all ${
                categoryFilter === cat
                  ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20'
                  : 'bg-[--bg-surface] text-[--text-muted] border border-[--border-subtle] hover:text-[--text-secondary]'
              }`}
            >
              {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              {cat !== 'all' && (
                <span className="ml-1 text-[9px] text-[--text-muted]">
                  ({routes.filter(r => r.category === cat).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all ${
              autoRefresh
                ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20'
                : 'bg-[--bg-surface] text-[--text-muted] border border-[--border-subtle] hover:text-[--text-secondary]'
            }`}
          >
            {autoRefresh ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {autoRefresh ? 'Auto 30s' : 'Auto-Refresh'}
            {autoRefresh && <LivePulseDot color="bg-[#10B981]" />}
          </button>
          {/* Test All Button */}
          <button
            onClick={testAllRoutes}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/20 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
            Test All Routes
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-[--status-danger-bg] border border-[--status-danger-border] rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[--status-danger] shrink-0" />
          <span className="text-xs text-[--status-danger]">{error}</span>
        </div>
      )}

      {/* Routes by Category */}
      {categoryOrder.map(category => {
        const categoryRoutes = groupedRoutes[category]
        if (!categoryRoutes || categoryRoutes.length === 0) return null

        const catHealthy = categoryRoutes.filter(r => r.status === 'healthy').length
        const catDegraded = categoryRoutes.filter(r => r.status === 'degraded').length
        const catDown = categoryRoutes.filter(r => r.status === 'down').length
        const catUnknown = categoryRoutes.filter(r => r.status === 'unknown').length
        const catAvgTime = categoryRoutes.length > 0
          ? Math.round(categoryRoutes.reduce((s, r) => s + (r.responseTime || 0), 0) / categoryRoutes.filter(r => r.responseTime !== null).length || 1)
          : 0

        return (
          <div key={category}>
            {/* Category Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded flex items-center justify-center ${getCategoryBadgeStyle(category)}`}>
                  {getCategoryIcon(category)}
                </div>
                <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider">
                  {category}
                </h3>
                <span className="text-[10px] text-[--text-muted]">
                  {categoryRoutes.length} routes
                </span>
              </div>
              <div className="flex items-center gap-2">
                {catHealthy > 0 && <span className="text-[10px] text-[#10B981]">{catHealthy} ✓</span>}
                {catDegraded > 0 && <span className="text-[10px] text-[--status-warning]">{catDegraded} ⚠</span>}
                {catDown > 0 && <span className="text-[10px] text-[--status-danger]">{catDown} ✗</span>}
                {catUnknown > 0 && <span className="text-[10px] text-[--text-muted]">{catUnknown} ?</span>}
                {catAvgTime > 0 && (
                  <span className="text-[10px] text-[--text-muted] flex items-center gap-0.5">
                    <Timer className="w-2.5 h-2.5" />
                    {catAvgTime}ms avg
                  </span>
                )}
              </div>
            </div>

            {/* Route Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
              {categoryRoutes.map(route => {
                const sc = getStatusColor(route.status)
                const isExpanded = expandedRoute === route.path

                return (
                  <div key={route.path} className={`bg-[--bg-surface] border ${sc.border} rounded-lg overflow-hidden hover:bg-[--bg-surface-2] transition-colors`}>
                    <button
                      onClick={() => setExpandedRoute(isExpanded ? null : route.path)}
                      className="w-full text-left p-3"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          {route.status === 'healthy' ? (
                            <LivePulseDot color={sc.dot} />
                          ) : (
                            <span className={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
                          )}
                          <span className="text-xs font-medium text-[--text-primary] truncate">{route.name}</span>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border shrink-0 ${getCategoryBadgeStyle(route.category)}`}>
                          {route.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px]">
                        <span className={`capitalize font-medium ${sc.text}`}>{route.status}</span>
                        {route.responseTime !== null && (
                          <span className={getResponseTimeColor(route.responseTime)}>
                            {route.responseTime}ms
                          </span>
                        )}
                        {route.statusCode !== null && (
                          <span className="text-[--text-muted]">{route.statusCode}</span>
                        )}
                        {isExpanded ? <ChevronUp className="w-3 h-3 text-[--text-muted] ml-auto" /> : <ChevronDown className="w-3 h-3 text-[--text-muted] ml-auto" />}
                      </div>
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 border-t border-[--border-subtle] pt-2 space-y-1">
                            <div className="text-[10px] text-[--text-muted]">
                              <span className="text-[--text-muted]">Path:</span>{' '}
                              <span className="font-metric">{route.method} {route.path}</span>
                            </div>
                            {route.statusCode !== null && (
                              <div className="text-[10px] text-[--text-muted]">
                                <span className="text-[--text-muted]">Status Code:</span>{' '}
                                <span className="font-metric">{route.statusCode}</span>
                              </div>
                            )}
                            {route.responseTime !== null && (
                              <div className="text-[10px] text-[--text-muted]">
                                <span className="text-[--text-muted]">Response Time:</span>{' '}
                                <span className={`font-metric ${getResponseTimeColor(route.responseTime)}`}>{route.responseTime}ms</span>
                              </div>
                            )}
                            {route.lastTested && (
                              <div className="text-[10px] text-[--text-muted]">
                                <span className="text-[--text-muted]">Last Tested:</span>{' '}
                                {timeAgo(route.lastTested)}
                              </div>
                            )}
                            {route.error && (
                              <div className="text-[10px] text-[--status-danger]/70 bg-[--status-danger-bg] rounded px-2 py-1 mt-1 font-metric">
                                {route.error}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Empty State */}
      {routes.length === 0 && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Server className="w-8 h-8 text-[--text-muted] mb-2" />
          <p className="text-sm text-[--text-muted]">No API routes discovered</p>
          <p className="text-[10px] text-[--text-muted] mt-1">Click &quot;Test All Routes&quot; to scan and test API endpoints</p>
        </div>
      )}

      {/* API Route Failure Log */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[--status-warning]" />
            API Route Failure Log
            {failures.length > 0 && (
              <span className="px-2 py-0.5 rounded text-[10px] bg-[--status-danger-bg] text-[--status-danger] border border-[--status-danger-border]">
                {failures.length}
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFailures(!showFailures)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all ${
                showFailures
                  ? 'bg-[--status-warning-bg] text-[--status-warning] border border-[--status-warning-border]'
                  : 'bg-[--bg-surface] text-[--text-muted] border border-[--border-subtle] hover:text-[--text-secondary]'
              }`}
            >
              {showFailures ? <Eye className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {showFailures ? 'Hide' : 'Show'} Failures
            </button>
            <button
              onClick={clearFailures}
              disabled={failures.length === 0}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] bg-[--bg-surface] text-[--text-muted] border border-[--border-subtle] hover:text-[--status-danger] hover:border-[--status-danger-border] hover:bg-[--status-danger-bg] transition-all disabled:opacity-30"
            >
              <Trash2 className="w-2.5 h-2.5" />
              Clear
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showFailures && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg overflow-hidden">
                {failures.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle className="w-6 h-6 text-[--text-muted] mb-2" />
                    <p className="text-xs text-[--text-muted]">No API route failures recorded</p>
                    <p className="text-[10px] text-[--text-muted] mt-1">Failures will appear here when API routes return errors</p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    {/* Header */}
                    <div className="grid grid-cols-[1fr_60px_60px_80px_60px] gap-2 px-4 py-2 bg-[--bg-primary] border-b border-[--border-subtle] text-[10px] font-medium text-[--text-muted] uppercase tracking-wider">
                      <span>Route</span>
                      <span>Code</span>
                      <span>Time</span>
                      <span>Error</span>
                      <span>When</span>
                    </div>
                    {failures.map(failure => (
                      <div key={failure.id} className="grid grid-cols-[1fr_60px_60px_80px_60px] gap-2 px-4 py-2.5 border-b border-[--border-subtle] hover:bg-[--bg-surface] transition-colors items-center">
                        <span className="text-xs text-[--text-secondary] font-metric truncate">{failure.method} {failure.path}</span>
                        <span className={`text-xs font-metric ${failure.statusCode ? (failure.statusCode >= 500 ? 'text-[--status-danger]' : failure.statusCode >= 400 ? 'text-[--status-warning]' : 'text-[--text-muted]') : 'text-[--status-danger]'}`}>
                          {failure.statusCode || 'ERR'}
                        </span>
                        <span className={`text-xs font-metric ${getResponseTimeColor(failure.responseTime)}`}>
                          {failure.responseTime}ms
                        </span>
                        <span className="text-[10px] text-[--status-danger]/70 truncate" title={failure.error}>{failure.error}</span>
                        <span className="text-[10px] text-[--text-muted]">{timeAgo(failure.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────

export function AdminBugs() {
  const [apiData, setApiData] = useState<BugsAPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('health')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/bugs', {
        credentials: 'same-origin',
      })
      if (!mountedRef.current) return
      if (res.status === 401) {
        const { useAdminAuthStore } = await import('@/stores/admin-auth-store')
        useAdminAuthStore.getState().logoutAdmin()
        return
      }
      if (!res.ok) throw new Error('Failed to fetch bug detection data')
      const json = await safeJsonResponse(res)
      if (!mountedRef.current) return
      setApiData(json)
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchData])

  const handleBugReport = async (bug: { title: string; description: string; severity: BugSeverity; source: string; errorType: string; stackTrace: string }) => {
    const res = await fetch('/api/admin/bugs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(bug),
    })
    if (!res.ok) {
      const err = await safeJsonResponse(res)
      throw new Error(err.error || 'Failed to submit bug report')
    }
    await fetchData()
  }

  // Loading state
  if (loading && !apiData) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Bug className="w-10 h-10 text-[--status-danger]/30 mb-3" />
        <Loader2 className="w-6 h-6 text-[--status-danger]/50 animate-spin mb-3" />
        <p className="text-sm text-[--text-muted] font-metric">Running diagnostics...</p>
      </div>
    )
  }

  // Error state
  if (error && !apiData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="w-12 h-12 text-[--status-warning] mb-4" />
        <h3 className="text-lg font-medium text-[--text-primary] mb-2">Failed to load data</h3>
        <p className="text-sm text-[--text-muted] mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-[#0D9488] text-white rounded-lg hover:bg-[#0D9488]/80 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  const data = apiData!

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'health', label: 'System Health', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'errors', label: 'Error Log', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    { id: 'performance', label: 'Performance', icon: <Gauge className="w-3.5 h-3.5" /> },
    { id: 'autoheal', label: 'Auto-Heal', icon: <Wrench className="w-3.5 h-3.5" /> },
    { id: 'apihealth', label: 'API Health', icon: <Server className="w-3.5 h-3.5" /> },
    { id: 'report', label: 'Report Bug', icon: <Bug className="w-3.5 h-3.5" /> },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ── Overall Health Banner ─────────────────────────────────── */}
      <OverallHealthBanner
        status={data.overallStatus}
        healthChecks={data.healthChecks}
        lastUpdated={data.lastUpdated}
        onRefresh={fetchData}
        isLoading={loading}
        autoRefresh={autoRefresh}
      />

      {/* ── Auto-Refresh Toggle ───────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] transition-all ${
              autoRefresh
                ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20'
                : 'bg-[--bg-surface] text-[--text-muted] border border-[--border-subtle]'
            }`}
          >
            {autoRefresh ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
            Auto-refresh 30s
            {autoRefresh && <LivePulseDot color="bg-[#10B981]" />}
          </button>
        </div>
        {/* Quick Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              clearCapturedErrors()
              clearMonitoredErrors()
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] bg-[--bg-surface] text-[--text-muted] border border-[--border-subtle] hover:text-[--status-danger] hover:border-[--status-danger-border] hover:bg-[--status-danger-bg] transition-all"
          >
            <Trash2 className="w-2.5 h-2.5" />
            Clear Errors
          </button>
          <button
            onClick={fetchData}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] bg-[--bg-surface] text-[--text-muted] border border-[--border-subtle] hover:text-[#10B981] hover:border-[#10B981]/20 hover:bg-[#10B981]/5 transition-all"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${loading ? 'animate-spin' : ''}`} />
            Diagnostics
          </button>
        </div>
      </div>

      {/* ── Tab Navigation ────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all flex-1 justify-center whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#10B981]/10 text-[#10B981]'
                : 'text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-surface]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ───────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'health' && (
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
              <HealthCheckCards healthChecks={data.healthChecks} />
              <DatabaseTableStatusSection tableStatuses={data.tableStatuses} />
              <ConnectionTestsSection connectionTests={data.connectionTests} onRetest={fetchData} />
              <PerformanceMetricsSection metrics={data.performanceMetrics} />
              <BugReportsListSection bugReports={data.bugReports} />
            </motion.div>
          )}

          {activeTab === 'errors' && <ErrorLogSection />}

          {activeTab === 'performance' && <PerformanceMonitorTab bugApiMetrics={data.performanceMetrics} />}

          {activeTab === 'autoheal' && <AutoHealTab />}

          {activeTab === 'apihealth' && <ApiHealthTab />}

          {activeTab === 'report' && (
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
              <BugReporterSection onSubmit={handleBugReport} />
              <BugReportsListSection bugReports={data.bugReports} />
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
