'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import {
  Ticket, Clock, Star, Gauge,
  TrendingDown, AlertTriangle, MessageSquare,
  ShoppingCart, CheckCircle2, Users, ArrowUpRight, ArrowDownRight,
  Phone, Mail, Share2, Radar, Headphones,
  Inbox, Lightbulb, BarChart3, UsersRound,
  Plus, Trash2, Edit3, Send, X, RefreshCw, Loader2,
  UserCircle, Tag, Filter, Download
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts'

// ─── Types ──────────────────────────────────────────────────
interface TicketTrendPoint {
  date: string
  opened: number
  resolved: number
}

interface CommonIssue {
  issue: string
  count: number
}

type FeatureRequestStatus = 'Under Review' | 'Planned' | 'In Progress' | 'Shipped'
type FeatureRequestPriority = 'High' | 'Medium' | 'Low'

interface FeatureRequest {
  feature: string
  votes: number
  status: FeatureRequestStatus
  priority: FeatureRequestPriority
}

type PainPointIconType = 'alert' | 'check' | 'cart' | 'chat'

interface PainPoint {
  title: string
  value: string
  description: string
  iconType: PainPointIconType
}

interface TopAgent {
  name: string
  tickets: number
  avatar: string
}

interface ResolutionChannel {
  channel: string
  percentage: number
  color: string
}

interface SupportKPIs {
  openTickets: number
  avgResolutionHours: number
  satisfactionScore: number
  npsScore: number
  firstResponseMinutes: number
  weeklyDelta: {
    openTickets: number
    resolutionHours: number
    firstResponseMinutes: number
  }
}

interface SupportTicket {
  id: string
  subject: string
  description: string
  category: string
  status: string
  priority: string
  userEmail: string | null
  userName: string | null
  assignedTo: string | null
  resolutionNotes: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

interface SupportData {
  kpis: SupportKPIs
  ticketTrend: TicketTrendPoint[]
  commonIssues: CommonIssue[]
  featureRequests: FeatureRequest[]
  painPoints: PainPoint[]
  topAgents: TopAgent[]
  resolutionChannels: ResolutionChannel[]
  tickets: SupportTicket[]
  total: number
}

// ─── Animation variants ────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
}

// ─── Status badge helper ───────────────────────────────────
function getStatusColor(status: FeatureRequestStatus | string) {
  switch (status) {
    case 'Under Review': return 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'
    case 'Planned': return 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'
    case 'In Progress': return 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'
    case 'Shipped': return 'bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20'
    default: return 'bg-[--bg-surface] text-[--text-muted] border-[--border-subtle]'
  }
}

function getTicketStatusBadge(status: string) {
  switch (status) {
    case 'open': return 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'
    case 'in_progress': return 'bg-[--status-warning-bg] text-[--status-warning] border-[--status-warning-border]'
    case 'resolved': return 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'
    case 'closed': return 'bg-[--bg-surface] text-[--text-muted] border-[--border-subtle]'
    default: return 'bg-[--bg-surface] text-[--text-muted] border-[--border-subtle]'
  }
}

function getPriorityColor(priority: FeatureRequestPriority | string) {
  switch (priority) {
    case 'High': case 'high': case 'urgent': return 'bg-[--status-danger-bg] text-[--status-danger] border-[--status-danger-border]'
    case 'Medium': case 'medium': return 'bg-[--status-warning-bg] text-[--status-warning] border-[--status-warning-border]'
    case 'Low': case 'low': return 'bg-[--status-neutral-bg] text-[--status-neutral] border-[--status-neutral-border]'
    default: return 'bg-[--bg-surface] text-[--text-muted] border-[--border-subtle]'
  }
}

// ─── Pain point icon mapping ───────────────────────────────
function getPainPointIcon(iconType: PainPointIconType) {
  switch (iconType) {
    case 'alert': return AlertTriangle
    case 'check': return CheckCircle2
    case 'cart': return ShoppingCart
    case 'chat': return MessageSquare
  }
}

// ─── Semicircular Gauge Component ───────────────────────────
function SemicircularGauge({ value, max, label, color, unit = '' }: { value: number; max: number; label: string; color: string; unit?: string }) {
  const percentage = Math.min(value / max, 1)
  const angle = percentage * 180
  const radius = 52
  const cx = 64
  const cy = 64
  const strokeWidth = 10

  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const angleRad = ((angleDeg - 180) * Math.PI) / 180
    return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) }
  }

  const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(cx, cy, r, endAngle)
    const end = polarToCartesian(cx, cy, r, startAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
  }

  return (
    <div className="flex flex-col items-center">
      <svg width="128" height="74" viewBox="0 0 128 74">
        <path d={describeArc(cx, cy, radius, 0, 180)} fill="none" stroke="var(--border-subtle)" strokeWidth={strokeWidth} strokeLinecap="round" />
        {value > 0 && <path d={describeArc(cx, cy, radius, 0, angle)} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" opacity={0.85} />}
        {value > 0 && <path d={describeArc(cx, cy, radius, 0, angle)} fill="none" stroke={color} strokeWidth={strokeWidth + 6} strokeLinecap="round" opacity={0.1} filter="blur(4px)" />}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text-primary)" fontSize="18" fontWeight="bold">
          {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="var(--text-muted)" fontSize="9">{unit}</text>
      </svg>
      <span className="text-[10px] text-[--text-muted] mt-1">{label}</span>
    </div>
  )
}

// ─── Star Rating ───────────────────────────────────────────
function StarRating({ score, max = 5 }: { score: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.floor(score)
        const partial = !filled && i < score
        return (
          <div key={i} className="relative">
            <Star className={`w-4 h-4 ${filled ? 'text-[#10B981] fill-[#10B981]' : 'text-[--text-muted]'}`} />
            {partial && (
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${(score - Math.floor(score)) * 100}%` }}>
                <Star className="w-4 h-4 text-[#10B981] fill-[#10B981]" />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Custom Tooltip ────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null
  return (
    <div className="bg-[--bg-surface] border border-[#10B981]/20 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-[--text-muted] mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs font-medium" style={{ color: entry.color }}>{entry.name}: {entry.value}</p>
      ))}
    </div>
  )
}

// ─── Radar Sweep Animation ─────────────────────────────────
function RadarSweep() {
  return (
    <div className="relative w-8 h-8">
      <svg viewBox="0 0 32 32" className="w-full h-full">
        <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(14,165,233,0.15)" strokeWidth="0.5" />
        <circle cx="16" cy="16" r="9" fill="none" stroke="rgba(14,165,233,0.1)" strokeWidth="0.5" />
        <circle cx="16" cy="16" r="4" fill="none" stroke="rgba(14,165,233,0.08)" strokeWidth="0.5" />
        <line x1="16" y1="16" x2="16" y2="2" stroke="#0EA5E9" strokeWidth="1" opacity="0.6">
          <animateTransform attributeName="transform" type="rotate" from="0 16 16" to="360 16 16" dur="3s" repeatCount="indefinite" />
        </line>
        <circle cx="16" cy="16" r="1.5" fill="#0EA5E9" opacity="0.8">
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  )
}

// ─── Empty State Component ─────────────────────────────────
function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-xl bg-[#10B981]/5 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-[--text-muted]" />
      </div>
      <p className="text-sm text-[--text-muted] font-medium">{title}</p>
      <p className="text-xs text-[--text-muted] mt-1 max-w-[240px]">{description}</p>
    </div>
  )
}

// ─── Create Ticket Modal ───────────────────────────────────
function CreateTicketModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [priority, setPriority] = useState('medium')
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim()) { toast.error('Subject is required'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ subject, description, category, priority, userEmail: userEmail || null, userName: userName || null }),
      })
      if (res.ok) {
        toast.success('Ticket created successfully')
        onCreated()
        onClose()
      } else {
        const data = await safeJsonResponse(res)
        toast.error(data.error || 'Failed to create ticket')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-[--bg-surface] border border-[#10B981]/20 rounded-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
              <Plus className="w-5 h-5 text-[#10B981]" />
            </div>
            <h3 className="text-lg font-semibold text-[--text-primary]">Create Support Ticket</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-surface] transition-all"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-[--text-muted] font-medium uppercase tracking-wider">Subject *</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full mt-1.5 px-3 py-2 bg-[--bg-surface] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/40" placeholder="Brief description of the issue" />
          </div>
          <div>
            <label className="text-xs text-[--text-muted] font-medium uppercase tracking-wider">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full mt-1.5 px-3 py-2 bg-[--bg-surface] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/40 resize-none" placeholder="Detailed description..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[--text-muted] font-medium uppercase tracking-wider">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full mt-1.5 px-3 py-2 bg-[--bg-surface] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#10B981]/40">
                {['general', 'technical', 'billing', 'account', 'feature_request', 'bug_report'].map(c => <option key={c} value={c} className="bg-[--bg-surface]">{c.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[--text-muted] font-medium uppercase tracking-wider">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full mt-1.5 px-3 py-2 bg-[--bg-surface] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#10B981]/40">
                {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p} className="bg-[--bg-surface]">{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[--text-muted] font-medium uppercase tracking-wider">User Email</label>
              <input value={userEmail} onChange={e => setUserEmail(e.target.value)} className="w-full mt-1.5 px-3 py-2 bg-[--bg-surface] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/40" placeholder="user@example.com" />
            </div>
            <div>
              <label className="text-xs text-[--text-muted] font-medium uppercase tracking-wider">User Name</label>
              <input value={userName} onChange={e => setUserName(e.target.value)} className="w-full mt-1.5 px-3 py-2 bg-[--bg-surface] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/40" placeholder="John Doe" />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-[--border-subtle] text-sm text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-surface] transition-all">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-lg bg-[#10B981]/20 border border-[#10B981]/30 text-sm text-[#10B981] hover:bg-[#10B981]/30 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Create Ticket
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── Main Component ────────────────────────────────────────
export function AdminSupport() {
  const [data, setData] = useState<SupportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'tickets'>('overview')
  const [ticketFilter, setTicketFilter] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/support?section=all', { credentials: 'same-origin' })
      if (res.status === 401) {
        const { useAdminAuthStore } = await import('@/stores/admin-auth-store')
        useAdminAuthStore.getState().logoutAdmin()
        return
      }
      if (res.ok) {
        const json = await safeJsonResponse(res)
        if (json.data) {
          setData(json.data as SupportData)
        }
      }
    } catch (err) {
      console.error('[AdminSupport] Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleTicketAction = async (ticketId: string, action: string, extra: Record<string, string> = {}) => {
    setActionLoading(ticketId + action)
    try {
      const res = await fetch('/api/admin/support', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ ticketId, status: action, ...extra }),
      })
      if (res.ok) {
        toast.success(`Ticket ${action === 'resolved' ? 'resolved' : action === 'closed' ? 'closed' : 'updated'}`)
        fetchData()
      } else {
        const err = await safeJsonResponse(res)
        toast.error(err.error || 'Failed to update ticket')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Delete this ticket?')) return
    setActionLoading(ticketId + 'delete')
    try {
      const res = await fetch(`/api/admin/support?ticketId=${ticketId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (res.ok) {
        toast.success('Ticket deleted')
        fetchData()
      } else {
        toast.error('Failed to delete ticket')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setActionLoading(null)
    }
  }

  const kpis = data?.kpis ?? { openTickets: 0, avgResolutionHours: 0, satisfactionScore: 0, npsScore: 0, firstResponseMinutes: 0, weeklyDelta: { openTickets: 0, resolutionHours: 0, firstResponseMinutes: 0 } }
  const ticketTrend = data?.ticketTrend ?? []
  const commonIssues = data?.commonIssues ?? []
  const featureRequests = data?.featureRequests ?? []
  const painPoints = data?.painPoints ?? []
  const topAgents = data?.topAgents ?? []
  const resolutionChannels = data?.resolutionChannels ?? []
  const tickets = data?.tickets ?? []
  const filteredTickets = ticketFilter === 'all' ? tickets : tickets.filter(t => t.status === ticketFilter)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-[--bg-surface] border border-[#10B981]/10 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <RadarSweep />
            <div>
              <h2 className="text-xl font-bold text-[--text-primary]">Help Desk Radar</h2>
              <p className="text-sm text-[--text-muted] mt-0.5">Loading support data...</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-[--bg-surface] border border-[#10B981]/10 rounded-xl p-5 h-40 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 mb-4" />
              <div className="h-4 bg-[#10B981]/5 rounded w-2/3 mb-2" />
              <div className="h-8 bg-[#10B981]/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* ── Header with action buttons ─────────────────────── */}
      <motion.div variants={itemVariants} className="bg-[--bg-surface] border border-[#10B981]/10 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 opacity-[0.04] pointer-events-none">
          <svg viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="#0EA5E9" strokeWidth="1" />
            <circle cx="100" cy="100" r="60" fill="none" stroke="#0EA5E9" strokeWidth="0.5" />
          </svg>
        </div>
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <RadarSweep />
            <div>
              <h2 className="text-xl font-bold text-[--text-primary]">Help Desk Radar</h2>
              <p className="text-sm text-[--text-muted] mt-0.5">Monitor tickets, analyze pain points, and track feature requests</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Tab switcher */}
            <div className="flex items-center bg-[--bg-surface] rounded-lg p-0.5">
              <button onClick={() => setActiveTab('overview')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'overview' ? 'bg-[#10B981]/20 text-[#10B981]' : 'text-[--text-muted] hover:text-[--text-secondary]'}`}>Overview</button>
              <button onClick={() => setActiveTab('tickets')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'tickets' ? 'bg-[#10B981]/20 text-[#10B981]' : 'text-[--text-muted] hover:text-[--text-secondary]'}`}>Tickets ({data?.total || 0})</button>
            </div>
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#10B981]/20 border border-[#10B981]/30 text-[#10B981] text-sm hover:bg-[#10B981]/30 transition-all">
              <Plus className="w-4 h-4" /> New Ticket
            </button>
            <button onClick={fetchData} className="p-2 rounded-lg text-[--text-muted] hover:text-[#10B981] hover:bg-[#10B981]/10 transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>
            {/* Export buttons */}
            <button
              onClick={async () => {
                try {
                  const res = await fetch('/api/admin/export?type=audit-logs&format=csv', { credentials: 'same-origin' })
                  if (res.ok) {
                    const json = await safeJsonResponse(res)
                    const blob = new Blob([json.data], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `support-export-${new Date().toISOString().split('T')[0]}.csv`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                    toast.success('Support data exported as CSV')
                  }
                } catch { toast.error('Export failed') }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[--bg-surface] border border-[--border-subtle] text-[--text-muted] hover:text-[--text-secondary] transition-colors"
            >
              <Download className="w-3 h-3" /> CSV
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── TICKETS TAB ────────────────────────────────────── */}
      {activeTab === 'tickets' && (
        <motion.div variants={itemVariants} className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-[--text-muted]" />
            {['all', 'open', 'in_progress', 'resolved', 'closed'].map(f => (
              <button key={f} onClick={() => setTicketFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${ticketFilter === f ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30' : 'bg-[--bg-surface] text-[--text-muted] border border-[--border-subtle] hover:text-[--text-secondary]'}`}>
                {f === 'all' ? 'All' : f.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Ticket List */}
          {filteredTickets.length > 0 ? (
            <div className="max-h-[500px] overflow-y-auto space-y-2">
              {filteredTickets.map(ticket => (
                <motion.div key={ticket.id} layout variants={itemVariants} className="bg-[--bg-surface] border border-[#10B981]/10 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getTicketStatusBadge(ticket.status)}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                        <span className="text-[10px] text-[--text-muted] font-metric">{ticket.category}</span>
                      </div>
                      <h4 className="text-sm font-medium text-[--text-primary] truncate">{ticket.subject}</h4>
                      {ticket.description && <p className="text-xs text-[--text-muted] mt-0.5 line-clamp-2">{ticket.description}</p>}
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-[--text-muted]">
                        {ticket.userName && <span className="flex items-center gap-1"><UserCircle className="w-3 h-3" />{ticket.userName}</span>}
                        {ticket.userEmail && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{ticket.userEmail}</span>}
                        {ticket.assignedTo && <span className="flex items-center gap-1"><Headphones className="w-3 h-3" />{ticket.assignedTo}</span>}
                        <span className="font-metric">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {ticket.status === 'open' && (
                        <button onClick={() => handleTicketAction(ticket.id, 'in_progress')} disabled={!!actionLoading} className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-[--status-warning-bg] border border-[--status-warning-border] text-[--status-warning] hover:bg-[--status-warning]/20 transition-all disabled:opacity-30">
                          {actionLoading === ticket.id + 'in_progress' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'In Progress'}
                        </button>
                      )}
                      {(ticket.status === 'open' || ticket.status === 'in_progress') && (
                        <button onClick={() => handleTicketAction(ticket.id, 'resolved')} disabled={!!actionLoading} className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/20 transition-all disabled:opacity-30">
                          {actionLoading === ticket.id + 'resolved' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Resolve'}
                        </button>
                      )}
                      {ticket.status === 'resolved' && (
                        <button onClick={() => handleTicketAction(ticket.id, 'closed')} disabled={!!actionLoading} className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-[--bg-surface] border border-[--border-subtle] text-[--text-muted] hover:text-[--text-secondary] transition-all disabled:opacity-30">
                          Close
                        </button>
                      )}
                      {(ticket.status === 'closed' || ticket.status === 'resolved') && (
                        <button onClick={() => handleTicketAction(ticket.id, 'open')} disabled={!!actionLoading} className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/20 transition-all disabled:opacity-30">
                          Reopen
                        </button>
                      )}
                      <button onClick={() => handleDeleteTicket(ticket.id)} disabled={!!actionLoading} className="p-1.5 rounded-lg text-[--text-muted] hover:text-[--status-danger] hover:bg-[--status-danger-bg] transition-all disabled:opacity-30" title="Delete ticket">
                        {actionLoading === ticket.id + 'delete' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-[--bg-surface] border border-[#10B981]/10 rounded-xl p-8">
              <EmptyState icon={Inbox} title={ticketFilter === 'all' ? 'No support tickets yet' : `No ${ticketFilter.replace('_', ' ')} tickets`} description="Create a new ticket to get started, or tickets from users will appear here automatically." />
            </div>
          )}
        </motion.div>
      )}

      {/* ── OVERVIEW TAB ───────────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div variants={itemVariants} className="bg-[--bg-surface] border border-[#10B981]/10 rounded-xl p-5 flex flex-col items-center">
              <div className="flex items-center justify-between w-full mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center"><Ticket className="w-4 h-4 text-[#10B981]" /></div>
                {kpis.weeklyDelta.openTickets !== 0 && (
                  <span className={`flex items-center gap-1 text-[10px] ${kpis.weeklyDelta.openTickets > 0 ? 'text-[--status-danger]' : 'text-[#10B981]'}`}>
                    {kpis.weeklyDelta.openTickets > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {kpis.weeklyDelta.openTickets > 0 ? '+' : ''}{kpis.weeklyDelta.openTickets} this week
                  </span>
                )}
              </div>
              <SemicircularGauge value={kpis.openTickets} max={50} label="Open Tickets" color="#3B82F6" />
            </motion.div>
            <motion.div variants={itemVariants} className="bg-[--bg-surface] border border-[#10B981]/10 rounded-xl p-5 flex flex-col items-center">
              <div className="flex items-center justify-between w-full mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center"><Clock className="w-4 h-4 text-[#10B981]" /></div>
              </div>
              <SemicircularGauge value={kpis.avgResolutionHours} max={10} label="Avg Resolution (hours)" color="#10B981" unit="hours" />
            </motion.div>
            <motion.div variants={itemVariants} className="bg-[--bg-surface] border border-[#10B981]/10 rounded-xl p-5 flex flex-col items-center">
              <div className="flex items-center justify-between w-full mb-3">
                <div className="w-8 h-8 rounded-lg bg-[--status-warning-bg] flex items-center justify-center"><Star className="w-4 h-4 text-[--status-warning]" /></div>
              </div>
              <SemicircularGauge value={kpis.satisfactionScore} max={5} label="Satisfaction Score" color="#059669" unit="/5.0" />
              {kpis.satisfactionScore > 0 && <div className="mt-2"><StarRating score={kpis.satisfactionScore} /></div>}
            </motion.div>
            <motion.div variants={itemVariants} className="bg-[--bg-surface] border border-[#10B981]/10 rounded-xl p-5 flex flex-col items-center">
              <div className="flex items-center justify-between w-full mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center"><Gauge className="w-4 h-4 text-[#10B981]" /></div>
              </div>
              <SemicircularGauge value={kpis.npsScore} max={100} label="NPS Score" color="#0EA5E9" />
            </motion.div>
          </div>

          {/* Ticket Trend */}
          <motion.div variants={itemVariants} className="bg-[--bg-surface] border border-[#10B981]/10 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-[--text-primary]">Ticket Trend</h3>
                <p className="text-xs text-[--text-muted] mt-0.5">Opened vs Resolved — Last 30 days</p>
              </div>
              {ticketTrend.length > 0 && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /><span className="text-xs text-[--text-muted]">Opened</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" /><span className="text-xs text-[--text-muted]">Resolved</span></div>
                </div>
              )}
            </div>
            {ticketTrend.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ticketTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="skyOpenedGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.35} /><stop offset="100%" stopColor="#0EA5E9" stopOpacity={0} /></linearGradient>
                      <linearGradient id="skyResolvedGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25} /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={{ stroke: 'var(--border-subtle)' }} tickLine={false} interval={4} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="opened" stroke="#0EA5E9" strokeWidth={2} fill="url(#skyOpenedGradient)" name="Opened" />
                    <Area type="monotone" dataKey="resolved" stroke="#3B82F6" strokeWidth={2} fill="url(#skyResolvedGradient)" name="Resolved" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={BarChart3} title="No ticket trend data yet" description="Ticket trends will appear here once support tickets are created and tracked over time." />
            )}
          </motion.div>

          {/* Common Issues */}
          <motion.div variants={itemVariants} className="bg-[--bg-surface] border border-[#10B981]/10 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-[--text-primary]">Common Issues</h3>
                <p className="text-xs text-[--text-muted] mt-0.5">Top reported issues by frequency</p>
              </div>
              <TrendingDown className="w-4 h-4 text-[--text-muted]" />
            </div>
            {commonIssues.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={commonIssues} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="issue" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} width={120} />
                    <Tooltip content={<CustomTooltip />} />
                    <defs>
                      <linearGradient id="skyBarGradient" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.9} /><stop offset="100%" stopColor="#3B82F6" stopOpacity={0.6} /></linearGradient>
                    </defs>
                    <Bar dataKey="count" name="Reports" fill="url(#skyBarGradient)" radius={[0, 6, 6, 0]} maxBarSize={18} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={Inbox} title="No support issues yet" description="Common issues will be displayed here once tickets are categorized and tracked." />
            )}
          </motion.div>

          {/* Pain Points */}
          <motion.div variants={itemVariants}>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[--text-primary]">User Pain Points</h3>
              <p className="text-xs text-[--text-muted] mt-0.5">Key drop-off and engagement issues</p>
            </div>
            {painPoints.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {painPoints.map((point) => {
                  const Icon = getPainPointIcon(point.iconType)
                  return (
                    <motion.div key={point.title} variants={itemVariants} className="bg-[--bg-surface] border border-[#10B981]/10 rounded-xl p-5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#10B981]/60 via-[#10B981]/40 to-transparent" />
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-9 h-9 rounded-lg bg-[#10B981]/10 flex items-center justify-center"><Icon className="w-4.5 h-4.5 text-[#10B981]" /></div>
                        <span className="text-xl font-bold text-[#10B981]">{point.value}</span>
                      </div>
                      <p className="text-sm font-medium text-[--text-primary]">{point.title}</p>
                      <p className="text-xs text-[--text-muted] mt-1">{point.description}</p>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="bg-[--bg-surface] border border-[#10B981]/10 rounded-xl p-5">
                <EmptyState icon={AlertTriangle} title="No pain points identified yet" description="User drop-off and engagement issues will be displayed here once analytics data is collected." />
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* Create Ticket Modal */}
      <AnimatePresence>
        {showCreateModal && <CreateTicketModal onClose={() => setShowCreateModal(false)} onCreated={fetchData} />}
      </AnimatePresence>
    </motion.div>
  )
}
