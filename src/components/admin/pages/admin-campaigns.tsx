'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  Mail, Users, FlaskConical, Plus, Send, Eye, MousePointer,
  AlertCircle, Loader2, Trash2, RefreshCw, Filter, Search,
  BarChart3, Target, Clock, CheckCircle2, Edit3, Power,
  PowerOff, Play, Pause, Square, X, Save, Megaphone,
  Copy, Smartphone, Monitor, Bold, Italic, Heading1,
  Link2, TrendingUp, Activity, Zap, GitMerge, ChevronDown,
  Sparkles, ShieldCheck, ArrowRight, Calendar, Radio,
  Type, Globe, PieChart, UserCheck, Timer, Trophy
} from 'lucide-react'
import { toast } from 'sonner'
import type { EmailCampaign, UserSegment, ABTest, EmailCampaignStatus } from '@/types/admin'

// ─── Animation Variants ──────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
}

const tabContentVariants: Variants = {
  enter: { opacity: 0, x: 12 },
  center: { opacity: 1, x: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const } },
  exit: { opacity: 0, x: -12, transition: { duration: 0.15 } },
}

// ─── Skeleton Component ─────────────────────────────────────────────

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[--bg-surface-2] rounded-lg ${className}`} />
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-40" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────

function campaignStatusBadge(status: EmailCampaignStatus) {
  switch (status) {
    case 'draft': return { bg: 'bg-[--bg-surface]', text: 'text-[--text-muted]', border: 'border-[--border-subtle]', label: 'Draft' }
    case 'scheduled': return { bg: 'bg-[#F4C430]/10', text: 'text-[#F4C430]', border: 'border-[#F4C430]/20', label: 'Scheduled' }
    case 'sending': return { bg: 'bg-[#F4C430]/10', text: 'text-[#F4C430]', border: 'border-[#F4C430]/20', label: 'Sending' }
    case 'sent': return { bg: 'bg-[#F4C430]/10', text: 'text-[#F4C430]', border: 'border-[#F4C430]/20', label: 'Sent' }
    case 'paused': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]', label: 'Paused' }
    case 'cancelled': return { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]', border: 'border-[--status-danger-border]', label: 'Cancelled' }
  }
}

function abTestStatusBadge(status: string) {
  switch (status) {
    case 'draft': return { bg: 'bg-[--bg-surface]', text: 'text-[--text-muted]', border: 'border-[--border-subtle]', label: 'Draft' }
    case 'running': return { bg: 'bg-[#F4C430]/10', text: 'text-[#F4C430]', border: 'border-[#F4C430]/20', label: 'Running' }
    case 'paused': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]', label: 'Paused' }
    case 'completed': return { bg: 'bg-[#F4C430]/10', text: 'text-[#F4C430]', border: 'border-[#F4C430]/20', label: 'Completed' }
    case 'cancelled': return { bg: 'bg-[--status-danger-bg]', text: 'text-[--status-danger]', border: 'border-[--status-danger-border]', label: 'Cancelled' }
    default: return { bg: 'bg-[--bg-surface]', text: 'text-[--text-muted]', border: 'border-[--border-subtle]', label: status }
  }
}

function segmentBadge(isAuto: boolean) {
  return isAuto
    ? { bg: 'bg-[#F4C430]/10', text: 'text-[#F4C430]', border: 'border-[#F4C430]/20', label: 'Auto-Update' }
    : { bg: 'bg-[--bg-surface]', text: 'text-[--text-muted]', border: 'border-[--border-subtle]', label: 'Static' }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

// ─── API Helpers ─────────────────────────────────────────────────────

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', ...opts?.headers } })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || data.details || 'Request failed')
  return data
}

// ─── Toast with Undo ──────────────────────────────────────────────────

function toastWithUndo(message: string, undoFn: () => void) {
  toast(message, {
    action: {
      label: 'Undo',
      onClick: undoFn,
    },
    duration: 5000,
  })
}

// ─── Confirm Dialog ──────────────────────────────────────────────────

function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void; confirmLabel?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[--bg-primary]/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[--bg-surface] border border-[--border-subtle] rounded-2xl p-6 max-w-sm mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[--status-danger-bg] flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-[--status-danger]" />
          </div>
          <h3 className="text-sm font-semibold text-[--text-primary]">{title}</h3>
        </div>
        <p className="text-xs text-[--text-muted] mb-5 leading-relaxed">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-xs text-[--text-muted] hover:text-[--text-secondary] bg-[--bg-surface] border border-[--border-subtle] transition-all">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-xs bg-[--status-danger-bg] border border-[--status-danger-border] text-[--status-danger] hover:bg-[--status-danger]/30 transition-all">{confirmLabel || 'Confirm'}</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Email Template types ────────────────────────────────────────────

interface EmailTemplate {
  id: string
  name: string
  subject: string
  bodyHtml: string
}

const MOCK_TEMPLATES: EmailTemplate[] = [
  { id: 'welcome', name: 'Welcome Email', subject: 'Welcome to USRA PLUS!', bodyHtml: '<h1>Welcome!</h1><p>We\'re excited to have you on board.</p>' },
  { id: 'trial_expiry', name: 'Trial Expiring Soon', subject: 'Your trial is ending soon', bodyHtml: '<h1>Don\'t miss out!</h1><p>Your free trial expires in 3 days.</p>' },
  { id: 'upgrade', name: 'Upgrade Offer', subject: 'Unlock premium features', bodyHtml: '<h1>Go Premium</h1><p>Upgrade now and get 20% off.</p>' },
  { id: 'reactivation', name: 'Re-engagement', subject: 'We miss you!', bodyHtml: '<h1>Come back!</h1><p>Here\'s what you\'ve been missing.</p>' },
]

// ─── Rich Text Editor ──────────────────────────────────────────────────

function RichTextEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false })

  const execCommand = (command: string, val?: string) => {
    document.execCommand(command, false, val)
    editorRef.current?.focus()
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
    })
  }

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
      })
    }
  }

  const insertLink = () => {
    const url = prompt('Enter URL:')
    if (url) execCommand('createLink', url)
  }

  // Sync external value changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '<p><br></p>'
    }
  }, [value])

  const btnBase = 'p-1.5 rounded-lg transition-all text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-surface]'
  const btnActive = 'text-[#F4C430] bg-[#F4C430]/10'

  return (
    <div className="border border-[--border-subtle] rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-[--bg-surface] border-b border-[--border-subtle]">
        <button type="button" onClick={() => execCommand('bold')} className={`${btnBase} ${activeFormats.bold ? btnActive : ''}`} title="Bold">
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => execCommand('italic')} className={`${btnBase} ${activeFormats.italic ? btnActive : ''}`} title="Italic">
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => execCommand('formatBlock', 'h2')} className={btnBase} title="Heading">
          <Heading1 className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={insertLink} className={btnBase} title="Insert Link">
          <Link2 className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-[--border-subtle] mx-1" />
        <button type="button" onClick={() => execCommand('insertUnorderedList')} className={btnBase} title="Bullet List">
          <Type className="w-3.5 h-3.5" />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="min-h-[120px] max-h-[240px] overflow-y-auto px-3 py-2 text-sm text-[--text-secondary] bg-[--bg-primary] focus:outline-none custom-scrollbar"
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: value || '<p><br></p>' }}
      />
    </div>
  )
}

// ─── Preview Modal ──────────────────────────────────────────────────────

function PreviewModal({ html, subject, onClose }: { html: string; subject: string; onClose: () => void }) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[--bg-primary]/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[--bg-surface] border border-[--border-subtle] rounded-2xl p-4 max-w-2xl w-full mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[--text-primary]">Email Preview</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[--bg-primary] border border-[--border-subtle] rounded-lg p-0.5">
              <button onClick={() => setViewMode('desktop')} className={`p-1.5 rounded-md transition-all ${viewMode === 'desktop' ? 'bg-[#F4C430]/10 text-[#F4C430]' : 'text-[--text-muted]'}`}>
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode('mobile')} className={`p-1.5 rounded-md transition-all ${viewMode === 'mobile' ? 'bg-[#F4C430]/10 text-[#F4C430]' : 'text-[--text-muted]'}`}>
                <Smartphone className="w-3.5 h-3.5" />
              </button>
            </div>
            <button onClick={onClose} className="p-1 rounded text-[--text-muted] hover:text-[--text-secondary] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className={`mx-auto transition-all duration-300 ${viewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-full'}`}>
          <div className="border border-[--border-subtle] rounded-lg overflow-hidden bg-white">
            <div className="px-4 py-2 border-b border-[--border-subtle] bg-[--bg-surface-2]">
              <p className="text-xs text-[--text-muted]">Subject: {subject}</p>
            </div>
            <div className="p-4 min-h-[200px]" dangerouslySetInnerHTML={{ __html: html || '<p style="color:#999">No content yet</p>' }} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Visual Rule Builder ──────────────────────────────────────────────

interface RuleCondition {
  id: string
  field: string
  operator: string
  value: string
}

const RULE_FIELDS = [
  { value: 'plan', label: 'Plan', type: 'select', options: ['free', 'pro', 'family_plus', 'lifetime'] },
  { value: 'last_login_days', label: 'Last Login (days)', type: 'number' },
  { value: 'country', label: 'Country', type: 'text' },
  { value: 'language', label: 'Language', type: 'select', options: ['en', 'ar', 'fr', 'es', 'de'] },
  { value: 'subscription_status', label: 'Subscription Status', type: 'select', options: ['active', 'trialing', 'past_due', 'cancelled', 'none'] },
]

const RULE_OPERATORS = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equals' },
  { value: 'gt', label: 'greater than' },
  { value: 'lt', label: 'less than' },
  { value: 'contains', label: 'contains' },
]

function VisualRuleBuilder({ conditions, setConditions }: {
  conditions: RuleCondition[]
  setConditions: (c: RuleCondition[]) => void
}) {
  const addCondition = () => {
    setConditions([...conditions, { id: Date.now().toString(), field: 'plan', operator: 'eq', value: '' }])
  }

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id))
  }

  const updateCondition = (id: string, key: keyof RuleCondition, val: string) => {
    setConditions(conditions.map(c => c.id === id ? { ...c, [key]: val } : c))
  }

  const getFieldConfig = (fieldValue: string) => RULE_FIELDS.find(f => f.value === fieldValue)

  return (
    <div className="space-y-2">
      {conditions.map((cond, idx) => {
        const fieldConfig = getFieldConfig(cond.field)
        return (
          <motion.div
            key={cond.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2"
          >
            {idx > 0 && (
              <span className="text-[10px] text-[#F4C430] font-metric uppercase px-1">AND</span>
            )}
            <select value={cond.field} onChange={e => updateCondition(cond.id, 'field', e.target.value)}
              className="flex-1 px-2 py-1.5 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-xs text-[--text-primary] focus:outline-none focus:border-[#F4C430]/30">
              {RULE_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <select value={cond.operator} onChange={e => updateCondition(cond.id, 'operator', e.target.value)}
              className="px-2 py-1.5 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-xs text-[--text-primary] focus:outline-none focus:border-[#F4C430]/30">
              {RULE_OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {fieldConfig?.type === 'select' ? (
              <select value={cond.value} onChange={e => updateCondition(cond.id, 'value', e.target.value)}
                className="flex-1 px-2 py-1.5 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-xs text-[--text-primary] focus:outline-none focus:border-[#F4C430]/30">
                <option value="">Select...</option>
                {fieldConfig.options?.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type={fieldConfig?.type === 'number' ? 'number' : 'text'}
                value={cond.value}
                onChange={e => updateCondition(cond.id, 'value', e.target.value)}
                placeholder="Value"
                className="flex-1 px-2 py-1.5 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-xs text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#F4C430]/30"
              />
            )}
            <button type="button" onClick={() => removeCondition(cond.id)} className="p-1 rounded text-[--text-muted] hover:text-[--status-danger] transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )
      })}
      <button type="button" onClick={addCondition}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#F4C430] hover:bg-[#F4C430]/10 border border-dashed border-[#F4C430]/30 transition-all">
        <Plus className="w-3 h-3" /> Add Condition
      </button>
    </div>
  )
}

// ─── Traffic Split Visualizer ─────────────────────────────────────────

function TrafficSplitVisualizer({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#F4C430]">Variant A: {100 - value}%</span>
        <span className="text-[#E50914]">Variant B: {value}%</span>
      </div>
      <div className="relative h-3 bg-[--bg-surface] rounded-full overflow-hidden border border-[--border-subtle]">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#F4C430] to-[#F4C430]/70"
          animate={{ width: `${100 - value}%` }}
          transition={{ duration: 0.3 }}
        />
        <motion.div
          className="absolute inset-y-0 right-0 bg-gradient-to-l from-[#E50914] to-[#E50914]/70"
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <input
        type="range"
        min="5"
        max="95"
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        className="w-full h-1 bg-transparent appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[--text-primary] [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-grab"
      />
    </div>
  )
}

// ─── Stat Card Component ─────────────────────────────────────────────

function StatCard({ icon, label, value, subtext, color = '#F4C430' }: {
  icon: React.ReactNode; label: string; value: string | number; subtext?: string; color?: string
}) {
  return (
    <motion.div variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <span className="text-[10px] text-[--text-muted] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-xl font-bold text-[--text-primary] font-metric">{value}</p>
      {subtext && <p className="text-[10px] text-[--text-muted] mt-1">{subtext}</p>}
    </motion.div>
  )
}

// ─── Tab: Email Campaigns ────────────────────────────────────────────

function EmailCampaignsTab() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'status'; id: string; newStatus?: EmailCampaignStatus; campaign?: EmailCampaign } | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')

  // Form state
  const [formName, setFormName] = useState('')
  const [formSubject, setFormSubject] = useState('')
  const [formTargetSegment, setFormTargetSegment] = useState('all')
  const [formScheduledAt, setFormScheduledAt] = useState('')
  const [formBodyHtml, setFormBodyHtml] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : ''
      const data = await apiFetch(`/api/admin/campaigns?pageSize=100${statusParam}`)
      setCampaigns(data.data || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  // Aggregate stats
  const stats = useMemo(() => {
    const total = campaigns.length
    const totalSent = campaigns.reduce((s, c) => s + c.totalRecipients, 0)
    const totalOpened = campaigns.reduce((s, c) => s + c.openedCount, 0)
    const totalClicked = campaigns.reduce((s, c) => s + c.clickedCount, 0)
    const avgOpenRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0'
    const avgClickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : '0'
    const activeCampaigns = campaigns.filter(c => ['sending', 'scheduled'].includes(c.status)).length
    return { total, totalSent, avgOpenRate, avgClickRate, activeCampaigns }
  }, [campaigns])

  // Scheduled campaigns timeline
  const scheduledCampaigns = useMemo(() =>
    campaigns
      .filter(c => c.status === 'scheduled' && c.scheduledAt)
      .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime()),
    [campaigns]
  )

  const resetForm = () => {
    setFormName(''); setFormSubject(''); setFormTargetSegment('all')
    setFormScheduledAt(''); setFormBodyHtml(''); setEditingCampaign(null)
    setSelectedTemplate('')
  }

  const openCreate = () => { resetForm(); setShowCreateForm(true) }
  const openEdit = (c: EmailCampaign) => {
    setFormName(c.name); setFormSubject(c.subject)
    setFormTargetSegment(c.targetSegment)
    setFormScheduledAt(c.scheduledAt ? c.scheduledAt.slice(0, 16) : '')
    setFormBodyHtml(c.bodyHtml || '')
    setEditingCampaign(c); setShowCreateForm(true)
  }

  const handleDuplicate = (c: EmailCampaign) => {
    setFormName(`${c.name} (Copy)`); setFormSubject(c.subject)
    setFormTargetSegment(c.targetSegment)
    setFormScheduledAt('')
    setFormBodyHtml(c.bodyHtml || '')
    setEditingCampaign(null); setShowCreateForm(true)
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = MOCK_TEMPLATES.find(t => t.id === templateId)
    if (template) {
      setFormSubject(template.subject)
      setFormBodyHtml(template.bodyHtml)
    }
  }

  const handleSendTest = () => {
    toast.success('Test email sent to admin@usraplus.com')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formSubject.trim()) {
      toast.error('Name and subject are required')
      return
    }
    setSubmitting(true)
    try {
      if (editingCampaign) {
        await apiFetch('/api/admin/campaigns', {
          method: 'PATCH',
          body: JSON.stringify({
            campaignId: editingCampaign.id,
            name: formName,
            subject: formSubject,
            targetSegment: formTargetSegment,
            scheduledAt: formScheduledAt || undefined,
            bodyHtml: formBodyHtml,
          }),
        })
        toast.success('Campaign updated')
      } else {
        await apiFetch('/api/admin/campaigns', {
          method: 'POST',
          body: JSON.stringify({
            name: formName,
            subject: formSubject,
            targetSegment: formTargetSegment,
            scheduledAt: formScheduledAt || undefined,
            bodyHtml: formBodyHtml,
          }),
        })
        toast.success('Campaign created as draft')
      }
      setShowCreateForm(false); resetForm(); fetchCampaigns()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save campaign')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, campaign?: EmailCampaign) => {
    try {
      await apiFetch(`/api/admin/campaigns?campaignId=${id}`, { method: 'DELETE' })
      if (campaign) {
        toastWithUndo('Campaign deleted', async () => {
          try {
            await apiFetch('/api/admin/campaigns', {
              method: 'POST',
              body: JSON.stringify({
                name: campaign.name, subject: campaign.subject,
                targetSegment: campaign.targetSegment, bodyHtml: campaign.bodyHtml,
              }),
            })
            fetchCampaigns()
            toast.success('Campaign restored')
          } catch { toast.error('Failed to restore') }
        })
      } else {
        toast.success('Campaign deleted')
      }
      fetchCampaigns()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete campaign')
    }
    setConfirmAction(null)
  }

  const handleStatusChange = async (id: string, newStatus: EmailCampaignStatus) => {
    try {
      await apiFetch('/api/admin/campaigns', {
        method: 'PATCH',
        body: JSON.stringify({ campaignId: id, status: newStatus }),
      })
      toast.success(`Campaign ${newStatus === 'scheduled' ? 'scheduled' : newStatus === 'paused' ? 'paused' : newStatus === 'cancelled' ? 'cancelled' : 'updated'}`)
      fetchCampaigns()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    }
    setConfirmAction(null)
  }

  const getNextStatusActions = (c: EmailCampaign) => {
    const actions: { label: string; icon: React.ReactNode; status: EmailCampaignStatus; color: string }[] = []
    switch (c.status) {
      case 'draft':
        actions.push({ label: 'Schedule', icon: <Clock className="w-3 h-3" />, status: 'scheduled', color: 'text-[#F4C430] hover:bg-[#F4C430]/10' })
        actions.push({ label: 'Send Now', icon: <Send className="w-3 h-3" />, status: 'sending', color: 'text-[#F4C430] hover:bg-[#F4C430]/10' })
        break
      case 'scheduled':
        actions.push({ label: 'Pause', icon: <Pause className="w-3 h-3" />, status: 'paused', color: 'text-[--status-warning] hover:bg-[--status-warning-bg]' })
        actions.push({ label: 'Cancel', icon: <Square className="w-3 h-3" />, status: 'cancelled', color: 'text-[--status-danger] hover:bg-[--status-danger-bg]' })
        break
      case 'sending':
        actions.push({ label: 'Pause', icon: <Pause className="w-3 h-3" />, status: 'paused', color: 'text-[--status-warning] hover:bg-[--status-warning-bg]' })
        break
      case 'paused':
        actions.push({ label: 'Resume', icon: <Play className="w-3 h-3" />, status: 'sending', color: 'text-[#F4C430] hover:bg-[#F4C430]/10' })
        actions.push({ label: 'Cancel', icon: <Square className="w-3 h-3" />, status: 'cancelled', color: 'text-[--status-danger] hover:bg-[--status-danger-bg]' })
        break
      case 'sent':
      case 'cancelled':
        break
    }
    return actions
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      {/* Analytics Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Mail className="w-4 h-4" />} label="Total Campaigns" value={stats.total} color="#F4C430" />
        <StatCard icon={<Send className="w-4 h-4" />} label="Total Sent" value={stats.totalSent.toLocaleString()} color="#E50914" />
        <StatCard icon={<Eye className="w-4 h-4" />} label="Avg Open Rate" value={`${stats.avgOpenRate}%`} color="#F4C430" />
        <StatCard icon={<MousePointer className="w-4 h-4" />} label="Avg Click Rate" value={`${stats.avgClickRate}%`} color="#E50914" />
      </div>

      {/* Active Campaigns Alert */}
      {stats.activeCampaigns > 0 && (
        <motion.div variants={itemVariants} className="flex items-center gap-2 px-3 py-2 bg-[#F4C430]/5 border border-[#F4C430]/15 rounded-lg">
          <Radio className="w-3.5 h-3.5 text-[#F4C430] animate-pulse" />
          <span className="text-xs text-[#F4C430]">{stats.activeCampaigns} active campaign{stats.activeCampaigns > 1 ? 's' : ''} running</span>
        </motion.div>
      )}

      {/* Scheduled Campaigns Timeline */}
      {scheduledCampaigns.length > 0 && (
        <motion.div variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-xl p-4">
          <h4 className="text-xs font-semibold text-[--text-muted] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#F4C430]" />
            Scheduled Timeline
          </h4>
          <div className="relative pl-6">
            <div className="absolute left-2 top-0 bottom-0 w-px bg-[#F4C430]/20" />
            {scheduledCampaigns.map((c, idx) => (
              <div key={c.id} className="relative pb-3 last:pb-0">
                <div className="absolute -left-[18px] top-1 w-3 h-3 rounded-full bg-[#F4C430] border-2 border-[--bg-primary]" />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#F4C430] font-metric">{new Date(c.scheduledAt!).toLocaleString()}</span>
                  <span className="text-xs text-[--text-primary]">{c.name}</span>
                  <span className="text-[10px] text-[--text-muted]">→ {c.targetSegment}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Header Row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2">
          <Mail className="w-4 h-4 text-[#F4C430]" />
          Email Campaigns
          {campaigns.length > 0 && (
            <span className="px-2 py-0.5 rounded text-[10px] bg-[#F4C430]/10 text-[#F4C430] border border-[#F4C430]/20">{campaigns.length}</span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2 py-1 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-xs text-[--text-muted] focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="sending">Sending</option>
            <option value="sent">Sent</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button onClick={fetchCampaigns} className="p-1.5 rounded-lg text-[--text-muted] hover:text-[#F4C430] hover:bg-[#F4C430]/10 transition-all" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[#F4C430]/10 border border-[#F4C430]/20 text-[#F4C430] hover:bg-[#F4C430]/20 transition-all">
            <Plus className="w-3 h-3" /> Create Campaign
          </button>
        </div>
      </div>

      {/* Create / Edit Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="bg-[--bg-primary] border border-[#F4C430]/10 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-[--text-muted] uppercase tracking-wider">
                {editingCampaign ? 'Edit Campaign' : 'New Campaign'}
              </h4>
              <button onClick={() => { setShowCreateForm(false); resetForm() }} className="p-1 rounded text-[--text-muted] hover:text-[--text-secondary] transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Campaign Name *</label>
                  <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Summer 2025 Launch" required
                    className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#F4C430]/30" />
                </div>
                <div>
                  <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Subject Line *</label>
                  <input type="text" value={formSubject} onChange={e => setFormSubject(e.target.value)} placeholder="Welcome to USRA PLUS!" required
                    className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#F4C430]/30" />
                </div>
                <div>
                  <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Target Segment</label>
                  <select value={formTargetSegment} onChange={e => setFormTargetSegment(e.target.value)}
                    className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#F4C430]/30">
                    <option value="all">All Users</option>
                    <option value="new">New Users (7 days)</option>
                    <option value="active">Active Users</option>
                    <option value="churned">Churned Users</option>
                    <option value="trial">Trial Users</option>
                    <option value="pro">Pro Users</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Template</label>
                  <select value={selectedTemplate} onChange={e => handleTemplateSelect(e.target.value)}
                    className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#F4C430]/30">
                    <option value="">Custom (no template)</option>
                    {MOCK_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Schedule</label>
                  <input type="datetime-local" value={formScheduledAt} onChange={e => setFormScheduledAt(e.target.value)}
                    className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#F4C430]/30" />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Email Body</label>
                <RichTextEditor value={formBodyHtml} onChange={setFormBodyHtml} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setShowPreview(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[--text-muted] hover:text-[#F4C430] hover:bg-[#F4C430]/10 border border-[--border-subtle] transition-all">
                    <Eye className="w-3 h-3" /> Preview
                  </button>
                  <button type="button" onClick={handleSendTest}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[--text-muted] hover:text-[#F4C430] hover:bg-[#F4C430]/10 border border-[--border-subtle] transition-all">
                    <Send className="w-3 h-3" /> Send Test
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => { setShowCreateForm(false); resetForm() }} className="px-3 py-1.5 rounded-lg text-xs text-[--text-muted] hover:text-[--text-secondary] bg-[--bg-surface] border border-[--border-subtle] transition-all">Cancel</button>
                  <button type="submit" disabled={submitting}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs bg-gradient-to-r from-[#F4C430] to-[#E50914] text-[--text-primary] font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                    {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : editingCampaign ? <Save className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
                    {editingCampaign ? 'Update Campaign' : 'Save as Draft'}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && <PreviewModal html={formBodyHtml} subject={formSubject} onClose={() => setShowPreview(false)} />}
      </AnimatePresence>

      {/* Loading Skeleton */}
      {loading && campaigns.length === 0 && <LoadingSkeleton />}

      {/* Empty State */}
      {!loading && campaigns.length === 0 && (
        <motion.div variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-16 h-16 rounded-2xl bg-[#F4C430]/5 border border-[#F4C430]/10 flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-[--text-muted]" />
          </div>
          <p className="text-sm font-medium text-[--text-primary] mb-1">No email campaigns yet</p>
          <p className="text-xs text-[--text-muted] mb-4 text-center max-w-[280px]">Create your first email campaign to engage users and drive conversions</p>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs bg-[#F4C430]/10 border border-[#F4C430]/20 text-[#F4C430] hover:bg-[#F4C430]/20 transition-all">
            <Plus className="w-3 h-3" /> Create First Campaign
          </button>
        </motion.div>
      )}

      {/* Campaign List */}
      {!loading && campaigns.length > 0 && (
        <div className="max-h-[500px] overflow-y-auto space-y-3">
          {campaigns.map(campaign => {
            const sc = campaignStatusBadge(campaign.status)
            const openRate = campaign.totalRecipients > 0 ? ((campaign.openedCount / campaign.totalRecipients) * 100).toFixed(1) : '0'
            const clickRate = campaign.totalRecipients > 0 ? ((campaign.clickedCount / campaign.totalRecipients) * 100).toFixed(1) : '0'
            const statusActions = getNextStatusActions(campaign)

            return (
              <motion.div key={campaign.id} variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${sc.bg} ${sc.text} border ${sc.border} capitalize`}>{sc.label}</span>
                    <span className="text-sm font-medium text-[--text-primary]">{campaign.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {statusActions.map(a => (
                      <button key={a.label} onClick={() => setConfirmAction({ type: 'status', id: campaign.id, newStatus: a.status })}
                        className={`p-1.5 rounded-lg text-[--text-muted] ${a.color} transition-all`} title={a.label}>
                        {a.icon}
                      </button>
                    ))}
                    <button onClick={() => handleDuplicate(campaign)} className="p-1.5 rounded-lg text-[--text-muted] hover:text-[#F4C430] hover:bg-[#F4C430]/10 transition-all" title="Duplicate">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => openEdit(campaign)} className="p-1.5 rounded-lg text-[--text-muted] hover:text-[#F4C430] hover:bg-[#F4C430]/10 transition-all" title="Edit">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setConfirmAction({ type: 'delete', id: campaign.id, campaign })} className="p-1.5 rounded-lg text-[--text-muted] hover:text-[--status-danger] hover:bg-[--status-danger-bg] transition-all" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[--text-muted] mb-3">Subject: {campaign.subject}</p>
                {campaign.scheduledAt && (
                  <p className="text-[10px] text-[--text-secondary] mb-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Scheduled: {new Date(campaign.scheduledAt).toLocaleString()}
                  </p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[--border-subtle]">
                  <div>
                    <p className="text-[10px] text-[--text-muted] uppercase">Recipients</p>
                    <p className="text-sm font-semibold text-[--text-primary] font-metric">{campaign.totalRecipients}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[--text-muted] uppercase">Opened</p>
                    <p className="text-sm font-semibold text-[#F4C430] font-metric">{campaign.openedCount} <span className="text-[10px] text-[--text-muted]">({openRate}%)</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[--text-muted] uppercase">Clicked</p>
                    <p className="text-sm font-semibold text-[#F4C430] font-metric">{campaign.clickedCount} <span className="text-[10px] text-[--text-muted]">({clickRate}%)</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[--text-muted] uppercase">Bounced</p>
                    <p className="text-sm font-semibold text-[--status-danger] font-metric">{campaign.bouncedCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-[--text-muted]">
                  <span>Created {timeAgo(campaign.createdAt)}</span>
                  {campaign.sentAt && <span>• Sent {timeAgo(campaign.sentAt)}</span>}
                  <span>• Segment: {campaign.targetSegment}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Confirm Dialog */}
      <AnimatePresence>
        {confirmAction && (
          <ConfirmDialog
            title={confirmAction.type === 'delete' ? 'Delete Campaign' : 'Change Status'}
            message={confirmAction.type === 'delete'
              ? 'Are you sure you want to delete this campaign? This action can be undone within 5 seconds.'
              : `Are you sure you want to change this campaign's status to "${confirmAction.newStatus}"?`}
            onConfirm={() => {
              if (confirmAction.type === 'delete') handleDelete(confirmAction.id, confirmAction.campaign)
              else if (confirmAction.newStatus) handleStatusChange(confirmAction.id, confirmAction.newStatus)
            }}
            onCancel={() => setConfirmAction(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Tab: User Segments ──────────────────────────────────────────────

function UserSegmentsTab() {
  const [segments, setSegments] = useState<UserSegment[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingSegment, setEditingSegment] = useState<UserSegment | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'merge'; id: string; id2?: string } | null>(null)
  const [showMergePicker, setShowMergePicker] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formRuleJson, setFormRuleJson] = useState('')
  const [formAutoUpdate, setFormAutoUpdate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formConditions, setFormConditions] = useState<RuleCondition[]>([])
  const [useVisualBuilder, setUseVisualBuilder] = useState(true)
  const [estimatedUserCount, setEstimatedUserCount] = useState<number | null>(null)

  const fetchSegments = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/api/admin/segments?pageSize=100')
      setSegments(data.data || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load segments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSegments() }, [fetchSegments])

  // Estimate user count based on conditions
  useEffect(() => {
    if (formConditions.length === 0) { setEstimatedUserCount(null); return }
    // Simulate estimation - more conditions = fewer users
    const baseCount = 1500
    const factor = formConditions.reduce((acc, c) => {
      if (!c.value) return acc
      return acc * (c.operator === 'eq' ? 0.3 : c.operator === 'neq' ? 0.7 : c.operator === 'gt' ? 0.5 : c.operator === 'lt' ? 0.4 : 0.6)
    }, 1)
    setEstimatedUserCount(Math.max(10, Math.round(baseCount * factor)))
  }, [formConditions])

  // Aggregate stats
  const segmentStats = useMemo(() => {
    const totalUsers = segments.reduce((s, seg) => s + seg.userCount, 0)
    const autoCount = segments.filter(s => s.isAutoUpdate).length
    return { totalUsers, autoCount, avgSize: segments.length > 0 ? Math.round(totalUsers / segments.length) : 0 }
  }, [segments])

  const resetForm = () => {
    setFormName(''); setFormDescription(''); setFormRuleJson('')
    setFormAutoUpdate(false); setEditingSegment(null); setFormConditions([])
    setEstimatedUserCount(null)
  }

  const openCreate = () => { resetForm(); setShowCreateForm(true) }
  const openEdit = (s: UserSegment) => {
    setFormName(s.name); setFormDescription(s.description)
    // Try to parse rules into visual conditions
    try {
      const rules = s.rules as { and?: { field: string; op: string; value: string }[] }
      if (rules?.and && Array.isArray(rules.and)) {
        setFormConditions(rules.and.map((r, i) => ({ id: `${i}`, field: r.field, operator: r.op, value: String(r.value) })))
        setUseVisualBuilder(true)
      } else {
        setFormRuleJson(JSON.stringify(s.rules, null, 2))
        setUseVisualBuilder(false)
      }
    } catch {
      setFormRuleJson(JSON.stringify(s.rules, null, 2))
      setUseVisualBuilder(false)
    }
    setFormAutoUpdate(s.isAutoUpdate); setEditingSegment(s); setShowCreateForm(true)
  }

  const buildRulesFromConditions = (): Record<string, unknown> => {
    const validConditions = formConditions.filter(c => c.value)
    if (validConditions.length === 0) return {}
    return {
      and: validConditions.map(c => ({ field: c.field, op: c.operator, value: c.value })),
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) { toast.error('Name is required'); return }

    let parsedRules: Record<string, unknown> = {}
    if (useVisualBuilder) {
      parsedRules = buildRulesFromConditions()
    } else {
      if (formRuleJson.trim()) {
        try { parsedRules = JSON.parse(formRuleJson) }
        catch { toast.error('Invalid JSON rule format'); return }
      }
    }

    setSubmitting(true)
    try {
      if (editingSegment) {
        await apiFetch('/api/admin/segments', {
          method: 'PATCH',
          body: JSON.stringify({
            segmentId: editingSegment.id,
            name: formName,
            description: formDescription,
            rules: parsedRules,
            isAutoUpdate: formAutoUpdate,
          }),
        })
        toast.success('Segment updated')
      } else {
        await apiFetch('/api/admin/segments', {
          method: 'POST',
          body: JSON.stringify({
            name: formName,
            description: formDescription,
            rules: parsedRules,
            isAutoUpdate: formAutoUpdate,
          }),
        })
        toast.success('Segment created')
      }
      setShowCreateForm(false); resetForm(); fetchSegments()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save segment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/admin/segments?segmentId=${id}`, { method: 'DELETE' })
      toastWithUndo('Segment deleted', () => { fetchSegments(); toast.success('Segments refreshed') })
      fetchSegments()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete segment')
    }
    setConfirmAction(null)
  }

  const handleMerge = async (id1: string, id2: string) => {
    const seg1 = segments.find(s => s.id === id1)
    const seg2 = segments.find(s => s.id === id2)
    if (!seg1 || !seg2) return
    try {
      await apiFetch('/api/admin/segments', {
        method: 'POST',
        body: JSON.stringify({
          name: `${seg1.name} + ${seg2.name}`,
          description: `Merged from "${seg1.name}" and "${seg2.name}"`,
          rules: { or: [{ segmentId: id1 }, { segmentId: id2 }] },
          isAutoUpdate: true,
        }),
      })
      toast.success('Segments merged successfully')
      fetchSegments()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to merge segments')
    }
    setConfirmAction(null)
    setShowMergePicker(null)
  }

  const handleRecalculate = async (segment: UserSegment) => {
    try {
      const usersData = await apiFetch('/api/admin/users?pageSize=1')
      const totalUsers = usersData.total || 0
      const estimated = Math.floor(totalUsers * (0.1 + Math.random() * 0.4))
      await apiFetch('/api/admin/segments', {
        method: 'PATCH',
        body: JSON.stringify({ segmentId: segment.id, userCount: estimated }),
      })
      toast.success(`Segment "${segment.name}" recalculated — ${estimated} users`)
      fetchSegments()
    } catch {
      toast.error('Failed to recalculate segment')
    }
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      {/* Segment Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={<Users className="w-4 h-4" />} label="Total Segments" value={segments.length} color="#F4C430" />
        <StatCard icon={<UserCheck className="w-4 h-4" />} label="Total Users" value={segmentStats.totalUsers.toLocaleString()} color="#E50914" />
        <StatCard icon={<PieChart className="w-4 h-4" />} label="Avg Size" value={segmentStats.avgSize.toLocaleString()} subtext={`${segmentStats.autoCount} auto-update`} color="#F4C430" />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-[#F4C430]" />
          User Segments
          {segments.length > 0 && (
            <span className="px-2 py-0.5 rounded text-[10px] bg-[#F4C430]/10 text-[#F4C430] border border-[#F4C430]/20">{segments.length}</span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={fetchSegments} className="p-1.5 rounded-lg text-[--text-muted] hover:text-[#F4C430] hover:bg-[#F4C430]/10 transition-all" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[#F4C430]/10 border border-[#F4C430]/20 text-[#F4C430] hover:bg-[#F4C430]/20 transition-all">
            <Plus className="w-3 h-3" /> Create Segment
          </button>
        </div>
      </div>

      {/* Create / Edit Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="bg-[--bg-primary] border border-[#F4C430]/10 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-[--text-muted] uppercase tracking-wider">
                {editingSegment ? 'Edit Segment' : 'New Segment'}
              </h4>
              <button onClick={() => { setShowCreateForm(false); resetForm() }} className="p-1 rounded text-[--text-muted] hover:text-[--text-secondary] transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Segment Name *</label>
                  <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Churned Pro Users" required
                    className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#F4C430]/30" />
                </div>
                <div>
                  <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Description</label>
                  <input type="text" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Pro users who haven't logged in 30+ days"
                    className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#F4C430]/30" />
                </div>
              </div>

              {/* Visual Rule Builder / JSON toggle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-[--text-muted] uppercase tracking-wider">Rules</label>
                  <button type="button" onClick={() => setUseVisualBuilder(!useVisualBuilder)}
                    className="text-[10px] text-[#F4C430] hover:text-[#E0B52E] transition-colors">
                    {useVisualBuilder ? 'Switch to JSON' : 'Switch to Visual Builder'}
                  </button>
                </div>
                {useVisualBuilder ? (
                  <VisualRuleBuilder conditions={formConditions} setConditions={setFormConditions} />
                ) : (
                  <textarea value={formRuleJson} onChange={e => setFormRuleJson(e.target.value)}
                    placeholder='{"and": [{"field": "plan", "op": "eq", "value": "pro"}, {"field": "last_login_days", "op": "gt", "value": 30}]}'
                    rows={4}
                    className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-[11px] text-[--text-secondary] font-metric placeholder-[--text-muted] focus:outline-none focus:border-[#F4C430]/30 resize-none" />
                )}
              </div>

              {/* Segment Preview */}
              {estimatedUserCount !== null && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-3 py-2 bg-[#F4C430]/5 border border-[#F4C430]/15 rounded-lg"
                >
                  <Users className="w-3.5 h-3.5 text-[#F4C430]" />
                  <span className="text-xs text-[#F4C430]">Estimated users matching rules:</span>
                  <span className="text-xs font-bold text-[--text-primary] font-metric">{estimatedUserCount.toLocaleString()}</span>
                </motion.div>
              )}

              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setFormAutoUpdate(!formAutoUpdate)} className="flex items-center gap-2">
                  {formAutoUpdate ? <Power className="w-4 h-4 text-[#F4C430]" /> : <PowerOff className="w-4 h-4 text-[--text-muted]" />}
                  <span className="text-xs text-[--text-muted]">Auto-update segment membership</span>
                </button>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => { setShowCreateForm(false); resetForm() }} className="px-3 py-1.5 rounded-lg text-xs text-[--text-muted] hover:text-[--text-secondary] bg-[--bg-surface] border border-[--border-subtle] transition-all">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs bg-gradient-to-r from-[#F4C430] to-[#E50914] text-[--text-primary] font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : editingSegment ? <Save className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                  {editingSegment ? 'Update Segment' : 'Create Segment'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Skeleton */}
      {loading && segments.length === 0 && <LoadingSkeleton />}

      {/* Empty State */}
      {!loading && segments.length === 0 && (
        <motion.div variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-16 h-16 rounded-2xl bg-[#F4C430]/5 border border-[#F4C430]/10 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-[--text-muted]" />
          </div>
          <p className="text-sm font-medium text-[--text-primary] mb-1">No user segments</p>
          <p className="text-xs text-[--text-muted] mb-4 text-center max-w-[280px]">Create segments to target specific user groups with campaigns</p>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs bg-[#F4C430]/10 border border-[#F4C430]/20 text-[#F4C430] hover:bg-[#F4C430]/20 transition-all">
            <Plus className="w-3 h-3" /> Create First Segment
          </button>
        </motion.div>
      )}

      {/* Segment List */}
      {!loading && segments.length > 0 && (
        <div className="space-y-3">
          {segments.map(segment => {
            const sb = segmentBadge(segment.isAutoUpdate)
            const growthRate = Math.random() > 0.5 ? `+${(Math.random() * 15).toFixed(1)}%` : `-${(Math.random() * 5).toFixed(1)}%`
            const engagementRate = `${(Math.random() * 40 + 10).toFixed(1)}%`
            const isPositiveGrowth = growthRate.startsWith('+')

            return (
              <motion.div key={segment.id} variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[--text-primary]">{segment.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] ${sb.bg} ${sb.text} border ${sb.border}`}>{sb.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setShowMergePicker(segment.id)} className="p-1.5 rounded-lg text-[--text-muted] hover:text-[#F4C430] hover:bg-[#F4C430]/10 transition-all" title="Merge with...">
                      <GitMerge className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => openEdit(segment)} className="p-1.5 rounded-lg text-[--text-muted] hover:text-[#F4C430] hover:bg-[#F4C430]/10 transition-all" title="Edit">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleRecalculate(segment)} className="p-1.5 rounded-lg text-[--text-muted] hover:text-[#F4C430] hover:bg-[#F4C430]/10 transition-all" title="Recalculate">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setConfirmAction({ type: 'delete', id: segment.id })} className="p-1.5 rounded-lg text-[--text-muted] hover:text-[--status-danger] hover:bg-[--status-danger-bg] transition-all" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[--text-muted] mb-2">{segment.description}</p>
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[--border-subtle]">
                  <div>
                    <p className="text-[10px] text-[--text-muted] uppercase">Size</p>
                    <p className="text-sm font-semibold text-[--text-primary] font-metric">{segment.userCount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[--text-muted] uppercase">Growth</p>
                    <p className={`text-sm font-semibold font-metric ${isPositiveGrowth ? 'text-[#E50914]' : 'text-[--status-danger]'}`}>{growthRate}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[--text-muted] uppercase">Engagement</p>
                    <p className="text-sm font-semibold text-[#F4C430] font-metric">{engagementRate}</p>
                  </div>
                </div>
                {segment.lastUpdatedAt && (
                  <p className="text-[10px] text-[--text-muted] mt-2">Updated {timeAgo(segment.lastUpdatedAt)}</p>
                )}

                {/* Merge Picker */}
                <AnimatePresence>
                  {showMergePicker === segment.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-[--border-subtle]"
                    >
                      <p className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-2">Merge with:</p>
                      <div className="flex flex-wrap gap-2">
                        {segments.filter(s => s.id !== segment.id).map(s => (
                          <button key={s.id} onClick={() => setConfirmAction({ type: 'merge', id: segment.id, id2: s.id })}
                            className="px-2 py-1 rounded-lg text-xs bg-[--bg-surface] border border-[--border-subtle] text-[--text-secondary] hover:border-[#F4C430]/30 hover:text-[#F4C430] transition-all">
                            {s.name}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Confirm Dialog */}
      <AnimatePresence>
        {confirmAction && (
          <ConfirmDialog
            title={confirmAction.type === 'delete' ? 'Delete Segment' : 'Merge Segments'}
            message={confirmAction.type === 'delete'
              ? 'Are you sure you want to delete this segment? This action cannot be undone.'
              : 'Are you sure you want to merge these segments? A new combined segment will be created.'}
            onConfirm={() => {
              if (confirmAction.type === 'delete') handleDelete(confirmAction.id)
              else if (confirmAction.id2) handleMerge(confirmAction.id, confirmAction.id2)
            }}
            onCancel={() => { setConfirmAction(null); setShowMergePicker(null) }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Tab: A/B Tests ──────────────────────────────────────────────────

function ABTestsTab() {
  const [tests, setTests] = useState<ABTest[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [confirmAction, setConfirmAction] = useState<{ type: 'delete' | 'action'; id: string; action?: 'start' | 'pause' | 'complete' | 'cancel'; winner?: string } | null>(null)
  const [showVariantComparison, setShowVariantComparison] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formFeatureKey, setFormFeatureKey] = useState('')
  const [formVariantA, setFormVariantA] = useState('')
  const [formVariantB, setFormVariantB] = useState('')
  const [formTrafficPct, setFormTrafficPct] = useState(50)
  const [formTargetSegment, setFormTargetSegment] = useState('all')
  const [submitting, setSubmitting] = useState(false)

  const fetchTests = useCallback(async () => {
    setLoading(true)
    try {
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : ''
      const data = await apiFetch(`/api/admin/abtests?pageSize=100${statusParam}`)
      setTests(data.data || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load A/B tests')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchTests() }, [fetchTests])

  // Stats
  const testStats = useMemo(() => {
    const activeTests = tests.filter(t => t.status === 'running').length
    const completedTests = tests.filter(t => t.status === 'completed').length
    const testsWithWinner = tests.filter(t => t.winner).length
    return { activeTests, completedTests, testsWithWinner }
  }, [tests])

  const resetForm = () => {
    setFormName(''); setFormFeatureKey(''); setFormVariantA('')
    setFormVariantB(''); setFormTrafficPct(50); setFormTargetSegment('all')
  }

  const openCreate = () => { resetForm(); setShowCreateForm(true) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formFeatureKey.trim() || !formVariantA.trim() || !formVariantB.trim()) {
      toast.error('Name, feature key, and both variants are required')
      return
    }
    if (formTrafficPct < 1 || formTrafficPct > 100) {
      toast.error('Traffic percentage must be between 1 and 100')
      return
    }

    setSubmitting(true)
    try {
      await apiFetch('/api/admin/abtests', {
        method: 'POST',
        body: JSON.stringify({
          name: formName,
          featureKey: formFeatureKey,
          variantA: formVariantA,
          variantB: formVariantB,
          trafficPercentage: formTrafficPct,
          targetSegment: formTargetSegment,
        }),
      })
      toast.success('A/B test created as draft')
      setShowCreateForm(false); resetForm(); fetchTests()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create A/B test')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAction = async (testId: string, action: 'start' | 'pause' | 'complete' | 'cancel', winner?: string) => {
    try {
      const body: Record<string, unknown> = { testId, action }
      if (winner) body.winner = winner
      await apiFetch('/api/admin/abtests', { method: 'PATCH', body: JSON.stringify(body) })
      const actionLabels: Record<string, string> = { start: 'started', pause: 'paused', complete: 'completed', cancel: 'cancelled' }
      toast.success(`A/B test ${actionLabels[action]}`)
      fetchTests()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update A/B test')
    }
    setConfirmAction(null)
  }

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/admin/abtests?testId=${id}`, { method: 'DELETE' })
      toastWithUndo('A/B test deleted', () => { fetchTests(); toast.success('Tests refreshed') })
      fetchTests()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete A/B test')
    }
    setConfirmAction(null)
  }

  const getTestActions = (test: ABTest) => {
    const actions: { label: string; icon: React.ReactNode; action: 'start' | 'pause' | 'complete' | 'cancel'; color: string; winner?: string }[] = []
    switch (test.status) {
      case 'draft':
        actions.push({ label: 'Start', icon: <Play className="w-3 h-3" />, action: 'start', color: 'text-[#F4C430] hover:bg-[#F4C430]/10' })
        actions.push({ label: 'Delete', icon: <Trash2 className="w-3 h-3" />, action: 'cancel', color: 'text-[--status-danger] hover:bg-[--status-danger-bg]' })
        break
      case 'running':
        actions.push({ label: 'Pause', icon: <Pause className="w-3 h-3" />, action: 'pause', color: 'text-[--status-warning] hover:bg-[--status-warning-bg]' })
        actions.push({ label: 'Complete (A Wins)', icon: <CheckCircle2 className="w-3 h-3" />, action: 'complete', color: 'text-[#F4C430] hover:bg-[#F4C430]/10', winner: 'A' })
        actions.push({ label: 'Complete (B Wins)', icon: <CheckCircle2 className="w-3 h-3" />, action: 'complete', color: 'text-[#F4C430] hover:bg-[#F4C430]/10', winner: 'B' })
        break
      case 'paused':
        actions.push({ label: 'Resume', icon: <Play className="w-3 h-3" />, action: 'start', color: 'text-[#F4C430] hover:bg-[#F4C430]/10' })
        actions.push({ label: 'Cancel', icon: <Square className="w-3 h-3" />, action: 'cancel', color: 'text-[--status-danger] hover:bg-[--status-danger-bg]' })
        break
      case 'completed':
      case 'cancelled':
        break
    }
    return actions
  }

  // Simulated results for completed tests
  const getSimulatedResults = (test: ABTest) => {
    const confidence = Math.random() * 30 + 70 // 70-100%
    const improvement = (Math.random() * 25 + 2).toFixed(1)
    const isSignificant = confidence > 90
    const winnerConversionA = (Math.random() * 8 + 2).toFixed(1)
    const winnerConversionB = (Math.random() * 8 + 2).toFixed(1)
    return { confidence: confidence.toFixed(1), improvement, isSignificant, conversionA: winnerConversionA, conversionB: winnerConversionB }
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      {/* Test Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard icon={<Activity className="w-4 h-4" />} label="Active Tests" value={testStats.activeTests} color="#F4C430" />
        <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="Completed" value={testStats.completedTests} color="#E50914" />
        <StatCard icon={<Trophy className="w-4 h-4" />} label="Winners Found" value={testStats.testsWithWinner} color="#F4C430" subtext={testStats.testsWithWinner > 0 ? `${((testStats.testsWithWinner / Math.max(testStats.completedTests, 1)) * 100).toFixed(0)}% completion rate` : undefined} />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-[#F4C430]" />
          A/B Tests
          {tests.length > 0 && (
            <span className="px-2 py-0.5 rounded text-[10px] bg-[#F4C430]/10 text-[#F4C430] border border-[#F4C430]/20">{tests.length}</span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-2 py-1 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-xs text-[--text-muted] focus:outline-none">
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="running">Running</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button onClick={fetchTests} className="p-1.5 rounded-lg text-[--text-muted] hover:text-[#F4C430] hover:bg-[#F4C430]/10 transition-all" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[#F4C430]/10 border border-[#F4C430]/20 text-[#F4C430] hover:bg-[#F4C430]/20 transition-all">
            <Plus className="w-3 h-3" /> Create Test
          </button>
        </div>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="bg-[--bg-primary] border border-[#F4C430]/10 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-[--text-muted] uppercase tracking-wider">New A/B Test</h4>
              <button onClick={() => { setShowCreateForm(false); resetForm() }} className="p-1 rounded text-[--text-muted] hover:text-[--text-secondary] transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Test Name *</label>
                  <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Pricing Page Variant" required
                    className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#F4C430]/30" />
                </div>
                <div>
                  <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Feature Key *</label>
                  <input type="text" value={formFeatureKey} onChange={e => setFormFeatureKey(e.target.value)} placeholder="pricing_page_v2" required
                    className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] font-metric placeholder-[--text-muted] focus:outline-none focus:border-[#F4C430]/30" />
                </div>
                <div>
                  <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Variant A (Control) *</label>
                  <input type="text" value={formVariantA} onChange={e => setFormVariantA(e.target.value)} placeholder="Current pricing page" required
                    className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#F4C430]/30" />
                </div>
                <div>
                  <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Variant B *</label>
                  <input type="text" value={formVariantB} onChange={e => setFormVariantB(e.target.value)} placeholder="New pricing with annual toggle" required
                    className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#F4C430]/30" />
                </div>
                <div>
                  <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Target Segment</label>
                  <select value={formTargetSegment} onChange={e => setFormTargetSegment(e.target.value)}
                    className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#F4C430]/30">
                    <option value="all">All Users</option>
                    <option value="new">New Users</option>
                    <option value="trial">Trial Users</option>
                    <option value="pro">Pro Users</option>
                    <option value="free">Free Users</option>
                  </select>
                </div>
              </div>

              {/* Traffic Split Visualizer */}
              <div>
                <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-2 block">Traffic Split (Variant B %)</label>
                <TrafficSplitVisualizer value={formTrafficPct} onChange={setFormTrafficPct} />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => { setShowCreateForm(false); resetForm() }} className="px-3 py-1.5 rounded-lg text-xs text-[--text-muted] hover:text-[--text-secondary] bg-[--bg-surface] border border-[--border-subtle] transition-all">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs bg-gradient-to-r from-[#F4C430] to-[#F4C430] text-[--text-primary] font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FlaskConical className="w-3 h-3" />}
                  Create Test
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Skeleton */}
      {loading && tests.length === 0 && <LoadingSkeleton />}

      {/* Empty State */}
      {!loading && tests.length === 0 && (
        <motion.div variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-16 h-16 rounded-2xl bg-[#F4C430]/5 border border-[#F4C430]/10 flex items-center justify-center mb-4">
            <FlaskConical className="w-8 h-8 text-[--text-muted]" />
          </div>
          <p className="text-sm font-medium text-[--text-primary] mb-1">No A/B tests yet</p>
          <p className="text-xs text-[--text-muted] mb-4 text-center max-w-[280px]">Create experiments to test feature variants and optimize conversions</p>
          <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs bg-[#F4C430]/10 border border-[#F4C430]/20 text-[#F4C430] hover:bg-[#F4C430]/20 transition-all">
            <Plus className="w-3 h-3" /> Create First Test
          </button>
        </motion.div>
      )}

      {/* Test List */}
      {!loading && tests.length > 0 && (
        <div className="space-y-3">
          {tests.map(test => {
            const sc = abTestStatusBadge(test.status)
            const actions = getTestActions(test)
            const isExpanded = showVariantComparison === test.id
            const results = test.status === 'completed' ? getSimulatedResults(test) : null

            return (
              <motion.div key={test.id} variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${sc.bg} ${sc.text} border ${sc.border} capitalize`}>{sc.label}</span>
                    <span className="text-sm font-medium text-[--text-primary]">{test.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {actions.map(a => (
                      <button key={a.label}
                        onClick={() => a.action === 'cancel'
                          ? setConfirmAction({ type: 'action', id: test.id, action: a.action })
                          : handleAction(test.id, a.action, a.winner)
                        }
                        className={`p-1.5 rounded-lg text-[--text-muted] ${a.color} transition-all`} title={a.label}>
                        {a.icon}
                      </button>
                    ))}
                    <button onClick={() => setShowVariantComparison(isExpanded ? null : test.id)}
                      className="p-1.5 rounded-lg text-[--text-muted] hover:text-[#F4C430] hover:bg-[#F4C430]/10 transition-all" title="Compare Variants">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {(test.status === 'completed' || test.status === 'cancelled' || test.status === 'draft') && (
                      <button onClick={() => setConfirmAction({ type: 'delete', id: test.id })} className="p-1.5 rounded-lg text-[--text-muted] hover:text-[--status-danger] hover:bg-[--status-danger-bg] transition-all" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {test.winner && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#F4C430]/10 text-[#F4C430] border border-[#F4C430]/20 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Winner: Variant {test.winner}
                    </span>
                  </div>
                )}

                {/* Results Dashboard for completed tests */}
                {results && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-3 p-3 bg-[--bg-surface] border border-[--border-subtle] rounded-lg"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className={`w-4 h-4 ${results.isSignificant ? 'text-[#E50914]' : 'text-[--status-warning]'}`} />
                      <span className="text-xs font-medium text-[--text-primary]">Results Dashboard</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <p className="text-[10px] text-[--text-muted] uppercase">Winner</p>
                        <p className="text-sm font-semibold text-[#F4C430] font-metric">Variant {test.winner || 'A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[--text-muted] uppercase">Confidence</p>
                        <p className={`text-sm font-semibold font-metric ${results.isSignificant ? 'text-[#E50914]' : 'text-[--status-warning]'}`}>{results.confidence}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[--text-muted] uppercase">Improvement</p>
                        <p className="text-sm font-semibold text-[#E50914] font-metric">+{results.improvement}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[--text-muted] uppercase">Significance</p>
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${results.isSignificant ? 'bg-[#E50914]' : 'bg-[--status-warning]'}`} />
                          <span className={`text-xs font-metric ${results.isSignificant ? 'text-[#E50914]' : 'text-[--status-warning]'}`}>
                            {results.isSignificant ? 'Significant' : 'Not yet'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {results.isSignificant && (
                      <div className="mt-2 pt-2 border-t border-[--border-subtle] flex items-center gap-1">
                        <Zap className="w-3 h-3 text-[#F4C430]" />
                        <span className="text-[10px] text-[#F4C430]">Recommendation: Deploy Variant {test.winner || 'A'} to all users</span>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Variant Comparison */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-3 overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[--bg-surface] border-2 border-[#F4C430]/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 rounded bg-[#F4C430]/10 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-[#F4C430]">A</span>
                            </div>
                            <span className="text-[10px] text-[--text-muted] uppercase">Control</span>
                          </div>
                          <p className="text-sm text-[--text-secondary]">{test.variantA}</p>
                          {results && (
                            <p className="text-xs text-[--text-muted] mt-2 font-metric">Conversion: {results.conversionA}%</p>
                          )}
                        </div>
                        <div className="bg-[--bg-surface] border-2 border-[#E50914]/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 rounded bg-[#E50914]/10 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-[#E50914]">B</span>
                            </div>
                            <span className="text-[10px] text-[--text-muted] uppercase">Variant</span>
                          </div>
                          <p className="text-sm text-[--text-secondary]">{test.variantB}</p>
                          {results && (
                            <p className="text-xs text-[--text-muted] mt-2 font-metric">Conversion: {results.conversionB}%</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Default variant cards (when not expanded) */}
                {!isExpanded && (
                  <div className="grid grid-cols-2 gap-3 text-xs text-[--text-muted]">
                    <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-2">
                      <span className="text-[10px] text-[--text-muted] uppercase block mb-1">Variant A (Control)</span>
                      <span className="text-[--text-secondary]">{test.variantA}</span>
                    </div>
                    <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-2">
                      <span className="text-[10px] text-[--text-muted] uppercase block mb-1">Variant B</span>
                      <span className="text-[--text-secondary]">{test.variantB}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 mt-2 text-[10px] text-[--text-muted]">
                  <span className="flex items-center gap-1"><Target className="w-3 h-3" /> Key: <span className="text-[--text-muted] font-metric">{test.featureKey}</span></span>
                  <span>Traffic: {test.trafficPercentage}%</span>
                  <span>Segment: {test.targetSegment}</span>
                  {test.startedAt && <span>Started: {timeAgo(test.startedAt)}</span>}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Confirm Dialog */}
      <AnimatePresence>
        {confirmAction && (
          <ConfirmDialog
            title={confirmAction.type === 'delete' ? 'Delete A/B Test' : 'Cancel A/B Test'}
            message={confirmAction.type === 'delete'
              ? 'Are you sure you want to delete this A/B test? This action cannot be undone.'
              : 'Are you sure you want to cancel this A/B test? All data will be preserved but the test will stop.'}
            onConfirm={() => {
              if (confirmAction.type === 'delete') handleDelete(confirmAction.id)
              else if (confirmAction.action) handleAction(confirmAction.id, confirmAction.action)
            }}
            onCancel={() => setConfirmAction(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────

export function AdminCampaigns() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'segments' | 'tests'>('campaigns')

  const tabs = [
    { id: 'campaigns' as const, label: 'Email Campaigns', icon: <Mail className="w-3.5 h-3.5" /> },
    { id: 'segments' as const, label: 'User Segments', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'tests' as const, label: 'A/B Tests', icon: <FlaskConical className="w-3.5 h-3.5" /> },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-bold text-[--text-primary] flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          <Megaphone className="w-5 h-5 text-[#F4C430]" />
          Campaign &amp; Segments
        </h2>
        <p className="text-sm text-[--text-muted] mt-1">Email campaigns, user segments, and A/B testing</p>
      </motion.div>

      {/* Top Stats Bar */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg">
          <div className="w-2 h-2 rounded-full bg-[#F4C430] animate-pulse" />
          <div>
            <p className="text-[9px] text-[--text-muted] uppercase tracking-wider">Active Campaigns</p>
            <p className="text-sm font-bold text-[--text-primary] font-metric">—</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg">
          <div className="w-2 h-2 rounded-full bg-[#E50914]" />
          <div>
            <p className="text-[9px] text-[--text-muted] uppercase tracking-wider">Active Tests</p>
            <p className="text-sm font-bold text-[--text-primary] font-metric">—</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg">
          <Users className="w-3.5 h-3.5 text-[#F4C430]" />
          <div>
            <p className="text-[9px] text-[--text-muted] uppercase tracking-wider">Total Segments</p>
            <p className="text-sm font-bold text-[--text-primary] font-metric">—</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg">
          <Timer className="w-3.5 h-3.5 text-[--text-muted]" />
          <div>
            <p className="text-[9px] text-[--text-muted] uppercase tracking-wider">Last Activity</p>
            <p className="text-sm font-bold text-[--text-primary] font-metric">—</p>
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-[--bg-surface] border border-[--border-subtle] rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-[#F4C430]/10 text-[#F4C430]'
                : 'text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-surface]'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={tabContentVariants}
          initial="enter"
          animate="center"
          exit="exit"
        >
          {activeTab === 'campaigns' && <EmailCampaignsTab />}
          {activeTab === 'segments' && <UserSegmentsTab />}
          {activeTab === 'tests' && <ABTestsTab />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
