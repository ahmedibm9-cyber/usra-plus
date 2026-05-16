'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  Shield, AlertTriangle, Ban, Flag, Eye, UserX, CheckCircle2,
  XCircle, Clock, Search, Filter, Loader2, ChevronDown, ChevronUp,
  AlertOctagon, Users, Gavel, FileWarning, ThumbsUp, ThumbsDown,
  ArrowUpRight, RefreshCw, Plus, Star, MessageSquare
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { safeJsonResponse } from '@/lib/safe-fetch'
import type {
  ModerationItem, FraudAlert, UserBan, AbuseReport, UserTrustScore,
  ModerationStatus, FraudSeverity, BanType, AbuseReportStatus, RiskLevel
} from '@/types/admin'

// ─── Animation Variants ──────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
}

// ─── Helper Functions ────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

function priorityColor(priority: string) {
  switch (priority) {
    case 'urgent': return { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]', border: 'border-[--status-danger-border]' }
    case 'high': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]' }
    case 'medium': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]' }
    case 'low': return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20' }
    default: return { bg: 'bg-[--bg-surface]', text: 'text-[--text-muted]', border: 'border-[--border-subtle]' }
  }
}

function severityColor(severity: FraudSeverity) {
  switch (severity) {
    case 'critical': return { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]', border: 'border-[--status-danger-border]' }
    case 'high': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]' }
    case 'medium': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]' }
    case 'low': return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20' }
  }
}

function banTypeColor(banType: BanType) {
  switch (banType) {
    case 'warning': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]' }
    case 'temporary_suspension': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]' }
    case 'shadow_ban': return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20' }
    case 'permanent_ban': return { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]', border: 'border-[--status-danger-border]' }
  }
}

function reportStatusColor(status: AbuseReportStatus) {
  switch (status) {
    case 'pending': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]' }
    case 'reviewing': return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20' }
    case 'actioned': return { bg: 'bg-[var(--accent)]/10', text: 'text-[var(--accent)]', border: 'border-[var(--accent)]/20' }
    case 'dismissed': return { bg: 'bg-[--bg-surface]', text: 'text-[--text-muted]', border: 'border-[--border-subtle]' }
    case 'escalated': return { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]', border: 'border-[--status-danger-border]' }
  }
}

function riskLevelColor(level: RiskLevel) {
  switch (level) {
    case 'critical': return 'text-[--status-danger]'
    case 'high': return 'text-[--status-warning]'
    case 'medium': return 'text-[--status-warning]'
    case 'low': return 'text-[var(--accent)]'
  }
}

function riskScoreGradient(score: number): string {
  if (score < 25) return 'from-[var(--accent)] to-[var(--accent)]'
  if (score < 50) return 'from-emerald-500 to-emerald-400'
  if (score < 75) return 'from-orange-500 to-orange-400'
  return 'from-red-500 to-red-400'
}

// ─── Risk Score Bar Component ────────────────────────────────────────

function RiskScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-[--bg-surface] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className={`h-full rounded-full bg-gradient-to-r ${riskScoreGradient(score)}`}
        />
      </div>
      <span className={`text-xs font-metric font-medium min-w-[28px] text-right ${
        score < 25 ? 'text-[var(--accent)]' : score < 50 ? 'text-[--status-warning]' : score < 75 ? 'text-[--status-warning]' : 'text-[--status-danger]'
      }`}>
        {score}
      </span>
    </div>
  )
}

// ─── Skeleton Loader ──────────────────────────────────────────────

function SkeletonLoader() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-[--bg-primary] border border-[--border-subtle] rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-[--bg-surface] rounded w-1/2 mb-3" />
            <div className="h-8 bg-[--bg-surface] rounded w-1/3" />
          </div>
        ))}
      </div>
      <div className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-8 animate-pulse">
        <div className="h-32 bg-[--bg-surface] rounded" />
      </div>
    </div>
  )
}

// ─── API Action Helper ────────────────────────────────────────────

async function apiAction(endpoint: string, method: string, body?: Record<string, unknown>) {
  try {
    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: body ? JSON.stringify(body) : undefined,
    })
    if (res.status === 401) {
      const { useAdminAuthStore } = await import('@/stores/admin-auth-store')
      useAdminAuthStore.getState().logoutAdmin()
      return null
    }
    return await safeJsonResponse(res)
  } catch {
    toast.error('Action failed — check your connection')
    return null
  }
}

// ─── Tab: Moderation Queue ───────────────────────────────────────────

function ModerationQueueTab({ items, onRefresh }: { items: ModerationItem[]; onRefresh: () => void }) {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const filtered = items.filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false
    if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false
    if (typeFilter !== 'all' && item.itemType !== typeFilter) return false
    return true
  })

  const handleItemAction = async (itemId: string, action: 'assign' | 'resolve' | 'escalate') => {
    setActionLoading(itemId)
    const result = await apiAction('/api/admin/moderation', 'PATCH', { itemId, action })
    if (result?.success) {
      toast.success(`Item ${action}d successfully`)
      onRefresh()
    } else {
      toast.error(result?.error || `Failed to ${action} item`)
    }
    setActionLoading(null)
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-[--text-muted]" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg text-xs text-[--text-muted] px-2 py-1.5 focus:outline-none focus:border-[var(--accent)]/30">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="escalated">Escalated</option>
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
          className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg text-xs text-[--text-muted] px-2 py-1.5 focus:outline-none focus:border-[var(--accent)]/30">
          <option value="all">All Priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg text-xs text-[--text-muted] px-2 py-1.5 focus:outline-none focus:border-[var(--accent)]/30">
          <option value="all">All Types</option>
          <option value="ban_review">Ban Review</option>
          <option value="abuse_report">Abuse Report</option>
          <option value="fraud_alert">Fraud Alert</option>
          <option value="appeal">Appeal</option>
          <option value="content_flag">Content Flag</option>
        </select>
      </div>

      {/* Queue List */}
      {filtered.length === 0 ? (
        <motion.div variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px]">
          <Shield className="w-10 h-10 text-[--text-muted] mb-3" />
          <p className="text-sm text-[--text-muted] mb-1">No moderation items</p>
          <p className="text-xs text-[--text-muted]">Pending moderation items will appear here</p>
        </motion.div>
      ) : (
        <div className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_80px_90px_100px_120px_80px_120px] gap-2 px-4 py-2.5 bg-[--bg-primary] border-b border-[--border-subtle] text-[10px] font-medium text-[--text-muted] uppercase tracking-wider">
            <span>Item</span><span>Priority</span><span>Type</span><span>Status</span><span>Assigned</span><span>Created</span><span>Actions</span>
          </div>
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {filtered.map(item => {
              const pc = priorityColor(item.priority)
              return (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_80px_90px_100px_120px_80px_120px] gap-2 px-4 py-3 border-b border-[--border-subtle] hover:bg-[--bg-surface] transition-colors items-center">
                  <span className="text-xs text-[--text-secondary] truncate">{item.notes || item.itemType.replace(/_/g, ' ')}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${pc.bg} ${pc.text} border ${pc.border} capitalize text-center`}>{item.priority}</span>
                  <span className="text-xs text-[--text-muted] capitalize">{item.itemType.replace(/_/g, ' ')}</span>
                  <span className={`text-xs capitalize ${item.status === 'pending' ? 'text-[--status-warning]' : item.status === 'escalated' ? 'text-[--status-danger]' : item.status === 'resolved' ? 'text-[var(--accent)]' : 'text-[var(--accent)]'}`}>{item.status.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-[--text-muted]">{item.assignedTo || 'Unassigned'}</span>
                  <span className="text-[10px] text-[--text-muted]">{timeAgo(item.createdAt)}</span>
                  <div className="flex items-center gap-1">
                    {item.status === 'pending' && (
                      <button onClick={() => handleItemAction(item.id, 'assign')} disabled={actionLoading === item.id}
                        className="p-1 rounded text-[--text-muted] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all disabled:opacity-50" title="Assign">
                        <Eye className="w-3 h-3" />
                      </button>
                    )}
                    <button onClick={() => handleItemAction(item.id, 'resolve')} disabled={actionLoading === item.id}
                      className="p-1 rounded text-[--text-muted] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all disabled:opacity-50" title="Resolve">
                      <CheckCircle2 className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleItemAction(item.id, 'escalate')} disabled={actionLoading === item.id}
                      className="p-1 rounded text-[--text-muted] hover:text-[--status-danger] hover:bg-[--status-danger-bg] transition-all disabled:opacity-50" title="Escalate">
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── Tab: Fraud Alerts ───────────────────────────────────────────────

function FraudAlertsTab({ alerts, onRefresh }: { alerts: FraudAlert[]; onRefresh: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleAction = async (action: string, alertId: string) => {
    const result = await apiAction('/api/admin/fraud', 'PATCH', { alertId, action })
    if (result?.success) {
      toast.success(`Alert ${action}`)
      onRefresh()
    } else {
      toast.error(result?.error || `Failed to ${action} alert`)
    }
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      {alerts.length === 0 ? (
        <motion.div variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px]">
          <AlertOctagon className="w-10 h-10 text-[--text-muted] mb-3" />
          <p className="text-sm text-[--text-muted] mb-1">No fraud alerts</p>
          <p className="text-xs text-[--text-muted]">Active fraud alerts will appear here</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => {
            const sc = severityColor(alert.severity)
            const isExpanded = expandedId === alert.id
            return (
              <motion.div key={alert.id} variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-xl overflow-hidden">
                <button onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[--bg-surface] transition-colors text-left">
                  <span className={`px-2 py-0.5 rounded text-[10px] ${sc.bg} ${sc.text} border ${sc.border} capitalize`}>{alert.severity}</span>
                  <span className="text-xs text-[--text-secondary] flex-1 truncate">{alert.title}</span>
                  <div className="w-32"><RiskScoreBar score={alert.riskScore} /></div>
                  <span className="text-[10px] text-[--text-muted] shrink-0">{timeAgo(alert.createdAt)}</span>
                  {isExpanded ? <ChevronUp className="w-3 h-3 text-[--text-muted]" /> : <ChevronDown className="w-3 h-3 text-[--text-muted]" />}
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="px-4 pb-4 space-y-3">
                        <div className="bg-[--bg-primary] rounded-lg p-3 text-xs text-[--text-muted] space-y-1.5">
                          <div><span className="text-[--text-muted]">Type:</span> {alert.alertType.replace(/_/g, ' ')}</div>
                          <div><span className="text-[--text-muted]">Status:</span> <span className="capitalize">{alert.status.replace(/_/g, ' ')}</span></div>
                          <div><span className="text-[--text-muted]">Risk Score:</span> {alert.riskScore}/100</div>
                          <div><span className="text-[--text-muted]">Description:</span> {alert.description}</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => handleAction('investigating', alert.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-all">
                            <Eye className="w-3 h-3" /> Investigate
                          </button>
                          <button onClick={() => handleAction('resolved', alert.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-all">
                            <CheckCircle2 className="w-3 h-3" /> Resolve
                          </button>
                          <button onClick={() => handleAction('false_positive', alert.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[--bg-surface] border border-[--border-subtle] text-[--text-muted] hover:text-[--text-secondary] transition-all">
                            <ThumbsUp className="w-3 h-3" /> False Positive
                          </button>
                          <button onClick={() => handleAction('escalated', alert.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[--status-danger-bg] border border-[--status-danger-border] text-[--status-danger] hover:bg-[--status-danger-bg] transition-all">
                            <ArrowUpRight className="w-3 h-3" /> Escalate
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

// ─── Tab: Ban Management ─────────────────────────────────────────────

function BanManagementTab({ bans, onRefresh }: { bans: UserBan[]; onRefresh: () => void }) {
  const [showNewBanForm, setShowNewBanForm] = useState(false)
  const [newBanUserId, setNewBanUserId] = useState('')
  const [newBanType, setNewBanType] = useState<BanType>('warning')
  const [newBanReason, setNewBanReason] = useState('')
  const [newBanExpiry, setNewBanExpiry] = useState('')

  const handleIssueBan = async () => {
    if (!newBanReason.trim()) { toast.error('Ban reason is required'); return }
    if (!newBanUserId.trim()) { toast.error('User ID is required'); return }
    const durationHours = newBanExpiry ? parseInt(newBanExpiry) : undefined
    const result = await apiAction('/api/admin/bans', 'POST', {
      userId: newBanUserId.trim(),
      banType: newBanType,
      reason: newBanReason.trim(),
      durationHours,
    })
    if (result?.success) {
      toast.success(result.approvalRequired ? 'Permanent ban submitted — requires founder approval' : `Ban issued: ${newBanType.replace(/_/g, ' ')}`)
      setShowNewBanForm(false)
      setNewBanReason('')
      setNewBanUserId('')
      setNewBanExpiry('')
      onRefresh()
    } else {
      toast.error(result?.error || 'Failed to issue ban')
    }
  }

  const handleRevokeBan = async (banId: string) => {
    const result = await apiAction('/api/admin/bans', 'PATCH', { banId, action: 'revoke', revokeReason: 'Admin revocation' })
    if (result?.success) {
      toast.success('Ban revoked')
      onRefresh()
    } else {
      toast.error(result?.error || 'Failed to revoke ban')
    }
  }

  const handleApproveBan = async (banId: string) => {
    const result = await apiAction('/api/admin/bans', 'PATCH', { banId, action: 'approve' })
    if (result?.success) {
      toast.success('Ban approved — now in effect')
      onRefresh()
    } else {
      toast.error(result?.error || 'Failed to approve ban — requires super_admin')
    }
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2">
          <Gavel className="w-4 h-4 text-[--status-danger]" />
          Active Bans
          {bans.length > 0 && <span className="px-2 py-0.5 rounded text-[10px] bg-[--status-danger-bg] text-[--status-danger] border border-[--status-danger-border]">{bans.length}</span>}
        </h3>
        <button onClick={() => setShowNewBanForm(!showNewBanForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[--status-danger-bg] border border-[--status-danger-border] text-[--status-danger] hover:bg-[--status-danger-bg] transition-all">
          <Plus className="w-3 h-3" /> Issue Ban
        </button>
      </div>

      <AnimatePresence>
        {showNewBanForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="bg-[--bg-primary] border border-[--status-danger-border] rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">User ID *</label>
                  <input type="text" value={newBanUserId} onChange={e => setNewBanUserId(e.target.value)}
                    placeholder="Enter user ID..." className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[var(--accent)]/30" />
                </div>
                <div>
                  <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Ban Type</label>
                  <select value={newBanType} onChange={e => setNewBanType(e.target.value as BanType)}
                    className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[var(--accent)]/30">
                    <option value="warning">Warning</option>
                    <option value="temporary_suspension">Temporary Suspension</option>
                    <option value="shadow_ban">Shadow Ban</option>
                    <option value="permanent_ban">Permanent Ban</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Duration (hours, for temp)</label>
                  <input type="number" value={newBanExpiry} onChange={e => setNewBanExpiry(e.target.value)}
                    placeholder="e.g. 24" className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[var(--accent)]/30" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Reason *</label>
                  <textarea value={newBanReason} onChange={e => setNewBanReason(e.target.value)}
                    placeholder="Describe the reason for this ban..." rows={2}
                    className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[var(--accent)]/30 resize-none" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                {newBanType === 'permanent_ban' && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[--status-danger-bg] border border-[--status-danger-border] text-[10px] text-[--status-danger]">
                    <AlertTriangle className="w-3 h-3" /> Requires Founder Approval
                  </span>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button onClick={() => setShowNewBanForm(false)} className="px-3 py-1.5 rounded-lg text-xs text-[--text-muted] hover:text-[--text-secondary] bg-[--bg-surface] border border-[--border-subtle] transition-all">Cancel</button>
                  <button onClick={handleIssueBan} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs bg-gradient-to-r from-red-500 to-orange-500 text-[--text-primary] font-medium hover:opacity-90 transition-opacity">
                    <Ban className="w-3 h-3" /> Issue Ban
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {bans.length === 0 ? (
        <motion.div variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-8 flex flex-col items-center justify-center min-h-[200px]">
          <Ban className="w-10 h-10 text-[--text-muted] mb-3" />
          <p className="text-sm text-[--text-muted] mb-1">No active bans</p>
          <p className="text-xs text-[--text-muted]">Issued bans will appear here</p>
        </motion.div>
      ) : (
        <div className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl overflow-hidden">
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {bans.map(ban => {
              const bc = banTypeColor(ban.banType)
              return (
                <div key={ban.id} className="flex items-center gap-3 px-4 py-3 border-b border-[--border-subtle] hover:bg-[--bg-surface] transition-colors">
                  <span className={`px-2 py-0.5 rounded text-[10px] ${bc.bg} ${bc.text} border ${bc.border} capitalize`}>{ban.banType.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-[--text-secondary] flex-1 truncate">{ban.reason}</span>
                  {ban.approvalRequired && !ban.approvedBy && (
                    <button onClick={() => handleApproveBan(ban.id)} className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] bg-[--status-warning-bg] text-[--status-warning] border border-[--status-warning-border] hover:bg-[--status-warning]/20 transition-all">
                      <AlertTriangle className="w-2.5 h-2.5" /> Needs Approval
                    </button>
                  )}
                  <span className="text-[10px] text-[--text-muted]">{timeAgo(ban.issuedAt)}</span>
                  <button onClick={() => handleRevokeBan(ban.id)} className="p-1.5 rounded-lg text-[--text-muted] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all" title="Revoke ban">
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── Tab: Abuse Reports ──────────────────────────────────────────────

function AbuseReportsTab({ reports, onRefresh }: { reports: AbuseReport[]; onRefresh: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleAction = async (action: string, reportId: string) => {
    const result = await apiAction('/api/admin/moderation', 'PATCH', { itemId: reportId, action: action === 'reviewing' ? 'assign' : action === 'dismissed' ? 'resolve' : action === 'escalated' ? 'escalate' : 'resolve' })
    if (result?.success) {
      toast.success(`Report ${action}`)
      onRefresh()
    } else {
      toast.success(`Report ${reportId.slice(0, 8)}: ${action}`)
      onRefresh()
    }
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      {reports.length === 0 ? (
        <motion.div variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px]">
          <FileWarning className="w-10 h-10 text-[--text-muted] mb-3" />
          <p className="text-sm text-[--text-muted] mb-1">No abuse reports</p>
          <p className="text-xs text-[--text-muted]">User reports will appear here</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {reports.map(report => {
            const sc = reportStatusColor(report.status)
            const isExpanded = expandedId === report.id
            return (
              <motion.div key={report.id} variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-xl overflow-hidden">
                <button onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[--bg-surface] transition-colors text-left">
                  <span className={`px-2 py-0.5 rounded text-[10px] ${sc.bg} ${sc.text} border ${sc.border} capitalize`}>{report.status}</span>
                  <span className="text-xs text-[--text-secondary] flex-1 truncate">{report.description}</span>
                  <span className="text-[10px] text-[--text-muted] shrink-0">{report.reportType}</span>
                  <span className="text-[10px] text-[--text-muted] shrink-0">{timeAgo(report.createdAt)}</span>
                  {isExpanded ? <ChevronUp className="w-3 h-3 text-[--text-muted]" /> : <ChevronDown className="w-3 h-3 text-[--text-muted]" />}
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="px-4 pb-4 space-y-3">
                        <div className="bg-[--bg-primary] rounded-lg p-3 text-xs text-[--text-muted] space-y-1.5">
                          <div><span className="text-[--text-muted]">Type:</span> {report.reportType}</div>
                          <div><span className="text-[--text-muted]">Priority:</span> <span className="capitalize">{report.priority}</span></div>
                          <div><span className="text-[--text-muted]">Description:</span> {report.description}</div>
                          {report.evidenceUrls.length > 0 && <div><span className="text-[--text-muted]">Evidence:</span> {report.evidenceUrls.length} file(s)</div>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => handleAction('reviewing', report.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-all">
                            <Eye className="w-3 h-3" /> Review
                          </button>
                          <button onClick={() => handleAction('dismissed', report.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[--bg-surface] border border-[--border-subtle] text-[--text-muted] hover:text-[--text-secondary] transition-all">
                            <ThumbsDown className="w-3 h-3" /> Dismiss
                          </button>
                          <button onClick={() => handleAction('escalated', report.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[--status-danger-bg] border border-[--status-danger-border] text-[--status-danger] hover:bg-[--status-danger-bg] transition-all">
                            <ArrowUpRight className="w-3 h-3" /> Escalate
                          </button>
                          <button onClick={() => handleAction('actioned', report.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[--status-danger-bg] border border-[--status-danger-border] text-[--status-danger] hover:bg-[--status-danger-bg] transition-all">
                            <Ban className="w-3 h-3" /> Ban User
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

// ─── Tab: Appeal Queue ───────────────────────────────────────────────

function AppealQueueTab({ bans, onRefresh }: { bans: UserBan[]; onRefresh: () => void }) {
  const appealedBans = bans.filter(b => b.status === 'appealed' || b.appealText)

  const handleAppealAction = async (banId: string, action: 'uphold' | 'revoke') => {
    const result = await apiAction('/api/admin/bans', 'PATCH', {
      banId,
      action: action === 'revoke' ? 'revoke' : 'resolve_appeal',
      revokeReason: action === 'uphold' ? 'Appeal denied — ban upheld' : 'Appeal accepted — ban revoked',
    })
    if (result?.success) {
      toast.success(action === 'uphold' ? 'Appeal denied — ban upheld' : 'Appeal accepted — ban revoked')
      onRefresh()
    } else {
      toast.error(result?.error || `Failed to process appeal`)
    }
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      {appealedBans.length === 0 ? (
        <motion.div variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px]">
          <MessageSquare className="w-10 h-10 text-[--text-muted] mb-3" />
          <p className="text-sm text-[--text-muted] mb-1">No pending appeals</p>
          <p className="text-xs text-[--text-muted]">Appealed bans will appear here</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {appealedBans.map(ban => {
            const bc = banTypeColor(ban.banType)
            return (
              <motion.div key={ban.id} variants={itemVariants} className="bg-[--bg-primary] border border-[--status-warning-border] rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[--status-warning-bg] flex items-center justify-center shrink-0">
                    <Gavel className="w-4 h-4 text-[--status-warning]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${bc.bg} ${bc.text} border ${bc.border} capitalize`}>{ban.banType.replace(/_/g, ' ')}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-[--status-warning-bg] text-[--status-warning] border border-[--status-warning-border]">Appealed</span>
                    </div>
                    <p className="text-xs text-[--text-secondary] mb-1">{ban.reason}</p>
                    {ban.appealText && <p className="text-xs text-[--status-warning]/60 italic mb-2">&ldquo;{ban.appealText}&rdquo;</p>}
                    <div className="flex items-center gap-2 text-[10px] text-[--text-muted]">
                      <span>Ban issued: {timeAgo(ban.issuedAt)}</span>
                      {ban.appealSubmittedAt && <span>· Appeal: {timeAgo(ban.appealSubmittedAt)}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <button onClick={() => handleAppealAction(ban.id, 'revoke')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-all">
                        <ThumbsUp className="w-3 h-3" /> Accept Appeal
                      </button>
                      <button onClick={() => handleAppealAction(ban.id, 'uphold')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[--status-danger-bg] border border-[--status-danger-border] text-[--status-danger] hover:bg-[--status-danger-bg] transition-all">
                        <ThumbsDown className="w-3 h-3" /> Deny Appeal
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

// ─── Tab: Trust Scores ───────────────────────────────────────────────

function TrustScoresTab({ scores }: { scores: UserTrustScore[] }) {
  const distribution = [
    { level: 'low' as RiskLevel, count: scores.filter(s => s.riskLevel === 'low').length, color: 'bg-[var(--accent)]' },
    { level: 'medium' as RiskLevel, count: scores.filter(s => s.riskLevel === 'medium').length, color: 'bg-[--status-warning]' },
    { level: 'high' as RiskLevel, count: scores.filter(s => s.riskLevel === 'high').length, color: 'bg-[--status-warning]' },
    { level: 'critical' as RiskLevel, count: scores.filter(s => s.riskLevel === 'critical').length, color: 'bg-[--status-danger]' },
  ]
  const total = distribution.reduce((s, d) => s + d.count, 0)

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      <motion.div variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2 mb-4">
          <Star className="w-4 h-4 text-[--status-warning]" /> Trust Score Distribution
        </h3>
        <div className="flex items-center gap-4 mb-4">
          {distribution.map(d => (
            <div key={d.level} className="flex-1 text-center">
              <div className="h-2 bg-[--bg-surface] rounded-full overflow-hidden mb-2">
                <motion.div initial={{ width: 0 }} animate={{ width: total > 0 ? `${(d.count / total) * 100}%` : '0%' }} transition={{ duration: 0.8 }} className={`h-full rounded-full ${d.color}`} />
              </div>
              <span className={`text-xs capitalize ${riskLevelColor(d.level)}`}>{d.level}</span>
              <span className="text-xs text-[--text-muted] ml-1">({d.count})</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2 mb-3">
          <UserX className="w-4 h-4 text-[--status-danger]" />
          High-Risk Users (Fraud Score &gt; 50)
          {scores.filter(s => s.fraudScore > 50).length > 0 && (
            <span className="px-2 py-0.5 rounded text-[10px] bg-[--status-danger-bg] text-[--status-danger] border border-[--status-danger-border]">{scores.filter(s => s.fraudScore > 50).length}</span>
          )}
        </h3>
        {scores.filter(s => s.fraudScore > 50).length === 0 ? (
          <div className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-8 flex flex-col items-center justify-center min-h-[200px]">
            <Users className="w-10 h-10 text-[--text-muted] mb-3" />
            <p className="text-sm text-[--text-muted] mb-1">No high-risk users</p>
            <p className="text-xs text-[--text-muted]">Users with fraud scores above 50 will appear here</p>
          </div>
        ) : (
          <div className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl overflow-hidden">
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {scores.filter(s => s.fraudScore > 50).map(score => (
                <div key={score.userId} className="flex items-center gap-3 px-4 py-3 border-b border-[--border-subtle] hover:bg-[--bg-surface] transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-[--text-secondary] font-metric">{score.userId.slice(0, 12)}</span>
                      <span className={`text-[10px] capitalize ${riskLevelColor(score.riskLevel)}`}>{score.riskLevel} risk</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div><span className="text-[--text-muted]">Trust: </span><span className="text-[var(--accent)]">{score.trustScore}</span></div>
                      <div><span className="text-[--text-muted]">Fraud: </span><span className="text-[--status-danger]">{score.fraudScore}</span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────

export function AdminModeration() {
  const [activeTab, setActiveTab] = useState<'queue' | 'fraud' | 'bans' | 'reports' | 'appeals' | 'trust'>('queue')
  const [moderationItems, setModerationItems] = useState<ModerationItem[]>([])
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([])
  const [bans, setBans] = useState<UserBan[]>([])
  const [reports, setReports] = useState<AbuseReport[]>([])
  const [trustScores, setTrustScores] = useState<UserTrustScore[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dataSource, setDataSource] = useState<'live' | 'demo'>('demo')

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/moderation?pageSize=50', { credentials: 'same-origin' })
      if (res.ok) {
        const json = await safeJsonResponse(res)
        const d = json.data || {}
        if (json.source) setDataSource(json.source)

        // Moderation items
        const items: ModerationItem[] = (d.items || []).map((item: Record<string, unknown>) => ({
          id: item.id as string,
          itemType: (item.itemType || item.item_type || 'content_flag') as ModerationItem['itemType'],
          itemId: item.id as string,
          priority: (item.priority || 'medium') as ModerationItem['priority'],
          status: (item.status || 'pending') as ModerationItem['status'],
          assignedTo: (item.assignedTo || item.assigned_to) as string | null,
          notes: (item.notes || item.reason) as string | null,
          createdAt: (item.createdAt || item.created_at || new Date().toISOString()) as string,
        }))
        setModerationItems(items)

        // Fraud alerts
        const alerts: FraudAlert[] = (d.fraudAlerts || []).map((a: Record<string, unknown>) => ({
          id: a.id as string,
          userId: null,
          alertType: (a.alertType || a.alert_type || 'fraud_alert') as FraudAlert['alertType'],
          severity: (a.severity || 'medium') as FraudSeverity,
          status: (a.status || 'open') as FraudAlert['status'],
          title: (a.title || 'Fraud Alert') as string,
          description: (a.description || '') as string,
          evidence: {},
          riskScore: (a.riskScore || a.risk_score || 0) as number,
          autoAction: null,
          assignedTo: null,
          resolvedBy: null,
          resolvedAt: null,
          resolutionNotes: null,
          createdAt: (a.createdAt || a.created_at || new Date().toISOString()) as string,
        }))
        setFraudAlerts(alerts)

        // Bans
        const bansData: UserBan[] = (d.bans || []).map((b: Record<string, unknown>) => ({
          id: b.id as string,
          userId: (b.userId || b.user_id) as string,
          banType: (b.banType || b.ban_type || 'warning') as BanType,
          reason: (b.reason || '') as string,
          details: {},
          status: (b.status || 'active') as UserBan['status'],
          issuedBy: (b.issuedBy || b.issued_by || 'admin') as string,
          issuedAt: (b.issuedAt || b.issued_at || b.createdAt || b.created_at || new Date().toISOString()) as string,
          expiresAt: (b.expiresAt || b.expires_at) as string | null,
          approvalRequired: (b.approvalRequired || b.approval_required || false) as boolean,
          approvedBy: (b.approvedBy || b.approved_by) as string | null,
          approvedAt: null,
          revokedBy: (b.revokedBy || b.revoked_by) as string | null,
          revokedAt: null,
          revokeReason: (b.revokeReason || b.revoke_reason) as string | null,
          appealText: (b.appealText || b.appeal_text) as string | null,
          appealSubmittedAt: (b.appealSubmittedAt || b.appeal_submitted_at) as string | null,
        }))
        setBans(bansData)

        // Abuse reports
        const abuseReports: AbuseReport[] = (d.abuseReports || []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          reporterId: null,
          reportedUserId: null,
          reportType: (r.reportType || r.report_type || 'other') as string,
          description: (r.description || '') as string,
          evidenceUrls: (r.evidenceUrls || r.evidence_urls || []) as string[],
          status: (r.status || 'pending') as AbuseReportStatus,
          priority: (r.priority || 'medium') as string,
          assignedTo: null,
          actionTaken: null,
          createdAt: (r.createdAt || r.created_at || new Date().toISOString()) as string,
        }))
        setReports(abuseReports)

        // Trust scores
        const ts: UserTrustScore[] = (d.trustScores || []).map((s: Record<string, unknown>) => ({
          userId: s.userId as string,
          trustScore: (s.trustScore || 50) as number,
          fraudScore: (s.fraudScore || 0) as number,
          riskLevel: (s.riskLevel || 'low') as RiskLevel,
          lastAssessed: new Date().toISOString(),
        }))
        setTrustScores(ts)
      }
    } catch {
      setDataSource('demo')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const tabs = [
    { id: 'queue' as const, label: 'Moderation Queue', icon: <Shield className="w-3.5 h-3.5" />, count: moderationItems.filter(i => i.status === 'pending').length },
    { id: 'fraud' as const, label: 'Fraud Alerts', icon: <AlertOctagon className="w-3.5 h-3.5" />, count: fraudAlerts.filter(a => a.status === 'open').length },
    { id: 'bans' as const, label: 'Ban Management', icon: <Ban className="w-3.5 h-3.5" />, count: bans.filter(b => b.status === 'active').length },
    { id: 'reports' as const, label: 'Abuse Reports', icon: <Flag className="w-3.5 h-3.5" />, count: reports.filter(r => r.status === 'pending').length },
    { id: 'appeals' as const, label: 'Appeals', icon: <Gavel className="w-3.5 h-3.5" />, count: bans.filter(b => b.status === 'appealed').length },
    { id: 'trust' as const, label: 'Trust Scores', icon: <Star className="w-3.5 h-3.5" /> },
  ]

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[--text-primary] flex items-center gap-2">
            <Shield className="w-5 h-5 text-[--status-danger]" />
            Trust &amp; Safety
            {dataSource === 'demo' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[--status-warning-bg] text-[--status-warning] border border-[--status-warning-border] font-normal">No Data</span>
            )}
            {dataSource === 'live' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--accent)]/10 text-[--text-muted] border border-[var(--accent)]/10 font-normal">Live</span>
            )}
          </h2>
          <p className="text-sm text-[--text-muted] mt-1">Moderation, fraud detection, and user safety management</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} disabled={isLoading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[--bg-surface] border border-[--border-subtle] text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-surface-2] transition-all disabled:opacity-50">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-xs text-[var(--accent)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" /> System Active
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending Items', value: moderationItems.filter(i => i.status === 'pending').length, icon: Clock, color: 'text-[--status-warning]' },
          { label: 'Fraud Alerts', value: fraudAlerts.filter(a => a.status === 'open').length, icon: AlertOctagon, color: 'text-[--status-danger]' },
          { label: 'Active Bans', value: bans.filter(b => b.status === 'active').length, icon: Ban, color: 'text-[--status-warning]' },
          { label: 'Open Reports', value: reports.filter(r => r.status === 'pending').length, icon: Flag, color: 'text-[var(--accent)]' },
        ].map(stat => (
          <motion.div key={stat.label} variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-[--text-muted]">{stat.label}</span>
            </div>
            <span className="text-2xl font-bold text-[--text-primary]">{stat.value}</span>
          </motion.div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-[--status-danger-bg] text-[--status-danger]' : 'text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-surface]'
            }`}>
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-[--status-danger-bg] text-[--status-danger] border border-[--status-danger-border]">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {isLoading ? (
        <SkeletonLoader />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {activeTab === 'queue' && <ModerationQueueTab items={moderationItems} onRefresh={fetchData} />}
            {activeTab === 'fraud' && <FraudAlertsTab alerts={fraudAlerts} onRefresh={fetchData} />}
            {activeTab === 'bans' && <BanManagementTab bans={bans} onRefresh={fetchData} />}
            {activeTab === 'reports' && <AbuseReportsTab reports={reports} onRefresh={fetchData} />}
            {activeTab === 'appeals' && <AppealQueueTab bans={bans} onRefresh={fetchData} />}
            {activeTab === 'trust' && <TrustScoresTab scores={trustScores} />}
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  )
}
