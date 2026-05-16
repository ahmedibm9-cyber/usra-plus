'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createClient, isDemoMode } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useAppStore } from '@/stores/app-store'
import { useI18n } from '@/i18n/use-translation'
import { safeJsonResponse } from '@/lib/safe-fetch'
import {
  Container,
  Stack,
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  TextField,
  LinearProgress,
  Grid,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  People,
  PersonAdd,
  Home,
  ContentCopy,
  Check,
  ChevronRight,
  AutoAwesome,
  AutoFixHigh,
  WifiOff,
  CalendarMonth,
  Checklist,
  ShoppingCart,
  Chat,
  Shield,
  Bolt,
  Star,
} from '@mui/icons-material'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { AvatarGenerator } from '@/components/shared/avatar-generator'

const AVATAR_OPTIONS = ['🏠', '👨‍👩‍👧‍👦', '🕌', '🌙', '🏡', '💼', '❤️', '🌟']

const COLOR_OPTIONS = [
  { name: 'teal', muiColor: 'primary' as const },
  { name: 'emerald', muiColor: 'secondary' as const },
  { name: 'green', muiColor: 'success' as const },
  { name: 'jade', muiColor: 'primary' as const },
  { name: 'mint', muiColor: 'secondary' as const },
  { name: 'cyan', muiColor: 'info' as const },
]

type OnboardingStep = 1 | 2 | 3
type FamilyAction = 'choose' | 'create' | 'join'

const FEATURE_CARDS = [
  { icon: CalendarMonth, title: 'Shared Calendar', description: 'Sync family schedules', color: 'primary' as const },
  { icon: Checklist, title: 'Task Management', description: 'Assign & track chores', color: 'secondary' as const },
  { icon: ShoppingCart, title: 'Smart Grocery', description: 'Shared shopping lists', color: 'primary' as const },
  { icon: Chat, title: 'Family Chat', description: 'Stay connected always', color: 'secondary' as const },
]

const FAMILY_BENEFITS = [
  { icon: Shield, text: 'Private & secure space', color: 'primary' as const },
  { icon: People, text: 'Up to 20 family members', color: 'secondary' as const },
  { icon: Bolt, text: 'Real-time sync & updates', color: 'primary' as const },
]

function FloatingParticles() {
  const theme = useTheme()
  const particles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 2 + 1, duration: Math.random() * 20 + 15,
      delay: Math.random() * 10, opacity: Math.random() * 0.3 + 0.05,
    })), []
  )

  return (
    <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size, borderRadius: '50%',
            backgroundColor: p.id % 3 === 0 ? theme.palette.primary.main : theme.palette.secondary.main,
          }}
          animate={{ y: [0, -30, 0], opacity: [p.opacity, p.opacity * 2, p.opacity] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </Box>
  )
}

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 200 : -200, opacity: 0, scale: 0.98 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -200 : 200, opacity: 0, scale: 0.98 }),
}

function StepProgressBar({ currentStep }: { currentStep: OnboardingStep }) {
  const theme = useTheme()
  const steps = [{ num: 1, label: 'Welcome' }, { num: 2, label: 'Family' }, { num: 3, label: 'Personalize' }]
  const percentage = Math.round((currentStep / 3) * 100)

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
        {steps.map((step) => (
          <Stack key={step.num} direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="caption" sx={{
              fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase',
              color: step.num === currentStep ? 'primary.main' : step.num < currentStep ? 'secondary.main' : 'text.disabled',
            }}>
              {step.num}/3
            </Typography>
            <Typography variant="caption" sx={{
              fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
              display: { xs: 'none', sm: 'inline' },
              color: step.num === currentStep ? 'text.primary' : step.num < currentStep ? 'text.secondary' : 'text.disabled',
            }}>
              {step.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
      <Box sx={{ position: 'relative', height: 4, bgcolor: 'action.hover', borderRadius: 5, overflow: 'hidden' }}>
        <motion.div
          style={{
            position: 'absolute', inset: 0, left: 0, borderRadius: 5,
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          }}
          initial={{ width: '0%' }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </Box>
      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 0.5 }}>
        <Typography variant="caption" color="secondary.main" sx={{ fontSize: 10, letterSpacing: '0.1em' }}>
          {percentage}%
        </Typography>
      </Stack>
    </Box>
  )
}

function WelcomeStep({ onGetStarted, onSkip }: { onGetStarted: () => void; onSkip: () => void }) {
  const theme = useTheme()
  const { t } = useI18n()
  const tagline = t.app.tagline
  const [displayedText, setDisplayedText] = useState('')
  const [showButton, setShowButton] = useState(false)
  const [showFeatures, setShowFeatures] = useState(false)

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i <= tagline.length) { setDisplayedText(tagline.slice(0, i)); i++ }
      else { clearInterval(interval); setTimeout(() => setShowFeatures(true), 200); setTimeout(() => setShowButton(true), 600) }
    }, 45)
    return () => clearInterval(interval)
  }, [tagline])

  return (
    <Stack alignItems="center" justifyContent="center" sx={{ textAlign: 'center' }}>
      <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 150, damping: 12, delay: 0.2 }} style={{ position: 'relative', marginBottom: 24 }}>
        <Box sx={{
          width: 112, height: 112, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark}, ${theme.palette.secondary.main})`,
        }}>
          <Home sx={{ fontSize: 56, color: 'white' }} />
        </Box>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }}>
        <Typography variant="h3" fontWeight={700} sx={{ letterSpacing: '0.1em', mb: 1 }}>
          USRA PLUS
        </Typography>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.7, duration: 0.5 }}>
        <Typography variant="caption" sx={{ letterSpacing: '0.25em', textTransform: 'uppercase', color: 'text.disabled', mb: 3 }}>
          Family Operating System
        </Typography>
      </motion.div>

      <Box sx={{ height: 32, mb: 4 }}>
        <Typography variant="h6" color="text.secondary" fontWeight={500}>
          {displayedText}
          <Box component="span" sx={{ display: 'inline-block', width: 2, height: 20, bgcolor: 'primary.main', ml: 0.5, verticalAlign: 'middle', animation: 'blink 0.5s infinite alternate' }} />
        </Typography>
      </Box>

      <AnimatePresence>
        {showFeatures && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <Grid container spacing={1.5} sx={{ maxWidth: 400, mb: 4 }}>
              {FEATURE_CARDS.map((feature, i) => {
                const Icon = feature.icon
                return (
                  <Grid key={feature.title} size={6}>
                    <motion.div initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.1, duration: 0.4 }}>
                      <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'left', '&:hover': { borderColor: 'primary.main' }, transition: 'border-color 0.3s' }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1, bgcolor: `${theme.palette[feature.color].main}15` }}>
                          <Icon sx={{ fontSize: 16, color: `${feature.color}.main` }} />
                        </Box>
                        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.25 }}>{feature.title}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11, lineHeight: 1.3 }}>{feature.description}</Typography>
                      </Paper>
                    </motion.div>
                  </Grid>
                )
              })}
            </Grid>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showButton && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Button variant="contained" size="large" fullWidth onClick={onGetStarted} endIcon={<ChevronRight />} sx={{ maxWidth: 320, height: 52, borderRadius: 3, fontSize: 16, fontWeight: 600 }}>
              {t.onboarding.getStarted || 'Get Started'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}>
        <Button variant="text" onClick={onSkip} sx={{ mt: 3, color: 'text.disabled' }}>
          {t.onboarding.skip}
        </Button>
      </motion.div>

      <style>{`@keyframes blink { from { opacity: 1; } to { opacity: 0; } }`}</style>
    </Stack>
  )
}

function FamilyStep({ onAdvance }: { onAdvance: () => void }) {
  const theme = useTheme()
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
    if (!familyName.trim()) { toast.error(t.common.error); return }
    if (!user?.id) { toast.error('Not authenticated'); return }
    if (isDemoMode()) {
      const familyId = crypto.randomUUID()
      const family = { id: familyId, name: familyName.trim(), description: familyDescription.trim() || null, invite_code: Math.random().toString(36).substring(2, 10).toUpperCase(), avatar_url: null, created_by: user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      setCurrentFamily(family); setCreatedCode(family.invite_code); setFamilies([family])
      setFamilyMembers([{ id: crypto.randomUUID(), family_id: familyId, user_id: user.id, role: 'owner', nickname: null, joined_at: new Date().toISOString(), profiles: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, phone: null, country_code: null, avatar_url: null, language: 'en' as const, theme: 'dark' as const, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } }])
      toast.success(t.common.success); onAdvance(); return
    }
    setIsLoading(true)
    try {
      const res = await fetch('/api/families', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: familyName.trim(), description: familyDescription.trim() || null, userId: user.id }) })
      const data = await safeJsonResponse<{ family?: Record<string, unknown>; error?: string }>(res)
      if (!res.ok || !data) throw new Error(data?.error || t.common.error)
      const family = data.family
      if (!family) { toast.error(t.common.error); setIsLoading(false); return }
      setCurrentFamily(family); setCreatedCode(family.invite_code); setFamilies([family])
      setFamilyMembers([{ id: crypto.randomUUID(), family_id: family.id, user_id: user.id, role: 'owner', nickname: null, joined_at: new Date().toISOString(), profiles: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, phone: null, country_code: null, avatar_url: user.avatar_url, language: 'en' as const, theme: 'dark' as const, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } }])
      try {
        const { data: allFamilies } = await supabase
          .from('family_members')
          .select('family_id, families(*)')
          .eq('user_id', user?.id)
        if (allFamilies && allFamilies.length > 0) {
          const families = allFamilies.map((f: Record<string, unknown>) => f.families).filter(Boolean)
          if (families.length > 0) setFamilies(families)
        }
      } catch (fetchErr) {
        console.warn('[Onboarding] Could not fetch all families:', fetchErr)
      }
      toast.success(t.common.success); onAdvance()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : t.common.error) } finally { setIsLoading(false) }
  }, [familyName, familyDescription, user, supabase, setCurrentFamily, setFamilies, setFamilyMembers, setFamilyAvatar, setFamilyColor, t, onAdvance])

  const handleJoinFamily = useCallback(async () => {
    if (!inviteCode.trim()) { toast.error(t.common.error); return }
    if (isDemoMode()) { toast.error(isRTL ? 'الانضمام لعائلة يتطلب اتصال بالإنترنت' : 'Joining a family requires an internet connection.'); return }
    setIsLoading(true)
    try {
      const res = await fetch('/api/families', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase(), userId: user?.id }) })
      const data = await safeJsonResponse<{ family?: Record<string, unknown>; error?: string }>(res)
      if (!res.ok || !data) { toast.error(data?.error || 'Invalid invite code'); setIsLoading(false); return }
      const family = data.family; setCurrentFamily(family)
      const { data: members } = await supabase.from('family_members').select('*, profiles(*)').eq('family_id', family.id); if (members) setFamilyMembers(members)
      const { data: allFamilies } = await supabase.from('family_members').select('family_id, families(*)').eq('user_id', user?.id); if (allFamilies) setFamilies(allFamilies.map(f => f.families).filter(Boolean))
      toast.success(t.common.success); onAdvance()
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : t.common.error) } finally { setIsLoading(false) }
  }, [inviteCode, user, supabase, setCurrentFamily, setFamilies, setFamilyMembers, t, onAdvance])

  const copyCode = () => { try { navigator.clipboard.writeText(createdCode); setCopiedCode(true); toast.success(t.common.copied); setTimeout(() => setCopiedCode(false), 2000) } catch { toast.error(t.common.error) } }

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', width: '100%' }}>
      {isDemoMode() && (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1.5, borderRadius: 3, bgcolor: 'success.main', opacity: 0.1, mb: 2, border: 1, borderColor: 'success.main' }}>
          <WifiOff sx={{ fontSize: 16, color: 'success.main', flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: 'success.light' }}>{isRTL ? 'الوضع بدون إنترنت' : 'Offline mode — family will be stored locally'}</Typography>
        </Stack>
      )}

      <AnimatePresence mode="wait">
        {action === 'choose' && (
          <motion.div key="choose" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            <Stack spacing={2.5}>
              {createdCode && (
                <Paper sx={{ p: 2, border: 1, borderColor: 'success.main', bgcolor: 'success.main' + '10' }}>
                  <Typography variant="body2" color="success.main" fontWeight={500} sx={{ mb: 1 }}>Family created! Share this invite code:</Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ bgcolor: 'action.hover', px: 2, py: 0.75, borderRadius: 2 }}>
                      <Typography variant="h6" fontWeight={700} sx={{ letterSpacing: '0.2em', fontFamily: 'monospace' }}>{createdCode}</Typography>
                    </Box>
                    <IconButton size="small" onClick={copyCode}>{copiedCode ? <Check sx={{ fontSize: 16 }} /> : <ContentCopy sx={{ fontSize: 16 }} />}</IconButton>
                  </Stack>
                </Paper>
              )}

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper
                    variant="outlined"
                    onClick={() => setAction('create')}
                    sx={{ p: 3, cursor: 'pointer', borderRadius: 4, textAlign: 'left', transition: 'all 0.3s', '&:hover': { borderColor: 'primary.main', boxShadow: `0 8px 30px ${theme.palette.primary.main}15` } }}
                  >
                    <Box sx={{ width: 56, height: 56, borderRadius: 3, bgcolor: 'primary.main', opacity: 0.15, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                      <People sx={{ fontSize: 28, color: 'primary.main' }} />
                    </Box>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>{t.onboarding.createFamily}</Typography>
                    <Typography variant="body2" color="text.secondary">Start a new family space</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper
                    variant="outlined"
                    onClick={() => setAction('join')}
                    sx={{ p: 3, cursor: 'pointer', borderRadius: 4, textAlign: 'left', transition: 'all 0.3s', '&:hover': { borderColor: 'secondary.main', boxShadow: `0 8px 30px ${theme.palette.secondary.main}15` } }}
                  >
                    <Box sx={{ width: 56, height: 56, borderRadius: 3, bgcolor: 'secondary.main', opacity: 0.15, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                      <PersonAdd sx={{ fontSize: 28, color: 'secondary.main' }} />
                    </Box>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>{t.onboarding.joinFamily}</Typography>
                    <Typography variant="body2" color="text.secondary">Enter an invite code</Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="caption" color="text.disabled" sx={{ letterSpacing: '0.2em', textTransform: 'uppercase', mb: 1.5, display: 'block' }}>What you get</Typography>
                <Stack spacing={1.5}>
                  {FAMILY_BENEFITS.map((benefit, i) => {
                    const Icon = benefit.icon
                    return (
                      <Stack key={benefit.text} direction="row" alignItems="center" spacing={1.5}>
                        <Box sx={{ width: 24, height: 24, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${theme.palette[benefit.color].main}15`, flexShrink: 0 }}>
                          <Icon sx={{ fontSize: 14, color: `${benefit.color}.main` }} />
                        </Box>
                        <Typography variant="body2" color="text.secondary">{benefit.text}</Typography>
                      </Stack>
                    )
                  })}
                </Stack>
              </Paper>
              <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', pt: 0.5 }}>{t.onboarding.chooseOrCreate || 'Choose an option to continue'}</Typography>
            </Stack>
          </motion.div>
        )}

        {action === 'create' && (
          <motion.div key="create" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden' }}>
              <Box sx={{ height: 2, background: `linear-gradient(90deg, transparent, ${theme.palette.primary.main}, transparent)` }} />
              <Stack spacing={2.5} sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.main', opacity: 0.15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <People sx={{ color: 'primary.main' }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>{t.onboarding.createFamily}</Typography>
                    <Typography variant="caption" color="text.secondary">Set up your family space</Typography>
                  </Box>
                </Stack>
                <TextField label={t.onboarding.familyName} value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="The Smith Family" size="small" fullWidth />
                <TextField label={t.onboarding.familyDescription} value={familyDescription} onChange={(e) => setFamilyDescription(e.target.value)} placeholder="A loving family..." multiline rows={3} size="small" fullWidth />
                <Stack direction="row" spacing={1.5} sx={{ pt: 0.5 }}>
                  <Button variant="outlined" onClick={() => setAction('choose')} fullWidth sx={{ height: 44 }}>{t.common.cancel}</Button>
                  <Button variant="contained" onClick={handleCreateFamily} disabled={isLoading || !familyName.trim()} fullWidth sx={{ height: 44 }}>{isLoading ? t.common.loading : t.onboarding.create}</Button>
                </Stack>
              </Stack>
            </Paper>
          </motion.div>
        )}

        {action === 'join' && (
          <motion.div key="join" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
            <Paper variant="outlined" sx={{ borderRadius: 4, overflow: 'hidden' }}>
              <Box sx={{ height: 2, background: `linear-gradient(90deg, transparent, ${theme.palette.secondary.main}, transparent)` }} />
              <Stack spacing={2.5} sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'secondary.main', opacity: 0.15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PersonAdd sx={{ color: 'secondary.main' }} />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>{t.onboarding.joinFamily}</Typography>
                    <Typography variant="caption" color="text.secondary">Enter an invite code from your family</Typography>
                  </Box>
                </Stack>
                <TextField label={t.onboarding.enterCode} value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="ABCD1234" inputProps={{ maxLength: 8, style: { textAlign: 'center', letterSpacing: '0.3em', fontFamily: 'monospace', fontSize: 18 } }} size="small" fullWidth />
                <Stack direction="row" spacing={1.5} sx={{ pt: 0.5 }}>
                  <Button variant="outlined" onClick={() => setAction('choose')} fullWidth sx={{ height: 44 }}>{t.common.cancel}</Button>
                  <Button variant="contained" color="secondary" onClick={handleJoinFamily} disabled={isLoading || !inviteCode.trim()} fullWidth sx={{ height: 44 }}>{isLoading ? t.common.loading : t.onboarding.join}</Button>
                </Stack>
              </Stack>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  )
}

function PersonalizeStep({ onComplete }: { onComplete: () => void }) {
  const theme = useTheme()
  const { t, isRTL } = useI18n()
  const { user, setUser } = useAuthStore()
  const { familyAvatar, familyColor, setFamilyAvatar, setFamilyColor, setCurrentFamily, currentFamily } = useAppStore()
  const [avatarGenOpen, setAvatarGenOpen] = useState(false)
  const [aiAvatarUrl, setAiAvatarUrl] = useState<string | null>(null)
  const selectedColorOption = COLOR_OPTIONS.find(c => c.name === familyColor) || COLOR_OPTIONS[0]

  const handleAvatarApply = useCallback((imageUrl: string) => {
    setAiAvatarUrl(imageUrl)
    if (currentFamily) setCurrentFamily({ ...currentFamily, avatar_url: imageUrl })
    if (user) setUser({ ...user, avatar_url: imageUrl })
  }, [currentFamily, user, setCurrentFamily, setUser])

  return (
    <Stack spacing={3.5} sx={{ maxWidth: 500, mx: 'auto', width: '100%' }}>
      {currentFamily?.name && (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="caption" color="text.disabled" sx={{ letterSpacing: '0.25em', textTransform: 'uppercase', mb: 0.5, display: 'block' }}>Your Family</Typography>
          <Typography variant="subtitle1" fontWeight={600}>{currentFamily.name}</Typography>
        </Box>
      )}

      <Stack alignItems="center">
        <Box sx={{
          width: 112, height: 112, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5,
          bgcolor: `${theme.palette[selectedColorOption.muiColor].main}20`,
          boxShadow: `0 0 40px ${theme.palette[selectedColorOption.muiColor].main}25`,
        }}>
          {aiAvatarUrl ? (
            <Box component="img" src={aiAvatarUrl} alt="AI Generated Avatar" sx={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <Typography sx={{ fontSize: 48 }}>{familyAvatar}</Typography>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary">{t.onboarding.familyAvatar || 'Choose your family avatar'}</Typography>
      </Stack>

      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>{t.onboarding.pickAvatar || 'Pick an avatar'}</Typography>
          <Button variant="outlined" size="small" onClick={() => setAvatarGenOpen(true)} startIcon={<AutoFixHigh sx={{ fontSize: 12 }} />}>
            {t.avatarGen.generateWithAI}
          </Button>
        </Stack>
        <Grid container spacing={1.5}>
          {AVATAR_OPTIONS.map((emoji, i) => (
            <Grid size={3} key={emoji}>
              <IconButton
                onClick={() => { setFamilyAvatar(emoji); setAiAvatarUrl(null) }}
                sx={{
                  width: '100%', aspectRatio: '1', borderRadius: 3, fontSize: 24,
                  border: familyAvatar === emoji && !aiAvatarUrl ? 2 : 1,
                  borderColor: familyAvatar === emoji && !aiAvatarUrl ? 'primary.main' : 'divider',
                  bgcolor: familyAvatar === emoji && !aiAvatarUrl ? 'primary.main' + '15' : 'transparent',
                  boxShadow: familyAvatar === emoji && !aiAvatarUrl ? 3 : 0,
                  '&:hover': { borderColor: 'primary.main' },
                }}
              >
                {emoji}
              </IconButton>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Box>
        <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ mb: 1.5 }}>{t.onboarding.pickColor || 'Pick a color theme'}</Typography>
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {COLOR_OPTIONS.map((color, i) => (
            <Grid size={2} key={color.name}>
              <IconButton
                onClick={() => setFamilyColor(color.name)}
                sx={{
                  width: '100%', aspectRatio: '1', borderRadius: 3,
                  bgcolor: `${color.muiColor}.main`,
                  opacity: familyColor === color.name ? 1 : 0.3,
                  boxShadow: familyColor === color.name ? 4 : 0,
                  '&:hover': { opacity: 0.5 },
                  ring: familyColor === color.name ? 2 : 0,
                }}
              >
                {familyColor === color.name && <Check sx={{ color: 'white' }} />}
              </IconButton>
            </Grid>
          ))}
        </Grid>
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="caption" color="text.disabled" sx={{ letterSpacing: '0.2em', textTransform: 'uppercase', mb: 1.5, display: 'block' }}>Preview</Typography>
          <Stack spacing={1.5}>
            <Box sx={{ height: 32, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${selectedColorOption.muiColor}.main`, color: 'white', fontSize: 12, fontWeight: 600, boxShadow: `0 0 12px ${theme.palette[selectedColorOption.muiColor].main}30` }}>
              Sample Action Button
            </Box>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Chip label="Family Badge" size="small" sx={{ bgcolor: `${theme.palette[selectedColorOption.muiColor].main}20`, color: `${selectedColorOption.muiColor}.main`, fontWeight: 600, fontSize: 10 }} />
              <Box sx={{ width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${theme.palette[selectedColorOption.muiColor].main}20`, color: `${selectedColorOption.muiColor}.main`, fontSize: 10, fontWeight: 700 }}>U</Box>
              <Box sx={{ height: 6, flex: 1, borderRadius: 5, bgcolor: 'action.hover', overflow: 'hidden' }}>
                <Box sx={{ height: '100%', borderRadius: 5, bgcolor: `${selectedColorOption.muiColor}.main`, width: '65%' }} />
              </Box>
            </Stack>
          </Stack>
        </Paper>
      </Box>

      <Paper variant="outlined" sx={{ p: 2, borderStyle: 'dashed' }}>
        <Stack direction="row" spacing={1.5}>
          <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 3 }}>
            <Star sx={{ color: 'secondary.main' }} />
          </motion.div>
          <Box>
            <Typography variant="body2" fontWeight={600}>Ready to go!</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
              {currentFamily?.name ? `${currentFamily.name} is set up and waiting for you.` : 'Your family space is ready.'}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Button variant="contained" size="large" fullWidth onClick={onComplete} startIcon={<AutoAwesome />} sx={{ height: 52, borderRadius: 3, fontWeight: 600 }}>
          {t.onboarding.looksGreat || 'Looks Great!'}
        </Button>
      </motion.div>

      <AvatarGenerator open={avatarGenOpen} onOpenChange={setAvatarGenOpen} onApply={handleAvatarApply} mode="simple" context="family" />
    </Stack>
  )
}

export function OnboardingFlow() {
  const theme = useTheme()
  const { t } = useI18n()
  const { setShowOnboarding } = useAppStore()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1)
  const [direction, setDirection] = useState(1)

  const goToStep = (step: OnboardingStep) => { setDirection(step > currentStep ? 1 : -1); setCurrentStep(step) }
  const handleComplete = () => { setShowOnboarding(false); toast.success(t.common.success) }

  const stepTitles: Record<OnboardingStep, string> = { 1: 'Welcome', 2: 'Family', 3: 'Personalize' }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, position: 'relative', overflow: 'hidden' }}>
      <FloatingParticles />
      <Box sx={{ width: '100%', maxWidth: 500, position: 'relative', zIndex: 10 }}>
        <StepProgressBar currentStep={currentStep} />

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main', boxShadow: `0 0 6px ${theme.palette.primary.main}80` }} />
            <Typography variant="caption" sx={{ letterSpacing: '0.3em', textTransform: 'uppercase', color: 'primary.main', fontSize: 10 }}>
              {currentStep}/3
            </Typography>
          </Stack>
          <Typography variant="h6" fontWeight={600}>{stepTitles[currentStep]}</Typography>
          <Box sx={{ width: 48 }} />
        </Stack>

        <AnimatePresence mode="wait" custom={direction}>
          {currentStep === 1 && (
            <motion.div key="step-1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}>
              <WelcomeStep onGetStarted={() => goToStep(2)} onSkip={() => setShowOnboarding(false)} />
            </motion.div>
          )}
          {currentStep === 2 && (
            <motion.div key="step-2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>{t.onboarding.setupFamily || 'Set Up Your Family'}</Typography>
                <Typography variant="body2" color="text.secondary">{t.onboarding.setupFamilyDesc || 'Create a new family or join an existing one'}</Typography>
              </Box>
              <FamilyStep onAdvance={() => goToStep(3)} />
            </motion.div>
          )}
          {currentStep === 3 && (
            <motion.div key="step-3" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>{t.onboarding.personalize || 'Personalize'}</Typography>
                <Typography variant="body2" color="text.secondary">{t.onboarding.personalizeDesc || 'Make it yours'}</Typography>
              </Box>
              <PersonalizeStep onComplete={handleComplete} />
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </Box>
  )
}
