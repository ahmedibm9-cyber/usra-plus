'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  KeyRound, Plus, Copy, Check, X, Trash2, Loader2,
  Search, Filter, Zap, Crown, ShieldCheck, Users,
  RefreshCw, Ban, CheckCircle2, Clock, AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { safeJsonResponse } from '@/lib/safe-fetch'

// ─── Animation Variants ─────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
}

// ─── Types ───────────────────────────────────────────────────────────

interface OtpRecord {
  id: string
  code: string
  userId: string
  planSlug: string
  startDate: string
  endDate: string
  generatedBy: string
  status: string
  usedAt: string | null
  createdAt: string
  expiresAt: string
}

interface UserOption {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
}

// ─── Plan Icon/Color Mapping ────────────────────────────────────────

function planStyle(slug: string) {
  switch (slug) {
    case 'free': return { color: 'text-[--status-neutral]', bg: 'bg-[--bg-surface-2]', Icon: Users }
    case 'pro': return { color: 'text-[#10B981]', bg: 'bg-[#10B981]/10', Icon: Zap }
    case 'family_plus': return { color: 'text-[#10B981]', bg: 'bg-[#10B981]/10', Icon: Crown }
    case 'max': return { color: 'text-[#0D9488]', bg: 'bg-[#0D9488]/10', Icon: ShieldCheck }
    case 'ultimate': return { color: 'text-[#0D9488]', bg: 'bg-[#0D9488]/10', Icon: ShieldCheck }
    default: return { color: 'text-[#10B981]', bg: 'bg-[#10B981]/10', Icon: Zap }
  }
}

function statusBadge(status: string) {
  switch (status) {
    case 'pending': return { label: 'Pending', color: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20' }
    case 'used': return { label: 'Used', color: 'bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20' }
    case 'expired': return { label: 'Expired', color: 'bg-[--bg-surface-2] text-[--text-muted] border-[--border-subtle]' }
    case 'revoked': return { label: 'Revoked', color: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20' }
    default: return { label: status, color: 'bg-[--bg-surface-2] text-[--text-muted] border-[--border-subtle]' }
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    })
  } catch {
    return iso
  }
}

// ─── Generate OTP Dialog ─────────────────────────────────────────────

function GenerateOtpDialog({
  onGenerate,
  onClose,
}: {
  onGenerate: (data: { userId: string; planSlug: string; startDate: string; endDate: string }) => Promise<{ otpCode: string; otpId: string; expiresAt: string } | null>
  onClose: () => void
}) {
  const [users, setUsers] = useState<UserOption[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [planSlug, setPlanSlug] = useState('pro')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return d.toISOString().slice(0, 10)
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Fetch users for dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/admin/users?pageSize=100', { credentials: 'same-origin' })
        if (res.ok) {
          const json = await safeJsonResponse<{ data?: UserOption[] }>(res)
          if (json?.data) setUsers(json.data)
        }
      } catch {
        // ignore
      }
    }
    fetchUsers()
  }, [])

  const filteredUsers = userSearch.trim()
    ? users.filter(u =>
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.firstName && u.firstName.toLowerCase().includes(userSearch.toLowerCase())) ||
        (u.lastName && u.lastName.toLowerCase().includes(userSearch.toLowerCase()))
      )
    : users

  const handleGenerate = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user')
      return
    }
    if (!startDate || !endDate) {
      toast.error('Please set start and end dates')
      return
    }
    setIsGenerating(true)
    try {
      const result = await onGenerate({
        userId: selectedUserId,
        planSlug,
        startDate,
        endDate,
      })
      if (result) {
        setGeneratedCode(result.otpCode)
        toast.success('OTP code generated successfully')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    if (!generatedCode) return
    navigator.clipboard.writeText(generatedCode)
    setCopied(true)
    toast.success('OTP code copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-6 space-y-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#10B981]" />
          Generate Subscription OTP
        </h3>
        <button onClick={onClose} className="text-xs text-[--text-muted] hover:text-[--text-secondary] transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {generatedCode ? (
        // Show generated OTP code
        <div className="space-y-4">
          <div className="bg-[#10B981]/5 border border-[#10B981]/20 rounded-xl p-6 text-center">
            <p className="text-xs text-[--text-muted] mb-2 uppercase tracking-wider">OTP Code Generated</p>
            <p className="text-3xl font-bold text-[#10B981] font-mono tracking-[0.3em]">{generatedCode}</p>
            <p className="text-[10px] text-[--text-muted] mt-3">Share this code with the user. It expires in 7 days.</p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/20 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs text-[--text-muted] hover:text-[--text-secondary] bg-[--bg-surface] border border-[--border-subtle] transition-all"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        // Show generation form
        <div className="space-y-4">
          {/* User Search & Select */}
          <div>
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">User *</label>
            <input
              type="text"
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search by email or name..."
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/30 mb-2"
            />
            <select
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#10B981]/30"
              size={5}
            >
              {filteredUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.firstName ? `${user.firstName} ${user.lastName || ''} — ` : ''}{user.email}
                </option>
              ))}
            </select>
          </div>

          {/* Plan Selector */}
          <div>
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Plan *</label>
            <div className="grid grid-cols-3 gap-2">
              {['pro', 'family_plus', 'max'].map(plan => {
                const { color, bg, Icon } = planStyle(plan)
                return (
                  <button
                    key={plan}
                    onClick={() => setPlanSlug(plan)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                      planSlug === plan
                        ? 'border-[#10B981]/40 bg-[#10B981]/5'
                        : 'border-[--border-subtle] bg-[--bg-primary] hover:border-[#10B981]/20'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${color}`} />
                    <span className={`text-[10px] font-medium ${planSlug === plan ? 'text-[#10B981]' : 'text-[--text-muted]'}`}>
                      {plan === 'family_plus' ? 'Family+' : plan.charAt(0).toUpperCase() + plan.slice(1)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date Pickers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#10B981]/30"
              />
            </div>
            <div>
              <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#10B981]/30"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-[--text-muted] hover:text-[--text-secondary] bg-[--bg-surface] border border-[--border-subtle] transition-all">
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedUserId}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs bg-gradient-to-r from-[#10B981] to-[#10B981] text-[--text-primary] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
              Generate OTP
            </button>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── OTP Row ─────────────────────────────────────────────────────────

function OtpRow({
  otp,
  onRevoke,
}: {
  otp: OtpRecord
  onRevoke: (id: string) => Promise<void>
}) {
  const [isRevoking, setIsRevoking] = useState(false)
  const [copied, setCopied] = useState(false)
  const { Icon, color, bg } = planStyle(otp.planSlug)
  const badge = statusBadge(otp.status)

  const handleCopy = () => {
    navigator.clipboard.writeText(otp.code)
    setCopied(true)
    toast.success('OTP code copied')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRevoke = async () => {
    setIsRevoking(true)
    try {
      await onRevoke(otp.id)
    } finally {
      setIsRevoking(false)
    }
  }

  return (
    <motion.div
      variants={itemVariants}
      className="bg-[--bg-surface] border border-[--border-subtle] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all hover:border-[#10B981]/15"
    >
      {/* Plan + Code */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono font-bold text-[--text-primary] tracking-wider">
              {otp.status === 'used' || otp.status === 'revoked' ? '••••••' : otp.code}
            </code>
            {otp.status === 'pending' && (
              <button onClick={handleCopy} className="p-1 text-[--text-muted] hover:text-[#10B981] transition-colors" title="Copy code">
                {copied ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
              </button>
            )}
          </div>
          <p className="text-[10px] text-[--text-muted]">
            {otp.planSlug === 'family_plus' ? 'Family+' : otp.planSlug.charAt(0).toUpperCase() + otp.planSlug.slice(1)} plan
            {' · '}
            {formatDate(otp.startDate)} → {formatDate(otp.endDate)}
          </p>
        </div>
      </div>

      {/* Status + Meta */}
      <div className="flex items-center gap-3">
        <span className={`px-2 py-0.5 rounded text-[9px] font-medium border ${badge.color}`}>
          {badge.label}
        </span>
        <div className="flex items-center gap-1 text-[10px] text-[--text-muted]">
          <Clock className="w-3 h-3" />
          {formatDate(otp.createdAt)}
        </div>
        {otp.status === 'pending' && (
          <button
            onClick={handleRevoke}
            disabled={isRevoking}
            className="p-1.5 rounded-lg text-[--text-muted] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all"
            title="Revoke OTP"
          >
            {isRevoking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────

export function AdminSubscriptionOtp() {
  const [otps, setOtps] = useState<OtpRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showGenerateForm, setShowGenerateForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterPlan, setFilterPlan] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchOtps = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      if (filterPlan) params.set('planSlug', filterPlan)
      const res = await fetch(`/api/admin/subscription-otp?${params.toString()}`, { credentials: 'same-origin' })
      if (res.ok) {
        const json = await safeJsonResponse<{ data?: OtpRecord[] }>(res)
        setOtps(json?.data || [])
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [filterStatus, filterPlan])

  useEffect(() => { fetchOtps() }, [fetchOtps])

  const handleGenerate = async (data: { userId: string; planSlug: string; startDate: string; endDate: string }) => {
    try {
      const res = await fetch('/api/admin/subscription-otp/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await safeJsonResponse(res)
        toast.error(err?.error || 'Failed to generate OTP')
        return null
      }
      const result = await safeJsonResponse<{ otpCode: string; otpId: string; expiresAt: string }>(res)
      fetchOtps()
      return result
    } catch {
      toast.error('Failed to generate OTP')
      return null
    }
  }

  const handleRevoke = async (otpId: string) => {
    try {
      const res = await fetch('/api/admin/subscription-otp', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ otpId }),
      })
      if (!res.ok) {
        const err = await safeJsonResponse(res)
        toast.error(err?.error || 'Failed to revoke OTP')
        return
      }
      toast.success('OTP revoked successfully')
      fetchOtps()
    } catch {
      toast.error('Failed to revoke OTP')
    }
  }

  // Filter by search query (userId matching)
  const filteredOtps = searchQuery.trim()
    ? otps.filter(otp => otp.userId.toLowerCase().includes(searchQuery.toLowerCase()))
    : otps

  // Stats
  const pendingCount = otps.filter(o => o.status === 'pending').length
  const usedCount = otps.filter(o => o.status === 'used').length
  const expiredCount = otps.filter(o => o.status === 'expired' || o.status === 'revoked').length

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[--bg-surface] rounded-xl border border-[--border-subtle] p-4 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
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
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[--text-primary]">Subscription OTP</h2>
              <div className="h-[2px] w-full mt-1 rounded-full bg-gradient-to-r from-[#10B981] via-[#22C55E] to-transparent" />
            </div>
          </div>
          <p className="text-sm text-[--text-muted] mt-2 ml-[52px]">Manually generate and manage subscription access codes</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchOtps}
            className="p-2 rounded-lg text-[--text-muted] hover:text-[#10B981] hover:bg-[#10B981]/10 transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowGenerateForm(!showGenerateForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs bg-gradient-to-r from-[#10B981] to-[#10B981] text-[--text-primary] font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            Generate OTP
          </button>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', value: pendingCount, icon: Clock, color: 'text-[#10B981]', bg: 'bg-[#10B981]/10 border-[#10B981]/10' },
          { label: 'Used', value: usedCount, icon: CheckCircle2, color: 'text-[#0D9488]', bg: 'bg-[#0D9488]/10 border-[#0D9488]/10' },
          { label: 'Expired/Revoked', value: expiredCount, icon: AlertTriangle, color: 'text-[--text-muted]', bg: 'bg-[--bg-surface-2] border-[--border-subtle]' },
        ].map(stat => (
          <motion.div key={stat.label} variants={itemVariants} className={`bg-[--bg-surface] border rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${stat.bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-[10px] text-[--text-muted] uppercase tracking-wider">{stat.label}</span>
            </div>
            <span className="text-2xl font-bold text-[--text-primary]">{stat.value}</span>
          </motion.div>
        ))}
      </div>

      {/* Generate Form */}
      <AnimatePresence>
        {showGenerateForm && (
          <GenerateOtpDialog
            onGenerate={handleGenerate}
            onClose={() => setShowGenerateForm(false)}
          />
        )}
      </AnimatePresence>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[--text-muted]" />
          <span className="text-[10px] text-[--text-muted] uppercase tracking-wider">Filters:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-xs text-[--text-primary] focus:outline-none focus:border-[#10B981]/30"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="used">Used</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>
          <select
            value={filterPlan}
            onChange={e => setFilterPlan(e.target.value)}
            className="px-3 py-1.5 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-xs text-[--text-primary] focus:outline-none focus:border-[#10B981]/30"
          >
            <option value="">All Plans</option>
            <option value="pro">Pro</option>
            <option value="family_plus">Family+</option>
            <option value="max">Max</option>
            <option value="ultimate">Ultimate</option>
          </select>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[--text-muted]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by user ID..."
              className="pl-7 pr-3 py-1.5 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-xs text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/30 w-48"
            />
          </div>
        </div>
      </motion.div>

      {/* OTP List */}
      <div className="max-h-[500px] overflow-y-auto custom-scrollbar space-y-2">
        {filteredOtps.length > 0 ? (
          filteredOtps.map(otp => (
            <OtpRow key={otp.id} otp={otp} onRevoke={handleRevoke} />
          ))
        ) : (
          <motion.div variants={itemVariants} className="bg-[--bg-surface] border border-[--border-subtle] rounded-xl p-12 text-center">
            <KeyRound className="w-10 h-10 text-[--text-muted] mx-auto mb-3 opacity-40" />
            <p className="text-sm text-[--text-muted]">No OTP codes found</p>
            <p className="text-xs text-[--text-muted] mt-1">Generate a new OTP to grant subscription access</p>
          </motion.div>
        )}
      </div>

      {/* Total count */}
      <motion.div variants={itemVariants} className="text-center">
        <span className="text-[10px] text-[--text-muted] uppercase tracking-widest">
          Showing {filteredOtps.length} of {otps.length} OTP codes
        </span>
      </motion.div>
    </motion.div>
  )
}
