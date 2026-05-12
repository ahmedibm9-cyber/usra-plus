'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bug, AlertTriangle, CheckCircle, XCircle, Activity, Clock,
  Search, Filter, RefreshCw, Loader2, ChevronDown, ChevronUp,
  Shield, Globe, Database, Cpu, MemoryStick, Zap, TrendingUp,
  AlertCircle, Info, ArrowUpRight, X, Plus, Send, Monitor,
  Server, Wifi, WifiOff, Eye, Ban, ArrowUp, Trash2, BarChart3,
  FileWarning, Layers
} from 'lucide-react'
import { useBugDetectionStore, installGlobalErrorCapture } from '@/stores/bug-detection-store'
import type {
  CapturedError, ErrorSeverity, ErrorType, ErrorStatus,
  HealthCheck, HealthStatus, BugCategory, BugReport
} from '@/stores/bug-detection-store'

// ─── Animation Variants ──────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
}

// ─── Severity Helpers ─────────────────────────────────────────────────

const severityConfig: Record<ErrorSeverity, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  critical: { color: 'text-[--status-danger]', bg: 'bg-[--status-danger-bg]', border: 'border-[--status-danger-border]', icon: <XCircle className="w-3.5 h-3.5" />, label: 'Critical' },
  error: { color: 'text-[--status-warning]', bg: 'bg-[--status-warning-bg]', border: 'border-[--status-warning-border]', icon: <AlertCircle className="w-3.5 h-3.5" />, label: 'Error' },
  warning: { color: 'text-[--status-warning]', bg: 'bg-[--status-warning-bg]', border: 'border-[--status-warning-border]', icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Warning' },
  info: { color: 'text-[--status-info]', bg: 'bg-[--status-info-bg]', border: 'border-[--status-info-border]', icon: <Info className="w-3.5 h-3.5" />, label: 'Info' },
}

const healthStatusConfig: Record<HealthStatus, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
  healthy: { color: 'text-[--status-success]', bg: 'bg-[--status-success-bg]', border: 'border-[--status-success-border]', icon: <CheckCircle className="w-4 h-4" />, label: 'Healthy' },
  degraded: { color: 'text-[--status-warning]', bg: 'bg-[--status-warning-bg]', border: 'border-[--status-warning-border]', icon: <AlertTriangle className="w-4 h-4" />, label: 'Degraded' },
  down: { color: 'text-[--status-danger]', bg: 'bg-[--status-danger-bg]', border: 'border-[--status-danger-border]', icon: <XCircle className="w-4 h-4" />, label: 'Down' },
  unknown: { color: 'text-[--text-muted]', bg: 'bg-[--bg-surface-2]', border: 'border-[--border-subtle]', icon: <WifiOff className="w-4 h-4" />, label: 'Unknown' },
}

// ─── Sub-Components ───────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: ErrorSeverity }) {
  const config = severityConfig[severity]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${config.bg} ${config.color} ${config.border} border`}>
      {config.icon}
      {config.label}
    </span>
  )
}

function HealthIndicator({ status }: { status: HealthStatus }) {
  const config = healthStatusConfig[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} ${config.border} border`}>
      {config.icon}
      {config.label}
    </span>
  )
}

function StatusBadge({ status }: { status: ErrorStatus }) {
  const styles: Record<ErrorStatus, string> = {
    active: 'bg-[--status-danger-bg] text-[--status-danger] border-[--status-danger-border]',
    resolved: 'bg-[--status-success-bg] text-[--status-success] border-[--status-success-border]',
    dismissed: 'bg-[--bg-surface-2] text-[--text-muted] border-[--border-subtle]',
    escalated: 'bg-[--status-warning-bg] text-[--status-warning] border-[--status-warning-border]',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function RelativeTime({ timestamp }: { timestamp: string }) {
  const time = useMemo(() => {
    const now = Date.now()
    const then = new Date(timestamp).getTime()
    const diff = now - then
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }, [timestamp])

  return <span className="text-[10px] font-mono text-[--text-muted]">{time}</span>
}

// ─── Error Row Component ─────────────────────────────────────────────

function ErrorRow({ error, onResolve, onDismiss, onEscalate }: {
  error: CapturedError
  onResolve: (id: string) => void
  onDismiss: (id: string) => void
  onEscalate: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-[--bg-surface-2] border rounded-lg overflow-hidden ${
        error.status === 'resolved' ? 'border-[--status-success-border] opacity-60' :
        error.status === 'escalated' ? 'border-[--status-warning-border]' :
        error.severity === 'critical' ? 'border-[--status-danger-border]' :
        'border-[--border-subtle]'
      }`}
    >
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[--bg-surface-2] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <SeverityBadge severity={error.severity} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm truncate ${error.status === 'resolved' ? 'text-[--text-muted] line-through' : 'text-[--text-secondary]'}`}>
            {error.message}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-mono text-[--text-muted]">{error.type}</span>
            {error.source && (
              <>
                <span className="text-[--text-muted]">·</span>
                <span className="text-[10px] font-mono text-[--text-muted] truncate max-w-[200px]">{error.source}</span>
              </>
            )}
            {error.occurrenceCount > 1 && (
              <>
                <span className="text-[--text-muted]">·</span>
                <span className="text-[10px] font-mono text-[--status-warning]/60">{error.occurrenceCount}× repeated</span>
              </>
            )}
          </div>
        </div>
        <StatusBadge status={error.status} />
        <RelativeTime timestamp={error.lastSeen} />
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-[--text-muted]" />
        </motion.div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-[--border-subtle]">
              <div className="mt-3 space-y-2">
                {/* Stack trace */}
                {error.stack && (
                  <div>
                    <p className="text-[10px] font-mono text-[--text-muted] mb-1">Stack Trace:</p>
                    <pre className="text-[10px] font-mono text-[--status-danger]/60 bg-[--bg-primary] rounded p-2 overflow-x-auto max-h-32 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  </div>
                )}

                {/* Error details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {error.url && (
                    <div className="bg-[--bg-primary] rounded p-2">
                      <p className="text-[9px] font-mono text-[--text-muted]">URL</p>
                      <p className="text-[10px] font-mono text-[--text-secondary] truncate">{error.url}</p>
                    </div>
                  )}
                  {error.lineNumber && (
                    <div className="bg-[--bg-primary] rounded p-2">
                      <p className="text-[9px] font-mono text-[--text-muted]">Location</p>
                      <p className="text-[10px] font-mono text-[--text-secondary]">Line {error.lineNumber}{error.columnNumber ? `:${error.columnNumber}` : ''}</p>
                    </div>
                  )}
                  <div className="bg-[--bg-primary] rounded p-2">
                    <p className="text-[9px] font-mono text-[--text-muted]">First Seen</p>
                    <p className="text-[10px] font-mono text-[--text-secondary]">{new Date(error.firstSeen).toLocaleString()}</p>
                  </div>
                  <div className="bg-[--bg-primary] rounded p-2">
                    <p className="text-[9px] font-mono text-[--text-muted]">Last Seen</p>
                    <p className="text-[10px] font-mono text-[--text-secondary]">{new Date(error.lastSeen).toLocaleString()}</p>
                  </div>
                </div>

                {/* Browser info */}
                {error.browserInfo && (
                  <div className="bg-[--bg-primary] rounded p-2">
                    <p className="text-[9px] font-mono text-[--text-muted] mb-1">Browser</p>
                    <p className="text-[10px] font-mono text-[--text-muted] truncate">{error.browserInfo.userAgent}</p>
                    <p className="text-[10px] font-mono text-[--text-muted]">{error.browserInfo.viewport} · {error.browserInfo.language}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  {error.status === 'active' && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); onResolve(error.id) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium bg-[--status-success-bg] text-[--status-success] border border-[--status-success-border] hover:bg-[--status-success-bg] transition-colors"
                      >
                        <CheckCircle className="w-3 h-3" /> Resolve
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onEscalate(error.id) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium bg-[--status-warning-bg] text-[--status-warning] border border-[--status-warning-border] hover:bg-[--status-warning]/20 transition-colors"
                      >
                        <ArrowUp className="w-3 h-3" /> Escalate
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDismiss(error.id) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium bg-[--bg-surface-2] text-[--text-muted] border border-[--border-subtle] hover:bg-[--bg-surface-2] transition-colors"
                      >
                        <Ban className="w-3 h-3" /> Dismiss
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Health Check Card ────────────────────────────────────────────────

function HealthCheckCard({ check, onRefresh }: { check: HealthCheck; onRefresh: () => void }) {
  const config = healthStatusConfig[check.status]
  return (
    <motion.div
      variants={itemVariants}
      className={`bg-[--bg-surface-2] border ${config.border} rounded-lg p-4`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center ${config.color}`}>
            {check.id === 'supabase-connection' ? <Database className="w-4 h-4" /> :
             check.id === 'database-tables' ? <Layers className="w-4 h-4" /> :
             check.id === 'auth-service' ? <Shield className="w-4 h-4" /> :
             check.id === 'api-health' ? <Server className="w-4 h-4" /> :
             <Monitor className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-sm font-medium text-[--text-secondary]">{check.name}</p>
            <p className="text-[10px] font-mono text-[--text-muted]">{check.endpoint || 'internal'}</p>
          </div>
        </div>
        <HealthIndicator status={check.status} />
      </div>

      {check.responseTime !== null && (
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-3 h-3 text-[--text-muted]" />
          <span className="text-[10px] font-mono text-[--text-muted]">{check.responseTime}ms</span>
          {check.responseTime < 200 ? (
            <span className="text-[10px] font-mono text-[--status-success]/60">fast</span>
          ) : check.responseTime < 1000 ? (
            <span className="text-[10px] font-mono text-[--status-warning]/60">moderate</span>
          ) : (
            <span className="text-[10px] font-mono text-[--status-danger]/60">slow</span>
          )}
        </div>
      )}

      {check.message && (
        <p className="text-[10px] font-mono text-[--text-muted] mb-2 truncate" title={check.message}>
          {check.message}
        </p>
      )}

      <div className="flex items-center justify-between">
        <RelativeTime timestamp={check.lastChecked} />
        <button
          onClick={onRefresh}
          className="text-[10px] text-[--text-muted] hover:text-[--text-muted] transition-colors flex items-center gap-1"
        >
          <RefreshCw className="w-2.5 h-2.5" /> recheck
        </button>
      </div>
    </motion.div>
  )
}

// ─── Performance Metric Card ──────────────────────────────────────────

function PerformanceMetricCard({ label, value, unit, icon, status }: {
  label: string
  value: string
  unit: string
  icon: React.ReactNode
  status: 'good' | 'warning' | 'critical'
}) {
  const statusStyles = {
    good: 'border-[--status-success-border]',
    warning: 'border-[--status-warning-border]',
    critical: 'border-[--status-danger-border]',
  }
  const statusColors = {
    good: 'text-[--status-success]',
    warning: 'text-[--status-warning]',
    critical: 'text-[--status-danger]',
  }

  return (
    <div className={`bg-[--bg-surface-2] border ${statusStyles[status]} rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-[--text-muted] uppercase tracking-wider">{label}</span>
        <div className={`w-6 h-6 rounded-md bg-[--bg-surface-2] flex items-center justify-center ${statusColors[status]}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1 font-mono">
        <span className="text-2xl font-bold text-[--text-primary]">{value}</span>
        <span className={`text-sm ${statusColors[status]}`}>{unit}</span>
      </div>
    </div>
  )
}

// ─── Bug Report Form ─────────────────────────────────────────────────

function BugReportForm({ onSubmit, onCancel }: { onSubmit: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<ErrorSeverity>('error')
  const [category, setCategory] = useState<BugCategory>('UI')
  const [steps, setSteps] = useState('')
  const addBugReport = useBugDetectionStore(s => s.addBugReport)

  const handleSubmit = () => {
    if (!title.trim()) return
    const browserInfo = typeof window !== 'undefined' ? {
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      platform: navigator.platform,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    } : {
      userAgent: 'SSR', viewport: 'N/A', language: 'N/A', platform: 'N/A', url: 'N/A', timestamp: new Date().toISOString(),
    }

    addBugReport({
      title: title.trim(),
      description: description.trim(),
      severity,
      category,
      stepsToReproduce: steps.trim(),
      browserInfo,
    })
    onSubmit()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-[--bg-surface-2] border border-[--border-subtle] rounded-lg p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileWarning className="w-4 h-4 text-[--status-warning]" />
          <h3 className="text-sm font-semibold text-[--text-primary]">Report a Bug</h3>
        </div>
        <button onClick={onCancel} className="text-[--text-muted] hover:text-[--text-secondary] transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-mono text-[--text-muted] uppercase tracking-wider mb-1 block">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Brief description of the bug"
            className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-md text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[--status-warning-border] transition-colors"
          />
        </div>

        <div>
          <label className="text-[10px] font-mono text-[--text-muted] uppercase tracking-wider mb-1 block">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of the bug..."
            rows={3}
            className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-md text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[--status-warning-border] transition-colors resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-mono text-[--text-muted] uppercase tracking-wider mb-1 block">Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as ErrorSeverity)}
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-md text-sm text-[--text-primary] focus:outline-none focus:border-[--status-warning-border] transition-colors appearance-none"
            >
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono text-[--text-muted] uppercase tracking-wider mb-1 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as BugCategory)}
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-md text-sm text-[--text-primary] focus:outline-none focus:border-[--status-warning-border] transition-colors appearance-none"
            >
              <option value="UI">UI</option>
              <option value="Backend">Backend</option>
              <option value="Database">Database</option>
              <option value="Auth">Auth</option>
              <option value="Performance">Performance</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-mono text-[--text-muted] uppercase tracking-wider mb-1 block">Steps to Reproduce</label>
          <textarea
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
            rows={3}
            className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-md text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[--status-warning-border] transition-colors resize-none"
          />
        </div>

        {/* Auto-captured info preview */}
        <div className="bg-[--bg-primary] rounded-md p-3 border border-[--border-subtle]">
          <p className="text-[9px] font-mono text-[--text-muted] mb-1">Auto-captured browser info:</p>
          <p className="text-[10px] font-mono text-[--text-muted] truncate">{typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}</p>
          <p className="text-[10px] font-mono text-[--text-muted]">{typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A'} · {typeof navigator !== 'undefined' ? navigator.language : 'N/A'}</p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[--status-warning-bg] text-[--status-warning] border border-[--status-warning-border] hover:bg-[--status-warning]/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" /> Submit Report
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-md text-sm font-medium text-[--text-muted] hover:text-[--text-secondary] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Activity Event Component ─────────────────────────────────────────

function ActivityEventRow({ event }: { event: { id: string; timestamp: string; type: string; message: string; details?: string } }) {
  const typeIcons: Record<string, { icon: React.ReactNode; color: string }> = {
    error: { icon: <XCircle className="w-3 h-3" />, color: 'text-[--status-danger]' },
    warning: { icon: <AlertTriangle className="w-3 h-3" />, color: 'text-[--status-warning]' },
    resolved: { icon: <CheckCircle className="w-3 h-3" />, color: 'text-[--status-success]' },
    escalated: { icon: <ArrowUpRight className="w-3 h-3" />, color: 'text-[--status-warning]' },
    'bug-report': { icon: <FileWarning className="w-3 h-3" />, color: 'text-[--status-info]' },
    'health-change': { icon: <Activity className="w-3 h-3" />, color: 'text-[--status-info]' },
    performance: { icon: <Zap className="w-3 h-3" />, color: 'text-[--status-warning]' },
  }

  const config = typeIcons[event.type] || { icon: <Info className="w-3 h-3" />, color: 'text-[--text-muted]' }

  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-[--border-subtle] last:border-0">
      <div className={`mt-0.5 ${config.color}`}>{config.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-[--text-secondary]">{event.message}</p>
        {event.details && (
          <p className="text-[10px] text-[--text-muted] mt-0.5">{event.details}</p>
        )}
      </div>
      <RelativeTime timestamp={event.timestamp} />
    </div>
  )
}

// ─── Pattern Detection ───────────────────────────────────────────────

function detectPatterns(errors: CapturedError[]): string[] {
  const patterns: string[] = []
  const now = Date.now()
  const oneHour = 3600000

  // Check for repeated errors
  const recentErrors = errors.filter(e => {
    const lastSeen = new Date(e.lastSeen).getTime()
    return now - lastSeen < oneHour && e.status === 'active'
  })

  // Group by message similarity
  const messageGroups: Record<string, CapturedError[]> = {}
  for (const error of recentErrors) {
    const key = error.message.slice(0, 50)
    if (!messageGroups[key]) messageGroups[key] = []
    messageGroups[key].push(error)
  }

  for (const [key, group] of Object.entries(messageGroups)) {
    const totalOccurrences = group.reduce((sum, e) => sum + e.occurrenceCount, 0)
    if (totalOccurrences >= 5) {
      patterns.push(`"${key}..." occurred ${totalOccurrences} times in the last hour`)
    }
  }

  // Check for critical errors
  const criticalCount = errors.filter(e => e.severity === 'critical' && e.status === 'active').length
  if (criticalCount >= 3) {
    patterns.push(`${criticalCount} critical errors are active — immediate attention required`)
  }

  // Check for same source errors
  const sourceGroups: Record<string, number> = {}
  for (const error of recentErrors) {
    if (error.source) {
      sourceGroups[error.source] = (sourceGroups[error.source] || 0) + error.occurrenceCount
    }
  }
  for (const [source, count] of Object.entries(sourceGroups)) {
    if (count >= 10) {
      patterns.push(`Source "${source}" produced ${count} errors in the last hour`)
    }
  }

  return patterns
}

// ─── Main Component ───────────────────────────────────────────────────

export function AdminBugDetection() {
  const {
    errors, healthChecks, performanceMetrics, bugReports, activityFeed,
    addError, resolveError, dismissError, escalateError, clearResolvedErrors,
    setHealthChecks, updateHealthCheck, addPerformanceMetric, clearPerformanceMetrics,
    setIsMonitoring, setLastUpdated,
  } = useBugDetectionStore()

  const [activeTab, setActiveTab] = useState<'errors' | 'health' | 'performance' | 'reports' | 'activity'>('errors')
  const [severityFilter, setSeverityFilter] = useState<ErrorSeverity | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<ErrorType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<ErrorStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showBugForm, setShowBugForm] = useState(false)
  const [healthLoading, setHealthLoading] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)

  const cleanupRef = useRef<(() => void) | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Install global error capture on mount
  useEffect(() => {
    const cleanup = installGlobalErrorCapture()
    cleanupRef.current = cleanup
    setIsMonitoring(true)
    return () => {
      cleanup()
      setIsMonitoring(false)
    }
  }, [setIsMonitoring])

  // Auto-capture performance metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window === 'undefined' || !mountedRef.current) return

      // Capture page load time
      try {
        const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
        if (navEntry) {
          addPerformanceMetric({
            name: 'Page Load',
            value: Math.round(navEntry.loadEventEnd - navEntry.startTime),
            unit: 'ms',
            category: 'page-load',
          })
        }
      } catch {
        // Performance API not available
      }

      // Capture memory usage
      try {
        const perf = performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }
        if (perf.memory) {
          addPerformanceMetric({
            name: 'JS Heap Used',
            value: Math.round(perf.memory.usedJSHeapSize / 1048576),
            unit: 'MB',
            category: 'memory',
          })
        }
      } catch {
        // Memory API not available
      }
    }, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [addPerformanceMetric])

  // Fetch health checks
  const fetchHealthChecks = useCallback(async () => {
    setHealthLoading(true)
    try {
      const res = await fetch('/api/admin/error-log?action=health')
      if (!mountedRef.current) return
      if (res.ok) {
        const data = await res.json()
        if (data.healthChecks) {
          setHealthChecks(data.healthChecks)
        }
        setLastUpdated(new Date().toISOString())
      }
    } catch {
      // If fetch fails, mark services as unknown
      if (mountedRef.current) {
        setHealthChecks(healthChecks.map(hc =>
          hc.id === 'client-runtime' ? hc : { ...hc, status: 'unknown' as HealthStatus }
        ))
      }
    } finally {
      if (mountedRef.current) setHealthLoading(false)
    }
  }, [healthChecks, setHealthChecks, setLastUpdated])

  // Fetch performance from API
  const fetchPerformance = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/error-log?action=performance')
      if (!mountedRef.current) return
      if (res.ok) {
        const data = await res.json()
        if (data.performance) {
          addPerformanceMetric({
            name: 'API Response Time',
            value: data.performance.apiResponseTime,
            unit: 'ms',
            category: 'api-response',
          })
          if (data.performance.dbResponseTime > 0) {
            addPerformanceMetric({
              name: 'DB Response Time',
              value: data.performance.dbResponseTime,
              unit: 'ms',
              category: 'api-response',
            })
          }
        }
      }
    } catch {
      // ignore
    }
  }, [addPerformanceMetric])

  // Initial health check
  useEffect(() => {
    fetchHealthChecks()
    fetchPerformance()
  }, [fetchHealthChecks, fetchPerformance])

  // ── Derived Data ──────────────────────────────────────────────────

  const filteredErrors = useMemo(() => {
    let filtered = [...errors]
    if (severityFilter !== 'all') filtered = filtered.filter(e => e.severity === severityFilter)
    if (typeFilter !== 'all') filtered = filtered.filter(e => e.type === typeFilter)
    if (statusFilter !== 'all') filtered = filtered.filter(e => e.status === statusFilter)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(e =>
        e.message.toLowerCase().includes(q) ||
        (e.source && e.source.toLowerCase().includes(q)) ||
        (e.stack && e.stack.toLowerCase().includes(q))
      )
    }
    return filtered
  }, [errors, severityFilter, typeFilter, statusFilter, searchQuery])

  const errorStats = useMemo(() => ({
    total: errors.length,
    active: errors.filter(e => e.status === 'active').length,
    critical: errors.filter(e => e.severity === 'critical' && e.status === 'active').length,
    resolved: errors.filter(e => e.status === 'resolved').length,
  }), [errors])

  const patterns = useMemo(() => detectPatterns(errors), [errors])

  const latestMetrics = useMemo(() => {
    const pageLoad = performanceMetrics.filter(m => m.category === 'page-load').slice(0, 1)[0]
    const apiResponse = performanceMetrics.filter(m => m.category === 'api-response').slice(0, 1)[0]
    const memory = performanceMetrics.filter(m => m.category === 'memory').slice(0, 1)[0]
    const renderCount = performanceMetrics.filter(m => m.category === 'render-count').length
    return { pageLoad, apiResponse, memory, renderCount }
  }, [performanceMetrics])

  // ── Simulate test error capture ──────────────────────────────────

  const captureTestError = useCallback(() => {
    setIsCapturing(true)
    setTimeout(() => {
      addError({
        type: 'client',
        timestamp: new Date().toISOString(),
        severity: ['critical', 'error', 'warning', 'info'][Math.floor(Math.random() * 4)] as ErrorSeverity,
        status: 'active',
        message: `Test error captured at ${new Date().toLocaleTimeString()}`,
        stack: `Error: Test error\n    at captureTestError (admin-bug-detection.tsx:1:1)\n    at onClick (admin-bug-detection.tsx:2:1)`,
        source: 'test-capture',
        url: typeof window !== 'undefined' ? window.location.href : '',
      })
      setIsCapturing(false)
    }, 500)
  }, [addError])

  // ── Tab configuration ────────────────────────────────────────────

  const tabs = [
    { id: 'errors' as const, label: 'Error Log', icon: <Bug className="w-4 h-4" />, count: errorStats.active },
    { id: 'health' as const, label: 'Health Check', icon: <Activity className="w-4 h-4" /> },
    { id: 'performance' as const, label: 'Performance', icon: <Zap className="w-4 h-4" /> },
    { id: 'reports' as const, label: 'Bug Reports', icon: <FileWarning className="w-4 h-4" />, count: bugReports.filter(r => r.status === 'open').length },
    { id: 'activity' as const, label: 'Activity', icon: <Clock className="w-4 h-4" /> },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="bg-[--bg-primary] border border-[--status-warning-border] rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bug className="w-5 h-5 text-[--status-warning]" />
            <div>
              <h2 className="text-xl font-bold text-[--text-primary]">Bug Detection & Monitoring</h2>
              <p className="text-[10px] font-mono text-[--text-muted] mt-0.5">Real-time error capture, health monitoring, and performance tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[--status-success-bg] border border-[--status-success-border]">
              <span className={`w-1.5 h-1.5 rounded-full ${errorStats.critical > 0 ? 'bg-[--status-danger] animate-pulse' : 'bg-[--status-success]'}`} />
              <span className={`text-[10px] font-mono ${errorStats.critical > 0 ? 'text-[--status-danger]' : 'text-[--status-success]'}`}>
                {errorStats.critical > 0 ? `${errorStats.critical} critical` : 'Monitoring active'}
              </span>
            </div>
            <button
              onClick={captureTestError}
              disabled={isCapturing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium bg-[--status-warning-bg] text-[--status-warning] border border-[--status-warning-border] hover:bg-[--status-warning]/20 transition-colors disabled:opacity-50"
            >
              {isCapturing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Test Capture
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Stats Bar ──────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[--bg-surface-2] border border-[--border-subtle] rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-[--text-muted] uppercase tracking-wider">Total Errors</span>
            <Bug className="w-3.5 h-3.5 text-[--text-muted]" />
          </div>
          <p className="text-2xl font-bold text-[--text-primary] font-mono">{errorStats.total}</p>
        </div>
        <div className="bg-[--bg-surface-2] border border-[--status-danger-border] rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-[--text-muted] uppercase tracking-wider">Active</span>
            <XCircle className="w-3.5 h-3.5 text-[--text-muted]" />
          </div>
          <p className="text-2xl font-bold text-[--status-danger] font-mono">{errorStats.active}</p>
        </div>
        <div className="bg-[--bg-surface-2] border border-[--status-warning-border] rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-[--text-muted] uppercase tracking-wider">Critical</span>
            <AlertTriangle className="w-3.5 h-3.5 text-[--text-muted]" />
          </div>
          <p className="text-2xl font-bold text-[--status-warning] font-mono">{errorStats.critical}</p>
        </div>
        <div className="bg-[--bg-surface-2] border border-[--status-success-border] rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-[--text-muted] uppercase tracking-wider">Resolved</span>
            <CheckCircle className="w-3.5 h-3.5 text-[--status-success]" />
          </div>
          <p className="text-2xl font-bold text-[--status-success] font-mono">{errorStats.resolved}</p>
        </div>
      </motion.div>

      {/* ── Pattern Detection Alerts ───────────────────────────── */}
      <AnimatePresence>
        {patterns.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {patterns.map((pattern, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-2.5 px-4 py-2.5 bg-[--status-warning]/5 border border-[--status-warning-border] rounded-lg"
              >
                <AlertTriangle className="w-4 h-4 text-[--status-warning] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-[--status-warning]">Pattern Detected</p>
                  <p className="text-[11px] text-[--text-muted] mt-0.5">{pattern}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-center gap-1 border-b border-[--border-subtle] pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === tab.id
                ? 'text-[--status-warning] border-[--status-warning]'
                : 'text-[--text-muted] border-transparent hover:text-[--text-secondary] hover:border-[--border-medium]'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono ${
                activeTab === tab.id ? 'bg-[--status-warning]/15 text-[--status-warning]' : 'bg-[--status-danger-bg] text-[--status-danger]'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {/* ── Tab Content ─────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {/* ── Error Log Tab ────────────────────────────────────── */}
        {activeTab === 'errors' && (
          <motion.div
            key="errors"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[--text-muted]" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search errors..."
                  className="w-full pl-9 pr-3 py-2 bg-[--bg-surface-2] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[--status-warning-border] transition-colors"
                />
              </div>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as ErrorSeverity | 'all')}
                className="px-3 py-2 bg-[--bg-surface-2] border border-[--border-subtle] rounded-lg text-sm text-[--text-secondary] focus:outline-none focus:border-[--status-warning-border] transition-colors appearance-none"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as ErrorType | 'all')}
                className="px-3 py-2 bg-[--bg-surface-2] border border-[--border-subtle] rounded-lg text-sm text-[--text-secondary] focus:outline-none focus:border-[--status-warning-border] transition-colors appearance-none"
              >
                <option value="all">All Types</option>
                <option value="client">Client</option>
                <option value="api">API</option>
                <option value="render">Render</option>
                <option value="network">Network</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ErrorStatus | 'all')}
                className="px-3 py-2 bg-[--bg-surface-2] border border-[--border-subtle] rounded-lg text-sm text-[--text-secondary] focus:outline-none focus:border-[--status-warning-border] transition-colors appearance-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="escalated">Escalated</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
              <button
                onClick={clearResolvedErrors}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-surface-2] transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Clear Resolved
              </button>
            </div>

            {/* Error List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
              {filteredErrors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-[--status-success-bg] border border-[--status-success-border] flex items-center justify-center mb-4">
                    <CheckCircle className="w-7 h-7 text-[--text-muted]" />
                  </div>
                  <p className="text-sm text-[--text-muted] mb-1">No errors found</p>
                  <p className="text-[10px] text-[--text-muted] font-mono">
                    {errors.length === 0 ? 'No errors captured yet — click "Test Capture" to simulate' : 'Try adjusting your filters'}
                  </p>
                </div>
              ) : (
                filteredErrors.map((error) => (
                  <ErrorRow
                    key={error.id}
                    error={error}
                    onResolve={resolveError}
                    onDismiss={dismissError}
                    onEscalate={escalateError}
                  />
                ))
              )}
            </div>

            {/* Error count */}
            <div className="text-center">
              <p className="text-[10px] font-mono text-[--text-muted]">
                Showing {filteredErrors.length} of {errors.length} errors
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Health Check Tab ──────────────────────────────────── */}
        {activeTab === 'health' && (
          <motion.div
            key="health"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-[--text-muted]">Real-time service health monitoring</p>
              <button
                onClick={fetchHealthChecks}
                disabled={healthLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium bg-[--bg-surface-2] text-[--text-muted] border border-[--border-subtle] hover:bg-[--bg-surface-2] transition-colors disabled:opacity-50"
              >
                {healthLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Refresh All
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {healthChecks.map((check) => (
                <HealthCheckCard
                  key={check.id}
                  check={check}
                  onRefresh={fetchHealthChecks}
                />
              ))}
            </div>

            {/* Overall Status */}
            <div className="bg-[--bg-surface-2] border border-[--border-subtle] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-[--text-muted]" />
                <h3 className="text-sm font-semibold text-[--text-secondary]">System Overview</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-[--bg-primary] rounded-lg">
                  <p className="text-2xl font-bold font-mono text-[--status-success]">
                    {healthChecks.filter(h => h.status === 'healthy').length}
                  </p>
                  <p className="text-[10px] text-[--text-muted] font-mono mt-1">Healthy</p>
                </div>
                <div className="text-center p-3 bg-[--bg-primary] rounded-lg">
                  <p className="text-2xl font-bold font-mono text-[--status-warning]">
                    {healthChecks.filter(h => h.status === 'degraded').length}
                  </p>
                  <p className="text-[10px] text-[--text-muted] font-mono mt-1">Degraded</p>
                </div>
                <div className="text-center p-3 bg-[--bg-primary] rounded-lg">
                  <p className="text-2xl font-bold font-mono text-[--status-danger]">
                    {healthChecks.filter(h => h.status === 'down' || h.status === 'unknown').length}
                  </p>
                  <p className="text-[10px] text-[--text-muted] font-mono mt-1">Down/Unknown</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Performance Tab ───────────────────────────────────── */}
        {activeTab === 'performance' && (
          <motion.div
            key="performance"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-[--text-muted]">Performance metrics and resource usage</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { fetchPerformance() }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium bg-[--bg-surface-2] text-[--text-muted] border border-[--border-subtle] hover:bg-[--bg-surface-2] transition-colors"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
                <button
                  onClick={clearPerformanceMetrics}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium text-[--text-muted] hover:text-[--text-muted] transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>
            </div>

            {/* Performance Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <PerformanceMetricCard
                label="Page Load"
                value={latestMetrics.pageLoad ? String(latestMetrics.pageLoad.value) : '—'}
                unit="ms"
                icon={<BarChart3 className="w-3.5 h-3.5" />}
                status={
                  latestMetrics.pageLoad
                    ? latestMetrics.pageLoad.value < 1000 ? 'good' : latestMetrics.pageLoad.value < 3000 ? 'warning' : 'critical'
                    : 'good'
                }
              />
              <PerformanceMetricCard
                label="API Response"
                value={latestMetrics.apiResponse ? String(latestMetrics.apiResponse.value) : '—'}
                unit="ms"
                icon={<Server className="w-3.5 h-3.5" />}
                status={
                  latestMetrics.apiResponse
                    ? latestMetrics.apiResponse.value < 200 ? 'good' : latestMetrics.apiResponse.value < 1000 ? 'warning' : 'critical'
                    : 'good'
                }
              />
              <PerformanceMetricCard
                label="JS Heap"
                value={latestMetrics.memory ? String(latestMetrics.memory.value) : '—'}
                unit="MB"
                icon={<Cpu className="w-3.5 h-3.5" />}
                status={
                  latestMetrics.memory
                    ? latestMetrics.memory.value < 100 ? 'good' : latestMetrics.memory.value < 200 ? 'warning' : 'critical'
                    : 'good'
                }
              />
              <PerformanceMetricCard
                label="Render Events"
                value={String(latestMetrics.renderCount)}
                unit="events"
                icon={<Layers className="w-3.5 h-3.5" />}
                status={latestMetrics.renderCount < 50 ? 'good' : latestMetrics.renderCount < 200 ? 'warning' : 'critical'}
              />
            </div>

            {/* Performance History */}
            <div className="bg-[--bg-surface-2] border border-[--border-subtle] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-[--text-secondary] mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Recent Metrics
              </h3>
              {performanceMetrics.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="w-8 h-8 text-[--text-muted] mx-auto mb-2" />
                  <p className="text-[11px] text-[--text-muted] font-mono">No performance data collected yet</p>
                  <p className="text-[10px] text-[--text-muted] font-mono mt-1">Metrics are captured every 30 seconds</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                  {performanceMetrics.slice(0, 30).map((metric) => (
                    <div key={metric.id} className="flex items-center justify-between py-1.5 px-2 hover:bg-[--bg-surface-2] rounded transition-colors">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          metric.category === 'page-load' ? 'bg-[--status-info]/60' :
                          metric.category === 'api-response' ? 'bg-[--status-success]/60' :
                          metric.category === 'memory' ? 'bg-[--status-warning]/60' :
                          'bg-[--status-info-bg]'
                        }`} />
                        <span className="text-[11px] text-[--text-secondary]">{metric.name}</span>
                        <span className="text-[9px] font-mono text-[--text-muted] px-1.5 py-0.5 rounded bg-[--bg-surface-2]">{metric.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-[--text-secondary]">{metric.value} {metric.unit}</span>
                        <RelativeTime timestamp={metric.timestamp} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── Bug Reports Tab ──────────────────────────────────── */}
        {activeTab === 'reports' && (
          <motion.div
            key="reports"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-[--text-muted]">Manually reported bugs and issues</p>
              <button
                onClick={() => setShowBugForm(!showBugForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium bg-[--status-warning-bg] text-[--status-warning] border border-[--status-warning-border] hover:bg-[--status-warning]/20 transition-colors"
              >
                <Plus className="w-3 h-3" /> New Bug Report
              </button>
            </div>

            <AnimatePresence>
              {showBugForm && (
                <BugReportForm
                  onSubmit={() => setShowBugForm(false)}
                  onCancel={() => setShowBugForm(false)}
                />
              )}
            </AnimatePresence>

            {bugReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-[--bg-surface-2] border border-[--border-subtle] flex items-center justify-center mb-4">
                  <FileWarning className="w-7 h-7 text-[--text-muted]" />
                </div>
                <p className="text-sm text-[--text-muted] mb-1">No bug reports yet</p>
                <p className="text-[10px] text-[--text-muted] font-mono">Click &quot;New Bug Report&quot; to log a bug</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bugReports.map((report) => (
                  <motion.div
                    key={report.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[--bg-surface-2] border border-[--border-subtle] rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={report.severity} />
                        <span className="text-[10px] font-mono text-[--text-muted] px-1.5 py-0.5 rounded bg-[--bg-surface-2]">{report.category}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          report.status === 'open' ? 'bg-[--status-info-bg] text-[--status-info]' :
                          report.status === 'investigating' ? 'bg-[--status-warning-bg] text-[--status-warning]' :
                          report.status === 'resolved' ? 'bg-[--status-success-bg] text-[--status-success]' :
                          'bg-[--bg-surface-2] text-[--text-muted]'
                        }`}>
                          {report.status}
                        </span>
                      </div>
                      <RelativeTime timestamp={report.createdAt} />
                    </div>
                    <h4 className="text-sm font-medium text-[--text-secondary] mb-1">{report.title}</h4>
                    {report.description && (
                      <p className="text-[11px] text-[--text-muted] mb-2">{report.description}</p>
                    )}
                    {report.stepsToReproduce && (
                      <div className="bg-[--bg-primary] rounded p-2 mb-2">
                        <p className="text-[9px] font-mono text-[--text-muted] mb-1">Steps to reproduce:</p>
                        <p className="text-[10px] font-mono text-[--text-muted] whitespace-pre-wrap">{report.stepsToReproduce}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[10px] font-mono text-[--text-muted]">
                      <Monitor className="w-3 h-3" />
                      <span className="truncate max-w-[300px]">{report.browserInfo.userAgent.slice(0, 60)}...</span>
                      <span>·</span>
                      <span>{report.browserInfo.viewport}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {report.status === 'open' && (
                        <button
                          onClick={() => useBugDetectionStore.getState().updateBugReportStatus(report.id, 'investigating')}
                          className="text-[10px] text-[--status-warning]/60 hover:text-[--status-warning] transition-colors"
                        >
                          Mark Investigating
                        </button>
                      )}
                      {report.status !== 'resolved' && report.status !== 'closed' && (
                        <button
                          onClick={() => useBugDetectionStore.getState().updateBugReportStatus(report.id, 'resolved')}
                          className="text-[10px] text-[--status-success]/60 hover:text-[--status-success] transition-colors"
                        >
                          Resolve
                        </button>
                      )}
                      {report.status === 'resolved' && (
                        <button
                          onClick={() => useBugDetectionStore.getState().updateBugReportStatus(report.id, 'closed')}
                          className="text-[10px] text-[--text-muted] hover:text-[--text-muted] transition-colors"
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── Activity Feed Tab ─────────────────────────────────── */}
        {activeTab === 'activity' && (
          <motion.div
            key="activity"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-[--text-muted]">Recent events and detected patterns</p>
              <button
                onClick={() => useBugDetectionStore.getState().clearActivityFeed()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium text-[--text-muted] hover:text-[--text-muted] transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Clear Feed
              </button>
            </div>

            {activityFeed.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-[--bg-surface-2] border border-[--border-subtle] flex items-center justify-center mb-4">
                  <Clock className="w-7 h-7 text-[--text-muted]" />
                </div>
                <p className="text-sm text-[--text-muted] mb-1">No activity yet</p>
                <p className="text-[10px] text-[--text-muted] font-mono">Events will appear here as errors are captured and actions taken</p>
              </div>
            ) : (
              <div className="bg-[--bg-surface-2] border border-[--border-subtle] rounded-lg p-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                {activityFeed.map((event) => (
                  <ActivityEventRow key={event.id} event={event} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
