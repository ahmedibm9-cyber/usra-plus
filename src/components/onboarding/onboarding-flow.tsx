'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient, isDemoMode } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useAppStore } from '@/stores/app-store'
import { useI18n } from '@/i18n/use-translation'
import { safeJsonResponse } from '@/lib/safe-fetch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Users, UserPlus, Home, Copy, Check, ChevronRight, Sparkles, Wand2, WifiOff,
  Calendar, ListChecks, ShoppingCart, MessageCircle, Shield, Zap, Heart, Star
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { AvatarGenerator } from '@/components/shared/avatar-generator'

// ─── Avatar Options ──────────────────────────────────────────────
const AVATAR_OPTIONS = ['🏠', '👨‍👩‍👧‍👦', '🕌', '🌙', '🏡', '💼', '❤️', '🌟']

// ─── Color Options ───────────────────────────────────────────────
const COLOR_OPTIONS = [
  { name: 'signal', bg: 'bg-[#E50914]', light: 'bg-[#E50914]/20', border: 'border-[#E50914]', text: 'text-[#E50914]', hex: '#E50914' },
  { name: 'gold', bg: 'bg-[#F4C430]', light: 'bg-[#F4C430]/20', border: 'border-[#F4C430]', text: 'text-[#F4C430]', hex: '#F4C430' },
  { name: 'emerald', bg: 'bg-[#22C55E]', light: 'bg-[#22C55E]/20', border: 'border-[#22C55E]', text: 'text-[#22C55E]', hex: '#22C55E' },
  { name: 'amber', bg: 'bg-amber-500', light: 'bg-amber-500/20', border: 'border-amber-500', text: 'text-amber-400', hex: '#F59E0B' },
  { name: 'rose', bg: 'bg-rose-500', light: 'bg-rose-500/20', border: 'border-rose-500', text: 'text-rose-400', hex: '#F43F5E' },
  { name: 'cyan', bg: 'bg-[#E50914]', light: 'bg-[#E50914]/20', border: 'border-[#E50914]', text: 'text-[#E50914]', hex: '#F4C430' },
]

// ─── Step Types ──────────────────────────────────────────────────
type OnboardingStep = 1 | 2 | 3
type FamilyAction = 'choose' | 'create' | 'join'

// ─── Feature Cards Data ─────────────────────────────────────────
const FEATURE_CARDS = [
  {
    icon: Calendar,
    title: 'Shared Calendar',
    description: 'Sync family schedules',
    color: '#E50914',
  },
  {
    icon: ListChecks,
    title: 'Task Management',
    description: 'Assign & track chores',
    color: '#F4C430',
  },
  {
    icon: ShoppingCart,
    title: 'Smart Grocery',
    description: 'Shared shopping lists',
    color: '#E50914',
  },
  {
    icon: MessageCircle,
    title: 'Family Chat',
    description: 'Stay connected always',
    color: '#F4C430',
  },
]

// ─── Family Benefits Data ───────────────────────────────────────
const FAMILY_BENEFITS = [
  { icon: Shield, text: 'Private & secure space', color: '#E50914' },
  { icon: Users, text: 'Up to 20 family members', color: '#F4C430' },
  { icon: Zap, text: 'Real-time sync & updates', color: '#E50914' },
]

// ─── Floating Particle Component ────────────────────────────────
function FloatingParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 10,
      opacity: Math.random() * 0.3 + 0.05,
    })),
    []
  )

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.id % 3 === 0 ? '#E50914' : '#F4C430',
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [p.opacity, p.opacity * 2, p.opacity],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// ─── Animation Variants ─────────────────────────────────────────
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
    scale: 0.98,
  }),
}

// ─── Step Progress Bar ─────────────────────────────────────────
function StepProgressBar({ currentStep }: { currentStep: OnboardingStep }) {
  const steps = [
    { num: 1, label: 'Welcome' },
    { num: 2, label: 'Family' },
    { num: 3, label: 'Personalize' },
  ]
  const percentage = Math.round(((currentStep) / 3) * 100)

  return (
    <div className="w-full mb-8">
      {/* Step Labels in JetBrains Mono */}
      <div className="flex items-center justify-between mb-3">
        {steps.map((step) => (
          <div key={step.num} className="flex items-center gap-1.5">
            <span
              className={`font-metric text-[10px] tracking-widest uppercase transition-colors duration-300 ${
                step.num === currentStep
                  ? 'text-[#E50914]'
                  : step.num < currentStep
                  ? 'text-[#F4C430]'
                  : 'text-[--text-muted]'
              }`}
            >
              {step.num}/3
            </span>
            <span
              className={`font-metric text-[10px] tracking-wider uppercase transition-colors duration-300 hidden sm:inline ${
                step.num === currentStep
                  ? 'text-[--text-primary]'
                  : step.num < currentStep
                  ? 'text-[--text-secondary]'
                  : 'text-[--text-muted]'
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="relative h-1 bg-[--border-subtle] rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: 'linear-gradient(90deg, #E50914, #F4C430)',
          }}
          initial={{ width: '0%' }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
        {/* Glow on the progress tip */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full"
          style={{
            left: `${percentage}%`,
            background: '#F4C430',
            boxShadow: '0 0 8px rgba(244, 196, 48, 0.6), 0 0 16px rgba(229, 9, 20, 0.3)',
          }}
          initial={{ x: '-50%', opacity: 0 }}
          animate={{ x: '-50%', opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      {/* Percentage */}
      <div className="flex justify-end mt-1.5">
        <span className="font-metric text-[10px] text-[#F4C430] tracking-wider">
          {percentage}%
        </span>
      </div>
    </div>
  )
}

// ─── Step 1: Welcome Screen ─────────────────────────────────────
function WelcomeStep({ onGetStarted, onSkip }: { onGetStarted: () => void; onSkip: () => void }) {
  const { t } = useI18n()
  const tagline = t.app.tagline
  const [displayedText, setDisplayedText] = useState('')
  const [showButton, setShowButton] = useState(false)
  const [showFeatures, setShowFeatures] = useState(false)

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i <= tagline.length) {
        setDisplayedText(tagline.slice(0, i))
        i++
      } else {
        clearInterval(interval)
        setTimeout(() => setShowFeatures(true), 200)
        setTimeout(() => setShowButton(true), 600)
      }
    }, 45)
    return () => clearInterval(interval)
  }, [tagline])

  return (
    <div className="flex flex-col items-center justify-center text-center">
      {/* Animated Logo - Large & Impactful */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 150, damping: 12, delay: 0.2 }}
        className="relative mb-6"
      >
        {/* Outer glow ring */}
        <motion.div
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(229, 9, 20, 0)',
              '0 0 60px 10px rgba(229, 9, 20, 0.2)',
              '0 0 0 0 rgba(229, 9, 20, 0)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-[#E50914] via-[#C40812] to-[#8B0000] flex items-center justify-center relative"
        >
          <Home className="w-14 h-14 text-white" />
          {/* Inner shine */}
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
        </motion.div>
        {/* Orbiting dot */}
        <motion.div
          className="absolute w-2 h-2 rounded-full bg-[#F4C430]"
          style={{ top: '50%', left: '50%' }}
          animate={{
            x: [0, 58, 0, -58, 0],
            y: [-58, 0, 58, 0, -58],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>

      {/* App Name - Dramatic entrance */}
      <motion.div
        initial={{ opacity: 0, y: 20, letterSpacing: '0.5em' }}
        animate={{ opacity: 1, y: 0, letterSpacing: '0.15em' }}
        transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
      >
        <h1
          className="text-4xl sm:text-5xl font-bold text-[--text-primary] tracking-[0.15em] mb-2"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          USRA PLUS
        </h1>
      </motion.div>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="font-metric text-[10px] tracking-[0.3em] uppercase text-[--text-muted] mb-6"
      >
        Family Operating System
      </motion.p>

      {/* Animated Tagline - Premium typing effect */}
      <div className="h-8 mb-8">
        <p
          className="text-lg sm:text-xl text-[--text-secondary] font-medium"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {displayedText}
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
            className="inline-block w-[2px] h-5 bg-[#E50914] ml-0.5 align-middle"
          />
        </p>
      </div>

      {/* Feature Highlight Cards */}
      <AnimatePresence>
        {showFeatures && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-sm grid grid-cols-2 gap-3 mb-8"
          >
            {FEATURE_CARDS.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.1, duration: 0.4, ease: 'easeOut' }}
                className="group relative rounded-xl p-3.5 bg-[--bg-surface]/80 border border-[--border-subtle] text-left hover:border-[--border-medium] transition-all duration-300"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
                  style={{ backgroundColor: `${feature.color}15` }}
                >
                  <feature.icon
                    className="w-4 h-4"
                    style={{ color: feature.color }}
                  />
                </div>
                <h4
                  className="text-[--text-primary] text-sm font-semibold mb-0.5"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {feature.title}
                </h4>
                <p className="text-[--text-muted] text-[11px] leading-tight">
                  {feature.description}
                </p>
                {/* Subtle hover glow */}
                <div
                  className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle at center, ${feature.color}08, transparent 70%)`,
                  }}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Get Started Button with glow */}
      <AnimatePresence>
        {showButton && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-xs"
          >
            <Button
              onClick={onGetStarted}
              className="w-full h-13 bg-[#E50914] hover:bg-[#C40812] text-white text-base font-semibold rounded-xl btn-press transition-all duration-300 hover:shadow-[0_0_40px_rgba(229,9,20,0.4)] relative overflow-hidden group"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {/* Shimmer effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <span className="relative z-10 flex items-center justify-center gap-2">
                {t.onboarding.getStarted || 'Get Started'}
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip for existing users */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        onClick={onSkip}
        className="mt-6 text-[--text-muted] hover:text-[--text-secondary] text-sm transition-colors"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {t.onboarding.skip}
      </motion.button>
    </div>
  )
}

// ─── Step 2: Create or Join Family ──────────────────────────────
function FamilyStep({
  onAdvance,
}: {
  onAdvance: () => void
}) {
  const { t, isRTL } = useI18n()
  const { user } = useAuthStore()
  const { setCurrentFamily, setFamilyMembers, setFamilies, setFamilyAvatar, setFamilyColor } = useAppStore()
  const [action, setAction] = useState<FamilyAction>('choose')
  const [familyName, setFamilyName] = useState('')
  const [familyDescription, setFamilyDescription] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [createdCode, setCreatedCode] = useState('')

  const supabase = useMemo(() => createClient(), [])

  const handleCreateFamily = useCallback(async () => {
    if (!familyName.trim()) {
      toast.error(t.common.error)
      return
    }
    if (!user?.id) { toast.error('Not authenticated'); return }

    // In local mode, create a local family without Supabase
    if (isDemoMode()) {
      const familyId = crypto.randomUUID()
      const family = {
        id: familyId,
        name: familyName.trim(),
        description: familyDescription.trim() || null,
        invite_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
        avatar_url: null,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setCurrentFamily(family)
      setCreatedCode(family.invite_code)
      setFamilies([family])
      setFamilyMembers([{
        id: crypto.randomUUID(),
        family_id: familyId,
        user_id: user.id,
        role: 'owner',
        nickname: null,
        joined_at: new Date().toISOString(),
        profiles: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, phone: null, country_code: null, avatar_url: null, language: 'en' as const, theme: 'dark' as const, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      }])
      toast.success(t.common.success)
      onAdvance()
      return
    }

    setIsLoading(true)
    try {
      // Use API route for family creation (admin Supabase client, bypasses RLS)
      const res = await fetch('/api/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: familyName.trim(),
          description: familyDescription.trim() || null,
          userId: user.id,
        }),
      })

      const data = await safeJsonResponse<{ family?: Record<string, unknown>; error?: string }>(res)

      if (!res.ok || !data) {
        throw new Error(data?.error || t.common.error)
      }

      const family = data.family
      if (!family) { toast.error(t.common.error); setIsLoading(false); return }

      setCurrentFamily(family)
      setCreatedCode(family.invite_code)

      // Set the families list (include the just-created family)
      setFamilies([family])

      // Add self as owner in the family members store
      setFamilyMembers([{
        id: crypto.randomUUID(),
        family_id: family.id,
        user_id: user.id,
        role: 'owner',
        nickname: null,
        joined_at: new Date().toISOString(),
        profiles: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, phone: null, country_code: null, avatar_url: user.avatar_url, language: 'en' as const, theme: 'dark' as const, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      }])

      // Fetch all family memberships for this user (best-effort)
      try {
        const { data: allFamilies } = await supabase
          .from('family_members')
          .select('family_id, families(*)')
          .eq('user_id', user?.id)

        if (allFamilies && allFamilies.length > 0) {
          const families = allFamilies.map(f => f.families).filter(Boolean)
          if (families.length > 0) setFamilies(families)
        }
      } catch (fetchErr) {
        console.warn('[Onboarding] Could not fetch all families (RLS may still be propagating):', fetchErr)
      }

      toast.success(t.common.success)
      onAdvance()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t.common.error
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [familyName, familyDescription, user, supabase, setCurrentFamily, setFamilies, setFamilyMembers, setFamilyAvatar, setFamilyColor, t, onAdvance])

  const handleJoinFamily = useCallback(async () => {
    if (!inviteCode.trim()) {
      toast.error(t.common.error)
      return
    }

    // Join family not supported in local mode
    if (isDemoMode()) {
      toast.error(isRTL ? 'الانضمام لعائلة يتطلب اتصال بالإنترنت' : 'Joining a family requires an internet connection. Please create a new family instead.')
      return
    }

    setIsLoading(true)
    try {
      // Use API route for joining family (admin Supabase client, bypasses RLS)
      const res = await fetch('/api/families', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode: inviteCode.trim().toUpperCase(),
          userId: user?.id,
        }),
      })

      const data = await safeJsonResponse<{ family?: Record<string, unknown>; error?: string }>(res)

      if (!res.ok || !data) {
        toast.error(data?.error || 'Invalid invite code')
        setIsLoading(false)
        return
      }

      const family = data.family
      setCurrentFamily(family)

      // Fetch family members
      const { data: members } = await supabase
        .from('family_members')
        .select('*, profiles(*)')
        .eq('family_id', family.id)

      if (members) setFamilyMembers(members)

      const { data: allFamilies } = await supabase
        .from('family_members')
        .select('family_id, families(*)')
        .eq('user_id', user?.id)

      if (allFamilies) {
        setFamilies(allFamilies.map(f => f.families).filter(Boolean))
      }

      toast.success(t.common.success)
      onAdvance()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t.common.error
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [inviteCode, user, supabase, setCurrentFamily, setFamilies, setFamilyMembers, t, onAdvance])

  const copyCode = () => {
    try {
      navigator.clipboard.writeText(createdCode)
      setCopiedCode(true)
      toast.success(t.common.copied)
      setTimeout(() => setCopiedCode(false), 2000)
    } catch {
      toast.error(t.common.error)
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Offline mode notice */}
      {isDemoMode() && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4"
        >
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs text-amber-300">{isRTL ? 'الوضع بدون إنترنت — لن يتم حفظ العائلة على الخادم' : 'Offline mode — family will be stored locally'}</p>
        </motion.div>
      )}
      <AnimatePresence mode="wait">
        {action === 'choose' && (
          <motion.div
            key="choose"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="space-y-5"
          >
            {createdCode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[--bg-surface] border border-green-500/30 rounded-xl p-4"
              >
                <p className="text-green-400 text-sm font-medium mb-2">Family created! Share this invite code:</p>
                <div className="flex items-center gap-2">
                  <code className="bg-black/40 px-3 py-1.5 rounded-lg text-white font-metric text-lg tracking-wider">
                    {createdCode}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyCode} className="border-[--border-subtle]">
                    {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Two cards side by side on desktop, stacked on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Create a Family Card */}
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setAction('create')}
                className="group relative rounded-2xl p-6 bg-[--bg-surface] border border-[--border-subtle] hover:border-[#E50914]/40 transition-all duration-300 text-left overflow-hidden"
                style={{
                  boxShadow: '0 0 0 0 rgba(229, 9, 20, 0)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(229, 9, 20, 0.12)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 0 0 rgba(229, 9, 20, 0)'
                }}
              >
                {/* Animated gradient bg on hover */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#E50914]/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {/* Top accent line */}
                <div className="absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-[#E50914]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-[#E50914]/15 flex items-center justify-center mb-4 group-hover:bg-[#E50914]/25 transition-colors duration-300">
                    <Users className="w-7 h-7 text-[#E50914]" />
                  </div>
                  <h3
                    className="text-[--text-primary] font-semibold mb-1.5"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {t.onboarding.createFamily}
                  </h3>
                  <p className="text-[--text-muted] text-sm">Start a new family space</p>
                  <div className="mt-3 flex items-center gap-1 text-[#E50914] text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span>Create</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </motion.button>

              {/* Join a Family Card */}
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setAction('join')}
                className="group relative rounded-2xl p-6 bg-[--bg-surface] border border-[--border-subtle] hover:border-[#F4C430]/40 transition-all duration-300 text-left overflow-hidden"
                style={{
                  boxShadow: '0 0 0 0 rgba(244, 196, 48, 0)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(244, 196, 48, 0.10)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 0 0 rgba(244, 196, 48, 0)'
                }}
              >
                {/* Animated gradient bg on hover */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#F4C430]/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {/* Top accent line */}
                <div className="absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-[#F4C430]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-[#F4C430]/15 flex items-center justify-center mb-4 group-hover:bg-[#F4C430]/25 transition-colors duration-300">
                    <UserPlus className="w-7 h-7 text-[#F4C430]" />
                  </div>
                  <h3
                    className="text-[--text-primary] font-semibold mb-1.5"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {t.onboarding.joinFamily}
                  </h3>
                  <p className="text-[--text-muted] text-sm">Enter an invite code</p>
                  <div className="mt-3 flex items-center gap-1 text-[#F4C430] text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span>Join</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </motion.button>
            </div>

            {/* Family Benefits Section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="rounded-xl p-4 bg-[--bg-surface]/50 border border-[--border-subtle]"
            >
              <p
                className="text-[--text-muted] text-[10px] tracking-[0.2em] uppercase mb-3 font-metric"
              >
                What you get
              </p>
              <div className="space-y-2.5">
                {FAMILY_BENEFITS.map((benefit, i) => (
                  <motion.div
                    key={benefit.text}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1, duration: 0.3 }}
                    className="flex items-center gap-2.5"
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${benefit.color}15` }}
                    >
                      <benefit.icon className="w-3.5 h-3.5" style={{ color: benefit.color }} />
                    </div>
                    <span className="text-[--text-secondary] text-sm">{benefit.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Hint text */}
            <p className="text-center text-[--text-muted] text-xs pt-1">
              {t.onboarding.chooseOrCreate || 'Choose an option to continue'}
            </p>
          </motion.div>
        )}

        {action === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-2xl overflow-hidden shadow-lg">
              {/* Red accent bar at top */}
              <div className="h-[2px] bg-gradient-to-r from-transparent via-[#E50914] to-transparent" />

              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E50914]/15 flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#E50914]" />
                  </div>
                  <div>
                    <h2
                      className="text-lg font-semibold text-[--text-primary]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {t.onboarding.createFamily}
                    </h2>
                    <p className="text-[--text-muted] text-xs">Set up your family space</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[--text-secondary] text-sm">{t.onboarding.familyName}</Label>
                  <Input
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder="The Smith Family"
                    className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted] h-11 focus:border-[#E50914]/50 focus:ring-[#E50914]/20 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[--text-secondary] text-sm">{t.onboarding.familyDescription}</Label>
                  <Textarea
                    value={familyDescription}
                    onChange={(e) => setFamilyDescription(e.target.value)}
                    placeholder="A loving family..."
                    className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted] resize-none focus:border-[#E50914]/50 focus:ring-[#E50914]/20 transition-colors"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setAction('choose')}
                    className="flex-1 border-[--border-subtle] text-[--text-secondary] hover:bg-[--bg-surface-2] h-11"
                  >
                    {t.common.cancel}
                  </Button>
                  <Button
                    onClick={handleCreateFamily}
                    disabled={isLoading || !familyName.trim()}
                    className="flex-1 bg-[#E50914] hover:bg-[#C40812] text-white h-11 font-semibold hover:shadow-[0_0_20px_rgba(229,9,20,0.3)] transition-all duration-300"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {isLoading ? t.common.loading : t.onboarding.create}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {action === 'join' && (
          <motion.div
            key="join"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="bg-[--bg-surface] border border-[--border-subtle] rounded-2xl overflow-hidden shadow-lg">
              {/* Yellow accent bar at top */}
              <div className="h-[2px] bg-gradient-to-r from-transparent via-[#F4C430] to-transparent" />

              <div className="p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F4C430]/15 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-[#F4C430]" />
                  </div>
                  <div>
                    <h2
                      className="text-lg font-semibold text-[--text-primary]"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {t.onboarding.joinFamily}
                    </h2>
                    <p className="text-[--text-muted] text-xs">Enter an invite code from your family</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[--text-secondary] text-sm">{t.onboarding.enterCode}</Label>
                  <Input
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="ABCD1234"
                    className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] font-metric text-lg tracking-[0.3em] text-center placeholder:text-[--text-muted] placeholder:tracking-widest h-12 focus:border-[#F4C430]/50 focus:ring-[#F4C430]/20 transition-colors"
                    maxLength={8}
                  />
                </div>

                <div className="flex gap-3 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setAction('choose')}
                    className="flex-1 border-[--border-subtle] text-[--text-secondary] hover:bg-[--bg-surface-2] h-11"
                  >
                    {t.common.cancel}
                  </Button>
                  <Button
                    onClick={handleJoinFamily}
                    disabled={isLoading || !inviteCode.trim()}
                    className="flex-1 bg-[#F4C430] hover:bg-[#D4A820] text-black font-semibold h-11 hover:shadow-[0_0_20px_rgba(244,196,48,0.3)] transition-all duration-300"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {isLoading ? t.common.loading : t.onboarding.join}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Step 3: Personalize ────────────────────────────────────────
function PersonalizeStep({ onComplete }: { onComplete: () => void }) {
  const { t, isRTL } = useI18n()
  const { user, setUser } = useAuthStore()
  const { familyAvatar, familyColor, setFamilyAvatar, setFamilyColor, setCurrentFamily, currentFamily } = useAppStore()
  const [avatarGenOpen, setAvatarGenOpen] = useState(false)
  const [aiAvatarUrl, setAiAvatarUrl] = useState<string | null>(null)
  const selectedColorOption = COLOR_OPTIONS.find(c => c.name === familyColor) || COLOR_OPTIONS[0]

  const handleAvatarApply = useCallback((imageUrl: string) => {
    setAiAvatarUrl(imageUrl)
    // Update family avatar_url
    if (currentFamily) {
      setCurrentFamily({ ...currentFamily, avatar_url: imageUrl })
    }
    // Update user avatar
    if (user) {
      setUser({ ...user, avatar_url: imageUrl })
    }
  }, [currentFamily, user, setCurrentFamily, setUser])

  const displayAvatar = aiAvatarUrl ? (
    <img src={aiAvatarUrl} alt="AI Generated Avatar" className="size-16 rounded-full object-cover" />
  ) : (
    <span className="text-5xl">{familyAvatar}</span>
  )

  return (
    <div className="w-full max-w-lg mx-auto space-y-7">
      {/* Family Name Confirmation */}
      {currentFamily?.name && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="font-metric text-[10px] tracking-[0.25em] uppercase text-[--text-muted] mb-1">
            Your Family
          </p>
          <h3
            className="text-lg font-semibold text-[--text-primary]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {currentFamily.name}
          </h3>
        </motion.div>
      )}

      {/* Family Avatar Preview - Premium */}
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className={`w-28 h-28 rounded-full ${selectedColorOption.light} flex items-center justify-center mb-3 transition-colors duration-500 relative overflow-hidden`}
          style={{ boxShadow: `0 0 40px ${selectedColorOption.hex}25, inset 0 0 20px ${selectedColorOption.hex}10` }}
        >
          {displayAvatar}
          {/* Animated ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: `${selectedColorOption.hex}40` }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
        <p className="text-[--text-muted] text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
          {t.onboarding.familyAvatar || 'Choose your family avatar'}
        </p>
      </div>

      {/* Avatar Grid - Engaging with hover effects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3
            className="text-[--text-secondary] text-sm font-medium"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {t.onboarding.pickAvatar || 'Pick an avatar'}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAvatarGenOpen(true)}
            className="border-[#E50914]/30 text-[#E50914] hover:bg-[#E50914]/10 hover:text-[#C40812] h-7 text-xs"
          >
            <Wand2 className="size-3 mr-1" />
            {t.avatarGen.generateWithAI}
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {AVATAR_OPTIONS.map((emoji, i) => (
            <motion.button
              key={emoji}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              whileHover={{ scale: 1.12, y: -4 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                setFamilyAvatar(emoji)
                setAiAvatarUrl(null)
              }}
              className={`w-full aspect-square rounded-xl flex items-center justify-center text-2xl transition-all duration-200 relative overflow-hidden ${
                familyAvatar === emoji && !aiAvatarUrl
                  ? `${selectedColorOption.light} ${selectedColorOption.border} border-2 shadow-lg`
                  : 'bg-[--bg-surface] border border-[--border-subtle] hover:border-[#E50914]/30'
              }`}
            >
              {emoji}
              {/* Hover glow ring */}
              {familyAvatar !== emoji && (
                <div className="absolute inset-0 rounded-xl bg-[#E50914]/5 opacity-0 hover:opacity-100 transition-opacity duration-200" />
              )}
              {/* Selected indicator dot */}
              {familyAvatar === emoji && !aiAvatarUrl && (
                <motion.div
                  layoutId="avatar-selected"
                  className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-[#E50914]"
                  style={{ boxShadow: '0 0 6px rgba(229, 9, 20, 0.6)' }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Color Theme Picker with UI Preview */}
      <div>
        <h3
          className="text-[--text-secondary] text-sm font-medium mb-3"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {t.onboarding.pickColor || 'Pick a color theme'}
        </h3>
        <div className="grid grid-cols-6 gap-3 mb-4">
          {COLOR_OPTIONS.map((color, i) => (
            <motion.button
              key={color.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              whileHover={{ scale: 1.15, y: -3 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setFamilyColor(color.name)}
              className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 relative ${
                familyColor === color.name
                  ? `ring-2 ring-offset-2 ring-offset-[--bg-primary] ${color.bg} ring-white/30`
                  : `${color.bg}/30 hover:${color.bg}/50`
              }`}
              style={familyColor === color.name ? { boxShadow: `0 0 20px ${color.hex}66` } : undefined}
            >
              {familyColor === color.name && (
                <motion.svg
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </motion.svg>
              )}
            </motion.button>
          ))}
        </div>

        {/* Color Preview - Show how the color looks applied to UI elements */}
        <motion.div
          layout
          className="rounded-xl p-4 bg-[--bg-surface] border border-[--border-subtle] overflow-hidden"
          transition={{ duration: 0.3 }}
        >
          <p className="font-metric text-[10px] tracking-[0.2em] uppercase text-[--text-muted] mb-3">
            Preview
          </p>
          <div className="space-y-2.5">
            {/* Button preview */}
            <div
              className="h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold transition-all duration-300"
              style={{
                backgroundColor: selectedColorOption.hex,
                boxShadow: `0 0 12px ${selectedColorOption.hex}30`,
              }}
            >
              Sample Action Button
            </div>
            {/* Badge / Tag preview */}
            <div className="flex items-center gap-2">
              <div
                className="px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all duration-300"
                style={{
                  backgroundColor: `${selectedColorOption.hex}20`,
                  color: selectedColorOption.hex,
                }}
              >
                Family Badge
              </div>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300"
                style={{
                  backgroundColor: `${selectedColorOption.hex}20`,
                  color: selectedColorOption.hex,
                }}
              >
                U
              </div>
              <div
                className="h-1.5 flex-1 rounded-full overflow-hidden bg-[--border-subtle]"
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: selectedColorOption.hex }}
                  initial={{ width: '0%' }}
                  animate={{ width: '65%' }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Ready to Go Summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-xl p-4 bg-[--bg-surface]/50 border border-dashed border-[--border-subtle]"
      >
        <div className="flex items-start gap-3">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 3 }}
          >
            <Star className="w-5 h-5 text-[#F4C430]" />
          </motion.div>
          <div>
            <p
              className="text-[--text-primary] text-sm font-semibold"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Ready to go!
            </p>
            <p className="text-[--text-muted] text-xs mt-0.5">
              {currentFamily?.name
                ? `${currentFamily.name} is set up and waiting for you.`
                : 'Your family space is ready. Let\'s make it yours!'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Complete Button */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Button
          onClick={onComplete}
          className="w-full h-13 bg-[#E50914] hover:bg-[#C40812] text-white font-semibold rounded-xl btn-press transition-all duration-300 hover:shadow-[0_0_40px_rgba(229,9,20,0.4)] flex items-center justify-center gap-2 relative overflow-hidden group"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <Sparkles className="w-4 h-4" />
          {t.onboarding.looksGreat || 'Looks Great!'}
        </Button>
      </motion.div>

      {/* Avatar Generator Modal */}
      <AvatarGenerator
        open={avatarGenOpen}
        onOpenChange={setAvatarGenOpen}
        onApply={handleAvatarApply}
        mode="simple"
        context="family"
      />
    </div>
  )
}

// ─── Main Onboarding Flow ───────────────────────────────────────
export function OnboardingFlow() {
  const { t } = useI18n()
  const { setShowOnboarding } = useAppStore()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1)
  const [direction, setDirection] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)

  const goToStep = (step: OnboardingStep) => {
    setDirection(step > currentStep ? 1 : -1)
    setCurrentStep(step)
  }

  const handleComplete = () => {
    setShowOnboarding(false)
    toast.success(t.common.success)
  }

  // Step titles
  const stepTitles: Record<OnboardingStep, string> = {
    1: 'Welcome',
    2: 'Family',
    3: 'Personalize',
  }

  return (
    <div className="min-h-screen bg-[--bg-primary] auth-bg flex items-center justify-center p-4">
      {/* Animated gradient blobs */}
      <div className="auth-blob-1" />
      <div className="auth-blob-2" />
      <div className="auth-blob-3" />

      {/* Floating particles */}
      <FloatingParticles />

      {/* Main Container with glow */}
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-lg relative z-10"
        style={{
          boxShadow: '0 0 80px rgba(229, 9, 20, 0.04), 0 0 160px rgba(244, 196, 48, 0.02)',
        }}
      >
        {/* Progress Bar */}
        <StepProgressBar currentStep={currentStep} />

        {/* Step Title in JetBrains Mono */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: '#E50914',
                boxShadow: '0 0 6px rgba(229, 9, 20, 0.5)',
              }}
            />
            <span className="font-metric text-[10px] tracking-[0.3em] uppercase text-[#E50914]">
              {currentStep}/3
            </span>
          </div>
          <h2
            className="text-xl font-semibold text-[--text-primary]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {stepTitles[currentStep]}
          </h2>
          <div className="w-12" /> {/* Spacer for alignment */}
        </div>

        {/* Step Content with slide transitions */}
        <AnimatePresence mode="wait" custom={direction}>
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <WelcomeStep
                onGetStarted={() => goToStep(2)}
                onSkip={() => setShowOnboarding(false)}
              />
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step-2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* Step 2 Header */}
              <div className="text-center mb-6">
                <h2
                  className="text-xl font-semibold text-[--text-primary] mb-1"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {t.onboarding.setupFamily || 'Set Up Your Family'}
                </h2>
                <p
                  className="text-[--text-muted] text-sm"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {t.onboarding.setupFamilyDesc || 'Create a new family or join an existing one'}
                </p>
              </div>
              <FamilyStep onAdvance={() => goToStep(3)} />
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step-3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* Step 3 Header */}
              <div className="text-center mb-6">
                <h2
                  className="text-xl font-semibold text-[--text-primary] mb-1"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {t.onboarding.personalize || 'Personalize'}
                </h2>
                <p
                  className="text-[--text-muted] text-sm"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {t.onboarding.personalizeDesc || 'Make it yours'}
                </p>
              </div>
              <PersonalizeStep onComplete={handleComplete} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
