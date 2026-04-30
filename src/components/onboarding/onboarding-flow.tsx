'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useAppStore } from '@/stores/app-store'
import { useI18n } from '@/i18n/use-translation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Users, UserPlus, Home, Copy, Check, ChevronRight, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Avatar Options ──────────────────────────────────────────────
const AVATAR_OPTIONS = ['🏠', '👨‍👩‍👧‍👦', '🕌', '🌙', '🏡', '💼', '❤️', '🌟']

// ─── Color Options ───────────────────────────────────────────────
const COLOR_OPTIONS = [
  { name: 'indigo', bg: 'bg-indigo-500', light: 'bg-indigo-500/20', border: 'border-indigo-500', text: 'text-indigo-400', hex: '#6366F1' },
  { name: 'violet', bg: 'bg-violet-500', light: 'bg-violet-500/20', border: 'border-violet-500', text: 'text-violet-400', hex: '#8B5CF6' },
  { name: 'emerald', bg: 'bg-emerald-500', light: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-400', hex: '#10B981' },
  { name: 'amber', bg: 'bg-amber-500', light: 'bg-amber-500/20', border: 'border-amber-500', text: 'text-amber-400', hex: '#F59E0B' },
  { name: 'rose', bg: 'bg-rose-500', light: 'bg-rose-500/20', border: 'border-rose-500', text: 'text-rose-400', hex: '#F43F5E' },
  { name: 'cyan', bg: 'bg-cyan-500', light: 'bg-cyan-500/20', border: 'border-cyan-500', text: 'text-cyan-400', hex: '#06B6D4' },
]

// ─── Step Types ──────────────────────────────────────────────────
type OnboardingStep = 1 | 2 | 3
type FamilyAction = 'choose' | 'create' | 'join'

// ─── Animation Variants ─────────────────────────────────────────
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
}

// ─── Step Progress Indicator ────────────────────────────────────
function StepProgress({ currentStep }: { currentStep: OnboardingStep }) {
  const steps = [1, 2, 3]
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center">
          {/* Step dot */}
          <motion.div
            className="relative flex items-center justify-center"
            initial={false}
            animate={{
              scale: currentStep === step ? 1.1 : 1,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                step < currentStep
                  ? 'bg-indigo-500 text-white'
                  : step === currentStep
                  ? 'bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]'
                  : 'bg-white/[0.06] text-gray-500 border border-white/[0.08]'
              }`}
            >
              {step < currentStep ? (
                <motion.svg
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </motion.svg>
              ) : (
                step
              )}
            </div>
          </motion.div>
          {/* Connecting line */}
          {i < steps.length - 1 && (
            <div className="w-12 sm:w-16 h-[2px] mx-1 relative overflow-hidden rounded-full">
              <div className="absolute inset-0 bg-white/[0.08]" />
              <motion.div
                className="absolute inset-y-0 left-0 bg-indigo-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{
                  width: step < currentStep ? '100%' : '0%',
                }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Step 1: Welcome Screen ─────────────────────────────────────
function WelcomeStep({ onGetStarted, onSkip }: { onGetStarted: () => void; onSkip: () => void }) {
  const { t } = useI18n()
  const tagline = t.app.tagline
  const [displayedText, setDisplayedText] = useState('')
  const [showButton, setShowButton] = useState(false)

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i <= tagline.length) {
        setDisplayedText(tagline.slice(0, i))
        i++
      } else {
        clearInterval(interval)
        setTimeout(() => setShowButton(true), 300)
      }
    }, 50)
    return () => clearInterval(interval)
  }, [tagline])

  return (
    <div className="flex flex-col items-center justify-center text-center">
      {/* Animated Logo */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        className="relative mb-8"
      >
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.3)]">
          <Home className="w-12 h-12 text-white" />
        </div>
        {/* Ambient glow ring */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-500 animate-pulse-glow opacity-40 blur-lg" />
      </motion.div>

      {/* App Name */}
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4"
      >
        USRA PLUS
      </motion.h1>

      {/* Animated Tagline */}
      <div className="h-8 mb-10">
        <p className="text-lg sm:text-xl text-gray-400 font-medium">
          {displayedText}
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
            className="inline-block w-0.5 h-5 bg-indigo-400 ml-0.5 align-middle"
          />
        </p>
      </div>

      {/* Get Started Button with glow */}
      <AnimatePresence>
        {showButton && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="w-full max-w-xs"
          >
            <Button
              onClick={onGetStarted}
              className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 text-white text-base font-semibold rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {t.onboarding.getStarted || 'Get Started'}
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip for existing users */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        onClick={onSkip}
        className="mt-6 text-gray-500 hover:text-gray-400 text-sm transition-colors"
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
  const { t } = useI18n()
  const { user } = useAuthStore()
  const { setCurrentFamily, setFamilyMembers, setFamilies, setFamilyAvatar, setFamilyColor } = useAppStore()
  const [action, setAction] = useState<FamilyAction>('choose')
  const [familyName, setFamilyName] = useState('')
  const [familyDescription, setFamilyDescription] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [createdCode, setCreatedCode] = useState('')

  const supabase = createClient()

  const handleCreateFamily = useCallback(async () => {
    if (!familyName.trim()) {
      toast.error(t.common.error)
      return
    }
    setIsLoading(true)
    try {
      const { data: family, error } = await supabase
        .from('families')
        .insert({
          name: familyName.trim(),
          description: familyDescription.trim() || null,
          created_by: user?.id,
        })
        .select()
        .single()

      if (error) throw error

      const { error: memberError } = await supabase.from('family_members').insert({
        family_id: family.id,
        user_id: user?.id,
        role: 'owner',
      })

      if (memberError) throw memberError

      setCurrentFamily(family)
      setCreatedCode(family.invite_code)

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
  }, [familyName, familyDescription, user, supabase, setCurrentFamily, setFamilies, setFamilyMembers, setFamilyAvatar, setFamilyColor, t, onAdvance])

  const handleJoinFamily = useCallback(async () => {
    if (!inviteCode.trim()) {
      toast.error(t.common.error)
      return
    }
    setIsLoading(true)
    try {
      const { data: family, error: findError } = await supabase
        .from('families')
        .select('*')
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .single()

      if (findError || !family) {
        toast.error('Invalid invite code')
        setIsLoading(false)
        return
      }

      const { error: joinError } = await supabase.from('family_members').insert({
        family_id: family.id,
        user_id: user?.id,
        role: 'member',
      })

      if (joinError) throw joinError

      setCurrentFamily(family)

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
    navigator.clipboard.writeText(createdCode)
    setCopiedCode(true)
    toast.success(t.common.copied)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <AnimatePresence mode="wait">
        {action === 'choose' && (
          <motion.div
            key="choose"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="space-y-4"
          >
            {createdCode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#111117] border border-green-500/30 rounded-xl p-4 mb-2"
              >
                <p className="text-green-400 text-sm font-medium mb-2">Family created! Share this invite code:</p>
                <div className="flex items-center gap-2">
                  <code className="bg-black/40 px-3 py-1.5 rounded-lg text-white font-mono text-lg tracking-wider">
                    {createdCode}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyCode} className="border-white/10">
                    {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Two cards side by side on desktop, stacked on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Create a Family Card */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setAction('create')}
                className="group relative rounded-xl p-5 bg-[#111117] border border-white/[0.08] hover:border-indigo-500/50 transition-all duration-300 text-left overflow-hidden"
              >
                {/* Gradient border glow on hover */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-1">{t.onboarding.createFamily}</h3>
                  <p className="text-gray-500 text-sm">Start a new family space</p>
                </div>
              </motion.button>

              {/* Join a Family Card */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setAction('join')}
                className="group relative rounded-xl p-5 bg-[#111117] border border-white/[0.08] hover:border-violet-500/50 transition-all duration-300 text-left overflow-hidden"
              >
                {/* Gradient border glow on hover */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center mb-4">
                    <UserPlus className="w-6 h-6 text-violet-400" />
                  </div>
                  <h3 className="text-white font-semibold mb-1">{t.onboarding.joinFamily}</h3>
                  <p className="text-gray-500 text-sm">Enter an invite code</p>
                </div>
              </motion.button>
            </div>

            {/* Skip for now */}
            <p className="text-center text-gray-500 text-sm pt-2">
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
            <div className="bg-[#111117] border border-white/[0.08] rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">{t.onboarding.createFamily}</h2>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">{t.onboarding.familyName}</Label>
                <Input
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="The Smith Family"
                  className="bg-[#0B0B0F] border-white/[0.08] text-white placeholder:text-gray-600"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">{t.onboarding.familyDescription}</Label>
                <Textarea
                  value={familyDescription}
                  onChange={(e) => setFamilyDescription(e.target.value)}
                  placeholder="A loving family..."
                  className="bg-[#0B0B0F] border-white/[0.08] text-white placeholder:text-gray-600 resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setAction('choose')}
                  className="flex-1 border-white/[0.08] text-gray-300 hover:bg-white/[0.05]"
                >
                  {t.common.cancel}
                </Button>
                <Button
                  onClick={handleCreateFamily}
                  disabled={isLoading || !familyName.trim()}
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white"
                >
                  {isLoading ? t.common.loading : t.onboarding.create}
                </Button>
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
            <div className="bg-[#111117] border border-white/[0.08] rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-violet-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">{t.onboarding.joinFamily}</h2>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">{t.onboarding.enterCode}</Label>
                <Input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="ABCD1234"
                  className="bg-[#0B0B0F] border-white/[0.08] text-white font-mono text-lg tracking-widest text-center placeholder:text-gray-600"
                  maxLength={8}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setAction('choose')}
                  className="flex-1 border-white/[0.08] text-gray-300 hover:bg-white/[0.05]"
                >
                  {t.common.cancel}
                </Button>
                <Button
                  onClick={handleJoinFamily}
                  disabled={isLoading || !inviteCode.trim()}
                  className="flex-1 bg-violet-500 hover:bg-violet-600 text-white"
                >
                  {isLoading ? t.common.loading : t.onboarding.join}
                </Button>
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
  const { t } = useI18n()
  const { familyAvatar, familyColor, setFamilyAvatar, setFamilyColor } = useAppStore()
  const selectedColorOption = COLOR_OPTIONS.find(c => c.name === familyColor) || COLOR_OPTIONS[0]

  return (
    <div className="w-full max-w-lg mx-auto space-y-8">
      {/* Family Avatar Preview */}
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className={`w-28 h-28 rounded-full ${selectedColorOption.light} flex items-center justify-center mb-3 transition-colors duration-300`}
          style={{ boxShadow: `0 0 30px ${selectedColorOption.hex}33` }}
        >
          <span className="text-5xl">{familyAvatar}</span>
        </motion.div>
        <p className="text-gray-500 text-sm">{t.onboarding.familyAvatar || 'Choose your family avatar'}</p>
      </div>

      {/* Avatar Grid */}
      <div>
        <h3 className="text-gray-300 text-sm font-medium mb-3">{t.onboarding.pickAvatar || 'Pick an avatar'}</h3>
        <div className="grid grid-cols-4 gap-3">
          {AVATAR_OPTIONS.map((emoji) => (
            <motion.button
              key={emoji}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFamilyAvatar(emoji)}
              className={`w-full aspect-square rounded-xl flex items-center justify-center text-2xl transition-all duration-200 ${
                familyAvatar === emoji
                  ? `${selectedColorOption.light} ${selectedColorOption.border} border-2 shadow-lg`
                  : 'bg-[#111117] border border-white/[0.08] hover:border-white/[0.15]'
              }`}
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Color Theme Picker */}
      <div>
        <h3 className="text-gray-300 text-sm font-medium mb-3">{t.onboarding.pickColor || 'Pick a color theme'}</h3>
        <div className="grid grid-cols-6 gap-3">
          {COLOR_OPTIONS.map((color) => (
            <motion.button
              key={color.name}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setFamilyColor(color.name)}
              className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-200 ${
                familyColor === color.name
                  ? `ring-2 ring-offset-2 ring-offset-[#0B0B0F] ${color.bg} ring-white/30`
                  : `${color.bg}/30 hover:${color.bg}/50`
              }`}
              style={familyColor === color.name ? { boxShadow: `0 0 16px ${color.hex}66` } : undefined}
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
      </div>

      {/* Complete Button */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          onClick={onComplete}
          className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {t.onboarding.looksGreat || 'Looks Great!'}
        </Button>
      </motion.div>
    </div>
  )
}

// ─── Main Onboarding Flow ───────────────────────────────────────
export function OnboardingFlow() {
  const { t } = useI18n()
  const { setShowOnboarding } = useAppStore()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1)
  const [direction, setDirection] = useState(1)

  const goToStep = (step: OnboardingStep) => {
    setDirection(step > currentStep ? 1 : -1)
    setCurrentStep(step)
  }

  const handleComplete = () => {
    setShowOnboarding(false)
    toast.success(t.common.success)
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] auth-bg flex items-center justify-center p-4">
      {/* Animated gradient blobs */}
      <div className="auth-blob-1" />
      <div className="auth-blob-2" />
      <div className="auth-blob-3" />

      <div className="w-full max-w-lg relative z-10">
        {/* Step Progress Indicator - hidden on step 1 for cleaner welcome */}
        <AnimatePresence>
          {currentStep > 1 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <StepProgress currentStep={currentStep} />
            </motion.div>
          )}
        </AnimatePresence>

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
              transition={{ duration: 0.3, ease: 'easeOut' }}
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
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {/* Step 2 Header */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-white mb-1">{t.onboarding.setupFamily || 'Set Up Your Family'}</h2>
                <p className="text-gray-500 text-sm">{t.onboarding.setupFamilyDesc || 'Create a new family or join an existing one'}</p>
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
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {/* Step 3 Header */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-white mb-1">{t.onboarding.personalize || 'Personalize'}</h2>
                <p className="text-gray-500 text-sm">{t.onboarding.personalizeDesc || 'Make it yours'}</p>
              </div>
              <PersonalizeStep onComplete={handleComplete} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
