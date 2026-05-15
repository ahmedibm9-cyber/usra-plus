'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  Users, Link2, Gift, TrendingUp, ArrowRight, Copy, Check,
  Clock, Star, RefreshCw, UserPlus, Award, Target, Plus,
  Loader2, Trash2, Zap
} from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import type { ReferralStatus, ReferralRewardType } from '@/types/admin'
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

// ─── Helper Functions ────────────────────────────────────────────────

function statusBadge(status: ReferralStatus) {
  switch (status) {
    case 'pending': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]' }
    case 'signed_up': return { bg: 'bg-[#F4C430]/10', text: 'text-[#F4C430]', border: 'border-[#F4C430]/20' }
    case 'trial_started': return { bg: 'bg-[#F4C430]/10', text: 'text-[#F4C430]', border: 'border-[#F4C430]/20' }
    case 'converted': return { bg: 'bg-[#F4C430]/10', text: 'text-[#F4C430]', border: 'border-[#F4C430]/20' }
    case 'rewarded': return { bg: 'bg-[#F4C430]/10', text: 'text-[#F4C430]', border: 'border-[#F4C430]/20' }
    case 'expired': return { bg: 'bg-[--bg-surface]', text: 'text-[--text-muted]', border: 'border-[--border-subtle]' }
  }
}

function rewardTypeLabel(type: ReferralRewardType): string {
  switch (type) {
    case 'trial_extension': return 'Trial Extension'
    case 'discount': return 'Discount'
    case 'plan_upgrade': return 'Plan Upgrade'
    case 'credit': return 'Credit'
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

// ─── Referral Data Types ─────────────────────────────────────────────

interface ReferralData {
  id: string
  referrerId: string
  referralCode: string
  referredEmail: string | null
  referredUserId: string | null
  status: ReferralStatus
  rewardType: ReferralRewardType
  rewardValue: number
  rewardClaimed: boolean
  rewardClaimedAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

interface ReferralMetricsData {
  totalReferrals: number
  activeReferrals: number
  convertedReferrals: number
  conversionRate: number
  totalRewardsGranted: number
}

// ─── Create Referral Form ────────────────────────────────────────────

function CreateReferralForm({ onSave, onClose }: {
  onSave: (data: Record<string, unknown>) => Promise<void>
  onClose: () => void
}) {
  const [referralCode, setReferralCode] = useState('')
  const [referrerId, setReferrerId] = useState('admin')
  const [referredEmail, setReferredEmail] = useState('')
  const [rewardType, setRewardType] = useState<ReferralRewardType>('trial_extension')
  const [rewardValue, setRewardValue] = useState('7')
  const [expiresAt, setExpiresAt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAutoGenerate = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = 'REF-'
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setReferralCode(code)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!referralCode.trim()) {
      toast.error('Referral code is required')
      return
    }
    setIsSubmitting(true)
    try {
      await onSave({
        referralCode,
        referrerId,
        referredEmail: referredEmail || null,
        rewardType,
        rewardValue: parseFloat(rewardValue) || 0,
        expiresAt: expiresAt || null,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#F4C430]" />
          Create Referral Code
        </h3>
        <button onClick={onClose} className="text-xs text-[--text-muted] hover:text-[--text-secondary] transition-colors">Cancel</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Referral Code *</label>
            <div className="flex items-center gap-2">
              <input type="text" value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())}
                placeholder="REF-ABC123" required
                className="flex-1 px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] font-metric placeholder-[--text-muted] focus:outline-none focus:border-[#F4C430]/30" />
              <button type="button" onClick={handleAutoGenerate}
                className="px-2.5 py-2 rounded-lg text-xs bg-[#F4C430]/10 border border-[#F4C430]/20 text-[#F4C430] hover:bg-[#F4C430]/20 transition-all whitespace-nowrap">
                Auto
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Referrer ID</label>
            <input type="text" value={referrerId} onChange={e => setReferrerId(e.target.value)}
              placeholder="admin"
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#F4C430]/30" />
          </div>

          <div>
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Referred Email</label>
            <input type="email" value={referredEmail} onChange={e => setReferredEmail(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#F4C430]/30" />
          </div>

          <div>
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Reward Type</label>
            <select value={rewardType} onChange={e => setRewardType(e.target.value as ReferralRewardType)}
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#F4C430]/30">
              <option value="trial_extension">Trial Extension</option>
              <option value="discount">Discount</option>
              <option value="plan_upgrade">Plan Upgrade</option>
              <option value="credit">Account Credit</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Reward Value</label>
            <input type="number" value={rewardValue} onChange={e => setRewardValue(e.target.value)}
              min="0" step="0.01"
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#F4C430]/30" />
          </div>

          <div>
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Expires At</label>
            <input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#F4C430]/30" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-[--text-muted] hover:text-[--text-secondary] bg-[--bg-surface] border border-[--border-subtle] transition-all">Cancel</button>
          <button type="submit" disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs bg-gradient-to-r from-[#F4C430] to-[#E50914] text-[--text-primary] font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
            Create Referral
          </button>
        </div>
      </form>
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────

export function AdminReferrals() {
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'codes' | 'rewards'>('overview')
  const [referrals, setReferrals] = useState<ReferralData[]>([])
  const [metrics, setMetrics] = useState<ReferralMetricsData>({
    totalReferrals: 0,
    activeReferrals: 0,
    convertedReferrals: 0,
    conversionRate: 0,
    totalRewardsGranted: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const fetchReferrals = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/referrals', { credentials: 'same-origin' })
      if (res.ok) {
        const json = await safeJsonResponse(res)
        setReferrals(json.data || [])
        setMetrics(json.metrics || {
          totalReferrals: 0,
          activeReferrals: 0,
          convertedReferrals: 0,
          conversionRate: 0,
          totalRewardsGranted: 0,
        })
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchReferrals() }, [fetchReferrals])

  const handleCreate = async (data: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await safeJsonResponse(res)
        toast.error(err.error || 'Failed to create referral')
        return
      }
      toast.success(`Referral code "${data.referralCode}" created successfully`)
      setShowCreateForm(false)
      fetchReferrals()
    } catch {
      toast.error('Failed to create referral')
    }
  }

  const handleGrantReward = async (referralId: string) => {
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ referralId, grantReward: true }),
      })
      if (!res.ok) {
        const err = await safeJsonResponse(res)
        toast.error(err.error || 'Failed to grant reward')
        return
      }
      toast.success('Reward granted')
      fetchReferrals()
    } catch {
      toast.error('Failed to grant reward')
    }
  }

  const handleUpdateStatus = async (referralId: string, status: ReferralStatus) => {
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ referralId, status }),
      })
      if (!res.ok) {
        const err = await safeJsonResponse(res)
        toast.error(err.error || 'Failed to update referral')
        return
      }
      toast.success(`Referral status updated to ${status.replace(/_/g, ' ')}`)
      fetchReferrals()
    } catch {
      toast.error('Failed to update referral')
    }
  }

  const handleDelete = async (referralId: string) => {
    if (!confirm('Are you sure you want to delete this referral?')) return
    try {
      const res = await fetch(`/api/admin/referrals?referralId=${referralId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (!res.ok) {
        const err = await safeJsonResponse(res)
        toast.error(err.error || 'Failed to delete referral')
        return
      }
      toast.success('Referral deleted')
      fetchReferrals()
    } catch {
      toast.error('Failed to delete referral')
    }
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'referrals' as const, label: 'Referrals', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'codes' as const, label: 'Referral Codes', icon: <Link2 className="w-3.5 h-3.5" /> },
    { id: 'rewards' as const, label: 'Rewards', icon: <Gift className="w-3.5 h-3.5" /> },
  ]

  const uniqueCodes = [...new Map(referrals.map(r => [r.referralCode, r])).values()]

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
            <Users className="w-5 h-5 text-[#F4C430]" />
            Referral System
          </h2>
          <p className="text-sm text-[--text-muted] mt-1">Manage referral codes, track conversions, and handle rewards</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs bg-gradient-to-r from-[#F4C430] to-[#E50914] text-[--text-primary] font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Referral
        </button>
      </motion.div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Referrals', value: metrics.totalReferrals, icon: Users, color: 'text-[#F4C430]' },
          { label: 'Active', value: metrics.activeReferrals, icon: ArrowRight, color: 'text-[#F4C430]' },
          { label: 'Converted', value: metrics.convertedReferrals, icon: Target, color: 'text-[#F4C430]' },
          { label: 'Conversion Rate', value: `${metrics.conversionRate}%`, icon: TrendingUp, color: 'text-[--status-warning]' },
          { label: 'Rewards Granted', value: metrics.totalRewardsGranted, icon: Gift, color: 'text-[#F4C430]' },
        ].map(stat => (
          <motion.div key={stat.label} variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-[10px] text-[--text-muted] uppercase tracking-wider">{stat.label}</span>
            </div>
            <span className="text-2xl font-bold text-[--text-primary]">{stat.value}</span>
          </motion.div>
        ))}
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreateForm && (
          <CreateReferralForm onSave={handleCreate} onClose={() => setShowCreateForm(false)} />
        )}
      </AnimatePresence>

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
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Funnel visualization */}
              <motion.div variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-[#F4C430]" />
                  Referral Funnel
                </h3>
                {metrics.totalReferrals === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Target className="w-8 h-8 text-[--text-muted] mb-3" />
                    <p className="text-sm text-[--text-muted]">No referral data yet</p>
                    <p className="text-xs text-[--text-muted] mt-1">The funnel will populate as users start referring</p>
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs bg-[#F4C430]/10 border border-[#F4C430]/20 text-[#F4C430] hover:bg-[#F4C430]/20 transition-all mt-4"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create First Referral Code
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {[
                      { label: 'Invited', count: metrics.totalReferrals, color: 'bg-[#F4C430]' },
                      { label: 'Signed Up', count: metrics.activeReferrals, color: 'bg-[#F4C430]' },
                      { label: 'Converted', count: metrics.convertedReferrals, color: 'bg-[#F4C430]' },
                    ].map((step, i) => (
                      <div key={step.label} className="flex items-center gap-2 flex-1">
                        <div className="flex-1">
                          <div className="h-8 bg-[--bg-surface] rounded-lg overflow-hidden relative">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: metrics.totalReferrals > 0 ? `${(step.count / metrics.totalReferrals) * 100}%` : '0%' }}
                              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                              className={`absolute top-0 left-0 h-full ${step.color} opacity-30 rounded-lg`}
                            />
                          </div>
                          <p className="text-xs text-[--text-muted] mt-1">{step.label}</p>
                          <p className="text-sm font-bold text-[--text-primary]">{step.count}</p>
                        </div>
                        {i < 2 && <ArrowRight className="w-4 h-4 text-[--text-muted] shrink-0" />}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          )}

          {/* Referrals Tab */}
          {activeTab === 'referrals' && (
            <div className="space-y-4">
              {referrals.length === 0 ? (
                <motion.div variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px]">
                  <Users className="w-10 h-10 text-[--text-muted] mb-3" />
                  <p className="text-sm text-[--text-muted] mb-1">No referrals yet</p>
                  <p className="text-xs text-[--text-muted]">Active referrals will appear here as users invite others</p>
                </motion.div>
              ) : (
                <div className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl overflow-hidden">
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {referrals.map(ref => {
                      const sc = statusBadge(ref.status)
                      return (
                        <div key={ref.id} className="flex items-center gap-3 px-4 py-3 border-b border-[--border-subtle] hover:bg-[--bg-surface] transition-colors">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${sc.bg} ${sc.text} border ${sc.border} capitalize`}>{ref.status.replace(/_/g, ' ')}</span>
                          <span className="text-xs text-[--text-muted] font-metric">{ref.referralCode}</span>
                          <span className="text-xs text-[--text-secondary] flex-1 truncate">{ref.referredEmail || 'Anonymous'}</span>
                          <span className="text-[10px] text-[--text-secondary]">{rewardTypeLabel(ref.rewardType as ReferralRewardType)}</span>
                          <span className="text-[10px] text-[--text-muted]">{timeAgo(ref.createdAt)}</span>
                          <div className="flex items-center gap-1">
                            {ref.status === 'converted' && !ref.rewardClaimed && (
                              <button onClick={() => handleGrantReward(ref.id)}
                                className="p-1 rounded text-[#F4C430] hover:bg-[#F4C430]/10 transition-all" title="Grant reward">
                                <Gift className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => handleDelete(ref.id)}
                              className="p-1 rounded text-[--text-muted] hover:text-[--status-danger] hover:bg-[--status-danger-bg] transition-all" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Codes Tab */}
          {activeTab === 'codes' && (
            <div className="space-y-4">
              {uniqueCodes.length === 0 ? (
                <motion.div variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px]">
                  <Link2 className="w-10 h-10 text-[--text-muted] mb-3" />
                  <p className="text-sm text-[--text-muted] mb-1">No referral codes yet</p>
                  <p className="text-xs text-[--text-muted]">Create referral codes for users to share</p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs bg-[#F4C430]/10 border border-[#F4C430]/20 text-[#F4C430] hover:bg-[#F4C430]/20 transition-all mt-4"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create Code
                  </button>
                </motion.div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3">
                  {uniqueCodes.map(ref => {
                    const codeRefs = referrals.filter(r => r.referralCode === ref.referralCode)
                    const converted = codeRefs.filter(r => r.status === 'converted' || r.status === 'rewarded').length
                    const codeMetrics = {
                      total: codeRefs.length,
                      converted,
                      conversionRate: codeRefs.length > 0 ? Math.round((converted / codeRefs.length) * 100) : 0,
                    }
                    return (
                      <div key={ref.id} className="bg-[--bg-primary] border border-[--border-subtle] rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-metric font-bold text-[--text-primary]">{ref.referralCode}</span>
                          <span className="text-[10px] text-[--text-muted]">{rewardTypeLabel(ref.rewardType as ReferralRewardType)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <p className="text-[10px] text-[--text-muted] uppercase">Uses</p>
                            <p className="text-sm font-semibold text-[--text-primary]">{codeMetrics.total}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[--text-muted] uppercase">Converted</p>
                            <p className="text-sm font-semibold text-[#F4C430]">{codeMetrics.converted}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[--text-muted] uppercase">Rate</p>
                            <p className="text-sm font-semibold text-[--text-primary]">{codeMetrics.conversionRate}%</p>
                          </div>
                        </div>
                        {ref.expiresAt && (
                          <div className="flex items-center gap-1 text-[10px] text-[--text-muted]">
                            <Clock className="w-3 h-3" />
                            Expires: {new Date(ref.expiresAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Rewards Tab */}
          {activeTab === 'rewards' && (
            <div className="space-y-4">
              {referrals.filter(r => r.rewardClaimed || r.status === 'converted').length === 0 ? (
                <motion.div variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px]">
                  <Gift className="w-10 h-10 text-[--text-muted] mb-3" />
                  <p className="text-sm text-[--text-muted] mb-1">No rewards pending</p>
                  <p className="text-xs text-[--text-muted]">Rewards will appear here when referrals convert</p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {referrals
                    .filter(r => r.status === 'converted' || r.rewardClaimed)
                    .map(ref => {
                      const sc = statusBadge(ref.status)
                      return (
                        <div key={ref.id} className="bg-[--bg-primary] border border-[--border-subtle] rounded-xl p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${sc.bg} ${sc.text} border ${sc.border} capitalize`}>{ref.status.replace(/_/g, ' ')}</span>
                              <span className="text-xs text-[--text-muted] font-metric">{ref.referralCode}</span>
                            </div>
                            <span className="text-[10px] text-[--text-muted]">{timeAgo(ref.createdAt)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Award className="w-4 h-4 text-[#F4C430]" />
                              <span className="text-sm text-[--text-secondary]">{rewardTypeLabel(ref.rewardType as ReferralRewardType)}</span>
                              <span className="text-sm font-semibold text-[--text-primary]">{ref.rewardType === 'trial_extension' ? `${ref.rewardValue} days` : ref.rewardType === 'discount' ? `${ref.rewardValue}%` : ref.rewardType === 'credit' ? `$${ref.rewardValue}` : 'Free'}</span>
                            </div>
                            {ref.status === 'converted' && !ref.rewardClaimed && (
                              <button onClick={() => handleGrantReward(ref.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[#F4C430]/10 border border-[#F4C430]/20 text-[#F4C430] hover:bg-[#F4C430]/20 transition-all">
                                <Gift className="w-3 h-3" /> Grant Reward
                              </button>
                            )}
                            {ref.rewardClaimed && (
                              <span className="flex items-center gap-1 text-xs text-[#F4C430]">
                                <Check className="w-3.5 h-3.5" /> Claimed
                              </span>
                            )}
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
