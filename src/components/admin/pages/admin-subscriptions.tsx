'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import {
  Settings2, Plus, Pencil, Power, PowerOff, Check, X,
  Star, Trash2, Save, Loader2, Zap, Crown, Users, Sparkles,
  ChevronDown, ChevronUp, GripVertical, DollarSign, Clock,
  ShieldCheck, ArrowRight, RotateCcw
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

interface PlanFeature {
  id: string
  text: string
}

interface SubscriptionPlan {
  id: string
  slug: string
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number | null
  lifetimePrice: number | null
  currency: string
  features: string[]
  limits: Record<string, number | null>
  trialDays: number
  isActive: boolean
  isPopular: boolean
  sortOrder: number
  ctaText: string
  createdAt: string
  updatedAt: string
}

// ─── Plan Icon Mapping ───────────────────────────────────────────────

function planIcon(slug: string) {
  switch (slug) {
    case 'free': return { Icon: Users, color: 'text-[--status-neutral]', bg: 'bg-[--bg-surface-2]0/10 border-[--status-neutral-border]', glow: 'rgba(107,114,128,0.15)' }
    case 'pro': return { Icon: Zap, color: 'text-[#10B981]', bg: 'bg-[#10B981]/10 border-[#10B981]/20', glow: 'rgba(16,185,129,0.2)' }
    case 'family_plus': return { Icon: Crown, color: 'text-[--status-warning]', bg: 'bg-[--status-warning-bg] border-[--status-warning-border]', glow: 'rgba(245,158,11,0.2)' }
    case 'max': return { Icon: Sparkles, color: 'text-[#0D9488]', bg: 'bg-[#0D9488]/10 border-[#0D9488]/20', glow: 'rgba(139,92,246,0.2)' }
    case 'ultimate': return { Icon: ShieldCheck, color: 'text-[--status-danger]', bg: 'bg-[--status-danger-bg] border-[--status-danger-border]', glow: 'rgba(236,72,153,0.2)' }
    default: return { Icon: Zap, color: 'text-[#10B981]', bg: 'bg-[#10B981]/10 border-[#10B981]/20', glow: 'rgba(16,185,129,0.2)' }
  }
}

function formatPrice(plan: SubscriptionPlan): string {
  if (plan.lifetimePrice && plan.lifetimePrice > 0) return `$${plan.lifetimePrice}/lifetime`
  if (plan.monthlyPrice === 0) return 'Free'
  return `$${plan.monthlyPrice}/mo`
}

// ─── Plan Edit Form ──────────────────────────────────────────────────

function PlanEditForm({ plan, onSave, onCancel }: {
  plan: SubscriptionPlan
  onSave: (id: string, data: Record<string, unknown>) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(plan.name)
  const [description, setDescription] = useState(plan.description)
  const [monthlyPrice, setMonthlyPrice] = useState(String(plan.monthlyPrice))
  const [yearlyPrice, setYearlyPrice] = useState(plan.yearlyPrice ? String(plan.yearlyPrice) : '')
  const [lifetimePrice, setLifetimePrice] = useState(plan.lifetimePrice ? String(plan.lifetimePrice) : '')
  const [trialDays, setTrialDays] = useState(String(plan.trialDays))
  const [ctaText, setCtaText] = useState(plan.ctaText)
  const [isPopular, setIsPopular] = useState(plan.isPopular)
  const [features, setFeatures] = useState<string[]>(plan.features)
  const [newFeature, setNewFeature] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFeatures([...features, newFeature.trim()])
      setNewFeature('')
    }
  }

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(plan.id, {
        name,
        description,
        monthlyPrice: parseFloat(monthlyPrice) || 0,
        yearlyPrice: yearlyPrice ? parseFloat(yearlyPrice) : null,
        lifetimePrice: lifetimePrice ? parseFloat(lifetimePrice) : null,
        trialDays: parseInt(trialDays) || 0,
        ctaText,
        isPopular,
        features,
      })
    } finally {
      setIsSaving(false)
    }
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
          <Pencil className="w-4 h-4 text-[#10B981]" />
          Edit Plan: {plan.name}
        </h3>
        <button onClick={onCancel} className="text-xs text-[--text-muted] hover:text-[--text-secondary] transition-colors">Cancel</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Plan Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/30" />
        </div>
        <div>
          <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Description</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/30" />
        </div>
        <div>
          <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Monthly Price ($)</label>
          <input type="number" value={monthlyPrice} onChange={e => setMonthlyPrice(e.target.value)} min="0" step="0.01"
            className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/30" />
        </div>
        <div>
          <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Yearly Price ($)</label>
          <input type="number" value={yearlyPrice} onChange={e => setYearlyPrice(e.target.value)} min="0" step="0.01" placeholder="Optional"
            className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/30" />
        </div>
        <div>
          <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Lifetime Price ($)</label>
          <input type="number" value={lifetimePrice} onChange={e => setLifetimePrice(e.target.value)} min="0" step="0.01" placeholder="Optional"
            className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/30" />
        </div>
        <div>
          <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Trial Days</label>
          <input type="number" value={trialDays} onChange={e => setTrialDays(e.target.value)} min="0"
            className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/30" />
        </div>
        <div>
          <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">CTA Button Text</label>
          <input type="text" value={ctaText} onChange={e => setCtaText(e.target.value)}
            className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/30" />
        </div>
        <div className="flex items-center gap-3 pt-5">
          <button type="button" onClick={() => setIsPopular(!isPopular)}
            className="flex items-center gap-2">
            {isPopular ? <Star className="w-5 h-5 text-[--status-warning] fill-emerald-400" /> : <Star className="w-5 h-5 text-[--text-muted]" />}
            <span className="text-xs text-[--text-muted]">Mark as Popular</span>
          </button>
        </div>
      </div>

      {/* Features Management */}
      <div>
        <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-2 block">Plan Features</label>
        <div className="space-y-2">
          {features.map((feature, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] text-[--text-muted] font-metric w-5 shrink-0">{i + 1}.</span>
              <span className="text-sm text-[--text-secondary] flex-1">{feature}</span>
              <button onClick={() => handleRemoveFeature(i)} className="p-1 text-[--text-muted] hover:text-[--status-danger] transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-2">
            <input type="text" value={newFeature} onChange={e => setNewFeature(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddFeature()}
              placeholder="Add a feature..."
              className="flex-1 px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/30" />
            <button onClick={handleAddFeature}
              className="px-3 py-2 rounded-lg text-xs bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/20 transition-all">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-xs text-[--text-muted] hover:text-[--text-secondary] bg-[--bg-surface] border border-[--border-subtle] transition-all">Cancel</button>
        <button onClick={handleSave} disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs bg-gradient-to-r from-[#10B981] to-[#10B981] text-[--text-primary] font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save Changes
        </button>
      </div>
    </motion.div>
  )
}

// ─── Plan Card ───────────────────────────────────────────────────────

function PlanCard({ plan, onEdit, onToggleActive }: {
  plan: SubscriptionPlan
  onEdit: (plan: SubscriptionPlan) => void
  onToggleActive: (id: string, isActive: boolean) => Promise<void>
}) {
  const { Icon, color, bg, glow } = planIcon(plan.slug)
  const [isToggling, setIsToggling] = useState(false)

  const handleToggle = async () => {
    setIsToggling(true)
    try {
      await onToggleActive(plan.id, !plan.isActive)
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <motion.div variants={itemVariants}
      className={`bg-[--bg-surface] border rounded-xl p-5 relative overflow-hidden group transition-colors ${
        plan.isActive ? 'border-[#10B981]/15' : 'border-[--border-subtle] opacity-60'
      }`}>
      {/* Background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-2/3 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-500"
        style={{ background: glow }} />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${bg} border flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[--text-primary]">{plan.name}</h3>
                {plan.isPopular && (
                  <span className="px-2 py-0.5 rounded text-[9px] bg-[--status-warning-bg] text-[--status-warning] border border-[--status-warning-border] font-medium">Popular</span>
                )}
                {!plan.isActive && (
                  <span className="px-2 py-0.5 rounded text-[9px] bg-[--bg-surface] text-[--text-muted] border border-[--border-subtle]">Inactive</span>
                )}
              </div>
              <p className="text-[10px] text-[--text-muted] font-metric">{plan.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(plan)}
              className="p-2 rounded-lg text-[--text-muted] hover:text-[#10B981] hover:bg-[#10B981]/10 transition-all" title="Edit plan">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleToggle} disabled={isToggling || plan.slug === 'free'}
              className={`p-2 rounded-lg transition-all ${
                plan.slug === 'free' ? 'text-[--text-muted] cursor-not-allowed' :
                plan.isActive
                  ? 'text-[--text-muted] hover:text-[--status-warning] hover:bg-[--status-warning-bg]'
                  : 'text-[#10B981] hover:bg-[#10B981]/10'
              }`} title={plan.isActive ? 'Deactivate' : 'Activate'}>
              {isToggling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                plan.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />
              }
            </button>
          </div>
        </div>

        {/* Price */}
        <div className="mb-4">
          <p className={`text-2xl font-bold ${color}`}>{formatPrice(plan)}</p>
          <div className="flex items-center gap-3 mt-1">
            {plan.yearlyPrice && plan.yearlyPrice > 0 && (
              <span className="text-xs text-[--text-muted]">${plan.yearlyPrice}/yr</span>
            )}
            {plan.trialDays > 0 && (
              <span className="flex items-center gap-1 text-xs text-[--text-muted]">
                <Clock className="w-3 h-3" /> {plan.trialDays}-day trial
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-[--text-muted] mb-4">{plan.description}</p>

        {/* Features */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
          {plan.features.map((feature, i) => (
            <div key={i} className="flex items-start gap-2">
              <Check className={`w-3.5 h-3.5 ${color} shrink-0 mt-0.5`} />
              <span className="text-xs text-[--text-muted]">{feature}</span>
            </div>
          ))}
        </div>

        {/* CTA Text */}
        {plan.ctaText && (
          <div className="mt-4 pt-3 border-t border-[--border-subtle]">
            <span className="text-[10px] text-[--text-muted] uppercase">CTA:</span>{' '}
            <span className="text-xs text-[--text-muted]">{plan.ctaText}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Create Plan Form ────────────────────────────────────────────────

function CreatePlanForm({ onSave, onCancel }: {
  onSave: (data: Record<string, unknown>) => Promise<void>
  onCancel: () => void
}) {
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [monthlyPrice, setMonthlyPrice] = useState('0')
  const [yearlyPrice, setYearlyPrice] = useState('')
  const [lifetimePrice, setLifetimePrice] = useState('')
  const [trialDays, setTrialDays] = useState('0')
  const [ctaText, setCtaText] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    if (!slug.trim() || !name.trim()) {
      toast.error('Slug and name are required')
      return
    }
    setIsSaving(true)
    try {
      await onSave({
        slug: slug.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        name,
        description,
        monthlyPrice: parseFloat(monthlyPrice) || 0,
        yearlyPrice: yearlyPrice ? parseFloat(yearlyPrice) : null,
        lifetimePrice: lifetimePrice ? parseFloat(lifetimePrice) : null,
        trialDays: parseInt(trialDays) || 0,
        ctaText,
        features: [],
      })
    } finally {
      setIsSaving(false)
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
          <Plus className="w-4 h-4 text-[#10B981]" />
          Create New Plan
        </h3>
        <button onClick={onCancel} className="text-xs text-[--text-muted] hover:text-[--text-secondary] transition-colors">Cancel</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Plan Slug *</label>
          <input type="text" value={slug} onChange={e => setSlug(e.target.value)}
            placeholder="e.g. premium"
            className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] font-metric placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/30" />
        </div>
        <div>
          <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Plan Name *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Premium"
            className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/30" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Description</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Describe this plan..."
            className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/30" />
        </div>
        <div>
          <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Monthly Price ($)</label>
          <input type="number" value={monthlyPrice} onChange={e => setMonthlyPrice(e.target.value)} min="0" step="0.01"
            className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/30" />
        </div>
        <div>
          <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Yearly Price ($)</label>
          <input type="number" value={yearlyPrice} onChange={e => setYearlyPrice(e.target.value)} min="0" step="0.01" placeholder="Optional"
            className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/30" />
        </div>
        <div>
          <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Lifetime Price ($)</label>
          <input type="number" value={lifetimePrice} onChange={e => setLifetimePrice(e.target.value)} min="0" step="0.01" placeholder="Optional"
            className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/30" />
        </div>
        <div>
          <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">Trial Days</label>
          <input type="number" value={trialDays} onChange={e => setTrialDays(e.target.value)} min="0"
            className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/30" />
        </div>
        <div>
          <label className="text-[10px] text-[--text-muted] uppercase tracking-wider mb-1 block">CTA Button Text</label>
          <input type="text" value={ctaText} onChange={e => setCtaText(e.target.value)}
            placeholder="e.g. Subscribe Now"
            className="w-full px-3 py-2 bg-[--bg-primary] border border-[--border-subtle] rounded-lg text-sm text-[--text-primary] placeholder-[--text-muted] focus:outline-none focus:border-[#10B981]/30" />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-xs text-[--text-muted] hover:text-[--text-secondary] bg-[--bg-surface] border border-[--border-subtle] transition-all">Cancel</button>
        <button onClick={handleSave} disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs bg-gradient-to-r from-[#10B981] to-[#10B981] text-[--text-primary] font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Create Plan
        </button>
      </div>
    </motion.div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────

export function AdminSubscriptions() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/subscriptions', { credentials: 'same-origin' })
      if (res.ok) {
        const json = await safeJsonResponse(res)
        setPlans(json.data || [])
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  const handleSavePlan = async (planId: string, data: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ planId, ...data }),
      })
      if (!res.ok) {
        const err = await safeJsonResponse(res)
        toast.error(err.error || 'Failed to update plan')
        return
      }
      toast.success('Plan updated successfully')
      setEditingPlan(null)
      fetchPlans()
    } catch {
      toast.error('Failed to update plan')
    }
  }

  const handleToggleActive = async (planId: string, isActive: boolean) => {
    try {
      if (!isActive) {
        // Deactivate
        const res = await fetch(`/api/admin/subscriptions?planId=${planId}`, {
          method: 'DELETE',
          credentials: 'same-origin',
        })
        if (!res.ok) {
          const err = await safeJsonResponse(res)
          toast.error(err.error || 'Failed to deactivate plan')
          return
        }
        toast.success('Plan deactivated')
      } else {
        // Reactivate
        const res = await fetch('/api/admin/subscriptions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ planId, isActive: true }),
        })
        if (!res.ok) {
          const err = await safeJsonResponse(res)
          toast.error(err.error || 'Failed to activate plan')
          return
        }
        toast.success('Plan activated')
      }
      fetchPlans()
    } catch {
      toast.error('Failed to toggle plan')
    }
  }

  const handleCreatePlan = async (data: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await safeJsonResponse(res)
        toast.error(err.error || 'Failed to create plan')
        return
      }
      toast.success('Plan created successfully')
      setShowCreateForm(false)
      fetchPlans()
    } catch {
      toast.error('Failed to create plan')
    }
  }

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
              <Settings2 className="w-5 h-5 text-[#10B981]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[--text-primary]">Subscription Plans</h2>
              <div className="h-[2px] w-full mt-1 rounded-full bg-gradient-to-r from-[#10B981] via-[#22C55E] to-transparent" />
            </div>
          </div>
          <p className="text-sm text-[--text-muted] mt-2 ml-[52px]">Manage plans, pricing, and features for your subscription tiers</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#10B981] uppercase tracking-widest font-medium bg-[#10B981]/10 border border-[#10B981]/20 rounded-full px-3 py-1">
            {plans.length} Plans
          </span>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs bg-gradient-to-r from-[#10B981] to-[#10B981] text-[--text-primary] font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Plan
          </button>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active Plans', value: plans.filter(p => p.isActive).length, icon: Zap, color: 'text-[#10B981]' },
          { label: 'Paid Plans', value: plans.filter(p => p.monthlyPrice > 0 || p.lifetimePrice).length, icon: DollarSign, color: 'text-[--status-warning]' },
          { label: 'With Trial', value: plans.filter(p => p.trialDays > 0).length, icon: Clock, color: 'text-[#10B981]' },
          { label: 'Total Features', value: plans.reduce((s, p) => s + p.features.length, 0), icon: Star, color: 'text-[#10B981]' },
        ].map(stat => (
          <motion.div key={stat.label} variants={itemVariants} className="bg-[--bg-surface] border border-[#10B981]/10 rounded-xl p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
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
          <CreatePlanForm onSave={handleCreatePlan} onCancel={() => setShowCreateForm(false)} />
        )}
      </AnimatePresence>

      {/* Edit Form */}
      <AnimatePresence>
        {editingPlan && (
          <PlanEditForm
            plan={editingPlan}
            onSave={handleSavePlan}
            onCancel={() => setEditingPlan(null)}
          />
        )}
      </AnimatePresence>

      {/* Plans Grid */}
      <div className="max-h-[500px] overflow-y-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plans.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onEdit={setEditingPlan}
            onToggleActive={handleToggleActive}
          />
        ))}
      </div>

      {/* Pricing Comparison Table */}
      {plans.length > 0 && (
        <motion.div variants={itemVariants} className="bg-[--bg-surface] border border-[#10B981]/15 rounded-xl overflow-hidden">
          <div className="p-5 pb-0">
            <h3 className="text-base font-semibold text-[--text-primary] mb-1">Pricing Comparison</h3>
            <p className="text-xs text-[--text-muted]">Side-by-side plan pricing overview</p>
          </div>
          <div className="overflow-x-auto custom-scrollbar mt-4">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-[#10B981]/10">
                  <th className="text-left text-[11px] font-medium text-[--text-muted] uppercase tracking-wider px-5 py-3">Feature</th>
                  {plans.map(p => (
                    <th key={p.id} className="text-center text-[11px] font-medium text-[--text-muted] uppercase tracking-wider px-5 py-3">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#10B981]/5">
                  <td className="px-5 py-3 text-sm text-[--text-secondary] font-medium">Monthly Price</td>
                  {plans.map(p => (
                    <td key={p.id} className="px-5 py-3 text-sm text-[--text-primary] text-center font-semibold">
                      {p.monthlyPrice === 0 ? 'Free' : `$${p.monthlyPrice}`}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-[#10B981]/5">
                  <td className="px-5 py-3 text-sm text-[--text-secondary] font-medium">Yearly Price</td>
                  {plans.map(p => (
                    <td key={p.id} className="px-5 py-3 text-sm text-[--text-muted] text-center">
                      {p.yearlyPrice ? `$${p.yearlyPrice}` : '—'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-[#10B981]/5">
                  <td className="px-5 py-3 text-sm text-[--text-secondary] font-medium">Trial Days</td>
                  {plans.map(p => (
                    <td key={p.id} className="px-5 py-3 text-sm text-[--text-muted] text-center">
                      {p.trialDays > 0 ? `${p.trialDays} days` : '—'}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-[#10B981]/5">
                  <td className="px-5 py-3 text-sm text-[--text-secondary] font-medium">Features</td>
                  {plans.map(p => (
                    <td key={p.id} className="px-5 py-3 text-sm text-[#10B981] text-center font-medium">
                      {p.features.length}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
