'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  Ticket, Plus, Copy, Check, Power, PowerOff, Clock,
  DollarSign, Users, BarChart3, Tag, Calendar,
  ToggleLeft, ToggleRight, Loader2, Gift, Trash2,
  RefreshCw, AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import type { CouponDiscountType, CouponAudience } from '@/types/admin'
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

function discountTypeBadge(type: CouponDiscountType) {
  switch (type) {
    case 'percentage': return { bg: 'bg-[#F4C430]/10', text: 'text-[#F4C430]', border: 'border-[#F4C430]/20', label: '% Off' }
    case 'fixed_amount': return { bg: 'bg-[#F4C430]/10', text: 'text-[#F4C430]', border: 'border-[#F4C430]/20', label: 'Fixed' }
    case 'free_trial_extension': return { bg: 'bg-[#F4C430]/10', text: 'text-[#F4C430]', border: 'border-[#F4C430]/20', label: 'Trial+' }
    case 'plan_upgrade': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]', label: 'Upgrade' }
  }
}

function audienceBadge(audience: CouponAudience) {
  switch (audience) {
    case 'all': return { bg: 'bg-[--bg-surface]', text: 'text-[--text-muted]', border: 'border-[--border-subtle]', label: 'All Users' }
    case 'new_users': return { bg: 'bg-[#F4C430]/10', text: 'text-[#F4C430]', border: 'border-[#F4C430]/20', label: 'New Users' }
    case 'existing_users': return { bg: 'bg-[#F4C430]/10', text: 'text-[#F4C430]', border: 'border-[#F4C430]/20', label: 'Existing' }
    case 'churned_users': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]', label: 'Churned' }
    case 'trial_users': return { bg: 'bg-[#F4C430]/10', text: 'text-[#F4C430]', border: 'border-[#F4C430]/20', label: 'Trial' }
    case 'vip': return { bg: 'bg-[--status-warning-bg]', text: 'text-[--status-warning]', border: 'border-[--status-warning-border]', label: 'VIP' }
  }
}

function generateCouponCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const prefix = 'USRA'
  let code = prefix
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

function formatDiscountValue(type: CouponDiscountType, value: number): string {
  switch (type) {
    case 'percentage': return `${value}%`
    case 'fixed_amount': return `$${value}`
    case 'free_trial_extension': return `${value} days`
    case 'plan_upgrade': return `Free upgrade`
  }
}

// ─── Coupon type from API ────────────────────────────────────────────

interface CouponData {
  id: string
  code: string
  name: string
  description: string
  discountType: CouponDiscountType
  discountValue: number
  applicablePlans: string[]
  maxRedemptions: number | null
  currentRedemptions: number
  maxRedemptionsPerUser: number
  validFrom: string | null
  validUntil: string | null
  isActive: boolean
  targetAudience: CouponAudience
  autoApply: boolean
  createdAt: string
  updatedAt: string
}

function isExpired(coupon: CouponData): boolean {
  if (!coupon.validUntil) return false
  return new Date(coupon.validUntil) < new Date()
}

function isNotYetValid(coupon: CouponData): boolean {
  if (!coupon.validFrom) return false
  return new Date(coupon.validFrom) > new Date()
}

// ─── Create Coupon Form ──────────────────────────────────────────────

function CreateCouponForm({ onSave, onClose }: {
  onSave: (data: Record<string, unknown>) => Promise<void>
  onClose: () => void
}) {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [discountType, setDiscountType] = useState<CouponDiscountType>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [applicablePlans, setApplicablePlans] = useState<string[]>(['pro', 'family_plus'])
  const [maxRedemptions, setMaxRedemptions] = useState('')
  const [perUserLimit, setPerUserLimit] = useState('1')
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [targetAudience, setTargetAudience] = useState<CouponAudience>('all')
  const [autoApply, setAutoApply] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const plans = ['free', 'pro', 'family_plus', 'max', 'ultimate']
  const audiences: CouponAudience[] = ['all', 'new_users', 'existing_users', 'churned_users', 'trial_users', 'vip']

  const handleAutoGenerate = () => {
    setCode(generateCouponCode())
  }

  const togglePlan = (plan: string) => {
    setApplicablePlans(prev =>
      prev.includes(plan) ? prev.filter(p => p !== plan) : [...prev, plan]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !code.trim() || !discountValue) {
      toast.error('Name, code, and discount value are required')
      return
    }

    // Validate expiry dates
    if (validFrom && validUntil && new Date(validUntil) <= new Date(validFrom)) {
      toast.error('Valid Until must be after Valid From')
      return
    }

    setIsSubmitting(true)
    try {
      await onSave({
        code,
        name,
        description,
        discountType,
        discountValue: parseFloat(discountValue),
        applicablePlans,
        maxRedemptions: maxRedemptions ? parseInt(maxRedemptions) : null,
        maxRedemptionsPerUser: parseInt(perUserLimit) || 1,
        validFrom: validFrom || new Date().toISOString(),
        validUntil: validUntil || null,
        targetAudience,
        autoApply,
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
          Create New Coupon
        </h3>
        <button onClick={onClose} className="text-xs text-[--text-muted] hover:text-[--text-secondary] transition-colors">Cancel</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Coupon Code *</label>
            <div className="flex items-center gap-2">
              <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="USRA2024PRO" required
                className="flex-1 px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] font-metric placeholder-[--text-muted] focus:outline-none focus:border-[#F4C430]/30" />
              <button type="button" onClick={handleAutoGenerate}
                className="px-2.5 py-2 rounded-lg text-xs bg-[#F4C430]/10 border border-[#F4C430]/20 text-[#F4C430] hover:bg-[#F4C430]/20 transition-all whitespace-nowrap">
                Auto
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Summer Sale 50% Off" required
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#F4C430]/30" />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Describe this coupon promotion..." rows={2}
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#F4C430]/30 resize-none" />
          </div>

          <div>
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Discount Type</label>
            <select value={discountType} onChange={e => setDiscountType(e.target.value as CouponDiscountType)}
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#F4C430]/30">
              <option value="percentage">Percentage (%)</option>
              <option value="fixed_amount">Fixed Amount ($)</option>
              <option value="free_trial_extension">Trial Extension (days)</option>
              <option value="plan_upgrade">Plan Upgrade</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Discount Value *</label>
            <input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)}
              placeholder={discountType === 'percentage' ? '25' : discountType === 'fixed_amount' ? '9.99' : '7'}
              required min="0"
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#F4C430]/30" />
          </div>

          <div className="sm:col-span-2">
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-2 block">Applicable Plans</label>
            <div className="flex flex-wrap gap-2">
              {plans.map(plan => (
                <button key={plan} type="button" onClick={() => togglePlan(plan)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                    applicablePlans.includes(plan)
                      ? 'bg-[#F4C430]/10 border-[#F4C430]/20 text-[#F4C430]'
                      : 'bg-[--bg-surface] border-[--border-subtle] text-[--text-muted] hover:text-[--text-muted]'
                  }`}>
                  {plan.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Max Redemptions</label>
            <input type="number" value={maxRedemptions} onChange={e => setMaxRedemptions(e.target.value)}
              placeholder="Unlimited" min="0"
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#F4C430]/30" />
          </div>
          <div>
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Per-User Limit</label>
            <input type="number" value={perUserLimit} onChange={e => setPerUserLimit(e.target.value)}
              placeholder="1" min="1"
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#F4C430]/30" />
          </div>

          <div>
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Valid From</label>
            <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)}
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#F4C430]/30" />
          </div>
          <div>
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Valid Until</label>
            <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#F4C430]/30" />
          </div>

          <div>
            <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Target Audience</label>
            <select value={targetAudience} onChange={e => setTargetAudience(e.target.value as CouponAudience)}
              className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] focus:outline-none focus:border-[#F4C430]/30">
              {audiences.map(a => (
                <option key={a} value={a}>{a.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setAutoApply(!autoApply)} className="flex items-center gap-2">
              {autoApply ? <ToggleRight className="w-8 h-8 text-[#F4C430]" /> : <ToggleLeft className="w-8 h-8 text-[--text-muted]" />}
              <span className="text-xs text-[--text-muted]">Auto-apply at checkout</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-[--text-muted] hover:text-[--text-secondary] bg-[--bg-surface] border border-[--border-subtle] transition-all">Cancel</button>
          <button type="submit" disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs bg-gradient-to-r from-[#F4C430] to-[#F4C430] text-[--text-primary] font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Tag className="w-3.5 h-3.5" />}
            Create Coupon
          </button>
        </div>
      </form>
    </motion.div>
  )
}

// ─── Coupon Card ─────────────────────────────────────────────────────

function CouponCard({ coupon, onToggle, onDelete }: {
  coupon: CouponData
  onToggle: (id: string, isActive: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [copied, setCopied] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const dt = discountTypeBadge(coupon.discountType)
  const au = audienceBadge(coupon.targetAudience)
  const expired = isExpired(coupon)
  const notYetValid = isNotYetValid(coupon)

  const handleCopy = () => {
    navigator.clipboard.writeText(coupon.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Coupon code copied')
  }

  const handleToggle = async () => {
    setIsToggling(true)
    try {
      await onToggle(coupon.id, !coupon.isActive)
    } finally {
      setIsToggling(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this coupon?')) return
    setIsDeleting(true)
    try {
      await onDelete(coupon.id)
    } finally {
      setIsDeleting(false)
    }
  }

  const redemptionPercent = coupon.maxRedemptions
    ? Math.round((coupon.currentRedemptions / coupon.maxRedemptions) * 100)
    : 0

  const isFullyRedeemed = coupon.maxRedemptions
    ? coupon.currentRedemptions >= coupon.maxRedemptions
    : false

  return (
    <motion.div variants={itemVariants}
      className={`bg-[--bg-primary] border rounded-xl p-4 space-y-3 transition-colors ${
        expired ? 'border-[--status-danger-border] opacity-60' :
        !coupon.isActive ? 'border-[--border-subtle] opacity-50' :
        'border-[--border-subtle]'
      }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded text-[10px] ${dt.bg} ${dt.text} border ${dt.border}`}>{dt.label}</span>
          <span className={`px-2 py-0.5 rounded text-[10px] ${au.bg} ${au.text} border ${au.border}`}>{au.label}</span>
          {expired && (
            <span className="px-2 py-0.5 rounded text-[10px] bg-[--status-danger-bg] text-[--status-danger] border border-[--status-danger-border]">Expired</span>
          )}
          {notYetValid && (
            <span className="px-2 py-0.5 rounded text-[10px] bg-[--status-warning-bg] text-[--status-warning] border border-[--status-warning-border]">Scheduled</span>
          )}
          {!coupon.isActive && !expired && (
            <span className="px-2 py-0.5 rounded text-[10px] bg-[--bg-surface] text-[--text-muted] border border-[--border-subtle]">Inactive</span>
          )}
          {isFullyRedeemed && (
            <span className="px-2 py-0.5 rounded text-[10px] bg-[#F4C430]/10 text-[#F4C430] border border-[#F4C430]/20">Fully Redeemed</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleCopy} className="p-1.5 rounded-lg text-[--text-muted] hover:text-[--text-secondary] hover:bg-[--bg-surface] transition-all" title="Copy code">
            {copied ? <Check className="w-3.5 h-3.5 text-[#F4C430]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={handleToggle} disabled={isToggling}
            className="p-1.5 rounded-lg text-[--text-muted] hover:text-[--status-warning] hover:bg-[--status-warning-bg] transition-all"
            title={coupon.isActive ? 'Deactivate' : 'Activate'}>
            {isToggling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
              coupon.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />
            }
          </button>
          <button onClick={handleDelete} disabled={isDeleting}
            className="p-1.5 rounded-lg text-[--text-muted] hover:text-[--status-danger] hover:bg-[--status-danger-bg] transition-all" title="Delete">
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Code & Name */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-metric font-bold text-[--text-primary]">{coupon.code}</span>
        </div>
        <p className="text-sm text-[--text-muted] mt-0.5">{coupon.name}</p>
        {coupon.description && (
          <p className="text-xs text-[--text-muted] mt-0.5">{coupon.description}</p>
        )}
      </div>

      {/* Discount Value */}
      <div className="flex items-center gap-2">
        <Gift className="w-4 h-4 text-[#F4C430]" />
        <span className="text-lg font-bold text-[--text-primary]">{formatDiscountValue(coupon.discountType, coupon.discountValue)}</span>
        {coupon.applicablePlans.length > 0 && (
          <span className="text-xs text-[--text-muted]">for {coupon.applicablePlans.join(', ').replace(/_/g, ' ')}</span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[--border-subtle]">
        <div>
          <p className="text-[10px] text-[--text-muted] uppercase">Redemptions</p>
          <p className="text-sm font-semibold text-[--text-primary]">{coupon.currentRedemptions}{coupon.maxRedemptions ? `/${coupon.maxRedemptions}` : ''}</p>
        </div>
        <div>
          <p className="text-[10px] text-[--text-muted] uppercase">Usage</p>
          <div className="h-1.5 bg-[--bg-surface] rounded-full overflow-hidden mt-2">
            <div className="h-full rounded-full bg-[#F4C430]/60" style={{ width: `${Math.min(redemptionPercent, 100)}%` }} />
          </div>
        </div>
        <div>
          <p className="text-[10px] text-[--text-muted] uppercase">Per User</p>
          <p className="text-sm font-semibold text-[--text-primary]">{coupon.maxRedemptionsPerUser}x</p>
        </div>
      </div>

      {/* Dates */}
      {(coupon.validFrom || coupon.validUntil) && (
        <div className="flex items-center gap-3 text-[10px] text-[--text-muted]">
          {coupon.validFrom && (
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> From: {new Date(coupon.validFrom).toLocaleDateString()}</span>
          )}
          {coupon.validUntil && (
            <span className={`flex items-center gap-1 ${expired ? 'text-[--status-danger]/60' : ''}`}>
              <Clock className="w-3 h-3" /> Until: {new Date(coupon.validUntil).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────

export function AdminCoupons() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [coupons, setCoupons] = useState<CouponData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all')

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/coupons', { credentials: 'same-origin' })
      if (res.ok) {
        const json = await safeJsonResponse(res)
        setCoupons(json.data || [])
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchCoupons() }, [fetchCoupons])

  const handleCreate = async (data: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await safeJsonResponse(res)
        toast.error(err.error || 'Failed to create coupon')
        return
      }
      toast.success(`Coupon "${data.code}" created successfully`)
      setShowCreateForm(false)
      fetchCoupons()
    } catch {
      toast.error('Failed to create coupon')
    }
  }

  const handleToggle = async (couponId: string, isActive: boolean) => {
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ couponId, isActive }),
      })
      if (!res.ok) {
        const err = await safeJsonResponse(res)
        toast.error(err.error || 'Failed to toggle coupon')
        return
      }
      toast.success(`Coupon ${isActive ? 'activated' : 'deactivated'}`)
      fetchCoupons()
    } catch {
      toast.error('Failed to toggle coupon')
    }
  }

  const handleDelete = async (couponId: string) => {
    try {
      const res = await fetch(`/api/admin/coupons?couponId=${couponId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (!res.ok) {
        const err = await safeJsonResponse(res)
        toast.error(err.error || 'Failed to delete coupon')
        return
      }
      toast.success('Coupon deleted')
      fetchCoupons()
    } catch {
      toast.error('Failed to delete coupon')
    }
  }

  const filteredCoupons = coupons.filter(c => {
    switch (filter) {
      case 'active': return c.isActive && !isExpired(c)
      case 'inactive': return !c.isActive
      case 'expired': return isExpired(c)
      default: return true
    }
  })

  const activeCoupons = coupons.filter(c => c.isActive && !isExpired(c))
  const totalRedemptions = coupons.reduce((s, c) => s + c.currentRedemptions, 0)

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
            <Ticket className="w-5 h-5 text-[#F4C430]" />
            Coupon Engine
          </h2>
          <p className="text-sm text-[--text-muted] mt-1">Create, manage, and track promotional coupons</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs bg-gradient-to-r from-[#F4C430] to-[#F4C430] text-[--text-primary] font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Coupon
        </button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active Coupons', value: activeCoupons.length, icon: Tag, color: 'text-[#F4C430]' },
          { label: 'Total Redemptions', value: totalRedemptions, icon: Users, color: 'text-[#F4C430]' },
          { label: 'Total Coupons', value: coupons.length, icon: Ticket, color: 'text-[--status-warning]' },
          { label: 'Expired', value: coupons.filter(c => isExpired(c)).length, icon: AlertTriangle, color: 'text-[--status-danger]' },
        ].map(stat => (
          <motion.div key={stat.label} variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-[--text-muted]">{stat.label}</span>
            </div>
            <span className="text-2xl font-bold text-[--text-primary]">{stat.value}</span>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {(['all', 'active', 'inactive', 'expired'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f
                ? 'bg-[#F4C430]/10 border border-[#F4C430]/20 text-[#F4C430]'
                : 'bg-[--bg-surface] border border-[--border-subtle] text-[--text-muted] hover:text-[--text-muted]'
            }`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Create Coupon Form */}
      <AnimatePresence>
        {showCreateForm && (
          <CreateCouponForm onSave={handleCreate} onClose={() => setShowCreateForm(false)} />
        )}
      </AnimatePresence>

      {/* Coupons Grid */}
      {filteredCoupons.length === 0 ? (
        <motion.div variants={itemVariants} className="bg-[--bg-primary] border border-[--border-subtle] rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px]">
          <Ticket className="w-10 h-10 text-[--text-muted] mb-3" />
          <p className="text-sm text-[--text-muted] mb-1">
            {filter === 'all' ? 'No coupons yet' : `No ${filter} coupons`}
          </p>
          <p className="text-xs text-[--text-muted] mb-4">Create your first coupon to start tracking promotions</p>
          {filter === 'all' && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs bg-[#F4C430]/10 border border-[#F4C430]/20 text-[#F4C430] hover:bg-[#F4C430]/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Create First Coupon
            </button>
          )}
        </motion.div>
      ) : (
        <div className="max-h-[500px] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCoupons.map(coupon => (
            <CouponCard
              key={coupon.id}
              coupon={coupon}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}
