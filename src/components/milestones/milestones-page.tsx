'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Add,
  Cake as CakeIcon,
  CardGiftcard,
  School,
  EmojiEvents,
  Star,
  Search,
  CalendarMonth,
  Schedule,
  Groups,
  TrendingUp,
  Celebration,
  Favorite,
  ExpandMore,
  Edit,
  Delete,
  Close,
} from '@mui/icons-material'
import {
  Container,
  Stack,
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Switch,
  FormControlLabel,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Avatar,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import { useMilestoneStore, type Milestone, type MilestoneType } from '@/stores/milestone-store'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n/use-translation'
import { toast } from 'sonner'

const typeConfig: Record<MilestoneType, { emoji: string; color: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'default' }> = {
  birthday: { emoji: '🎂', color: 'error' },
  anniversary: { emoji: '💍', color: 'primary' },
  graduation: { emoji: '🎓', color: 'primary' },
  achievement: { emoji: '🏆', color: 'success' },
  custom: { emoji: '⭐', color: 'primary' },
}

const typeIconMap: Record<MilestoneType, React.ElementType> = {
  birthday: CakeIcon,
  anniversary: Favorite,
  graduation: School,
  achievement: EmojiEvents,
  custom: Star,
}

function getDaysUntilDate(dateStr: string): number {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const milestoneDate = new Date(dateStr)
  const thisYearDate = new Date(today.getFullYear(), milestoneDate.getMonth(), milestoneDate.getDate())
  if (thisYearDate < today) thisYearDate.setFullYear(today.getFullYear() + 1)
  return Math.ceil((thisYearDate.getTime() - today.getTime()) / 86400000)
}

function getCountdownChip(days: number, t: typeof import('@/i18n/en').en.milestones): { label: string; color: 'success' | 'warning' | 'primary' | 'default' } {
  if (days === 0) return { label: t.today, color: 'success' }
  if (days === 1) return { label: t.tomorrow, color: 'success' }
  if (days <= 7) return { label: t.inDays.replace('{n}', String(days)), color: 'warning' }
  if (days <= 30) return { label: t.inDays.replace('{n}', String(days)), color: 'primary' }
  return { label: t.inDays.replace('{n}', String(days)), color: 'default' }
}

function calculateAge(birthDateStr: string): number {
  const birth = new Date(birthDateStr); const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age--
  return age + 1
}

function calculateAnniversaryYears(dateStr: string): number {
  return new Date().getFullYear() - new Date(dateStr).getFullYear()
}

function formatDate(dateStr: string, isRTL: boolean): string {
  return new Date(dateStr).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'long', day: 'numeric' })
}

const filterTypes: { key: MilestoneType | 'all'; labelKey: keyof import('@/i18n/en').TranslationKeys['milestones'] }[] = [
  { key: 'all', labelKey: 'all' }, { key: 'birthday', labelKey: 'birthday' }, { key: 'anniversary', labelKey: 'anniversary' },
  { key: 'graduation', labelKey: 'graduation' }, { key: 'achievement', labelKey: 'achievement' }, { key: 'custom', labelKey: 'custom' },
]

function StatCard({ icon: Icon, label, value, color, smallValue }: { icon: React.ElementType; label: string; value: string | number; color: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info'; smallValue?: boolean }) {
  const theme = useTheme()
  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, borderRadius: 4 }}>
      <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, bgcolor: `${theme.palette[color].main}15` }}>
        <Icon sx={{ fontSize: 20, color: `${color}.main` }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant={smallValue ? 'body2' : 'h5'} fontWeight={700} noWrap>{value}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 10 }} noWrap>{label}</Typography>
      </Box>
    </Paper>
  )
}

export default function MilestonesPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const milestones = useMilestoneStore((s) => s.milestones)
  const addMilestoneToSupabase = useMilestoneStore((s) => s.addMilestoneToSupabase)
  const updateMilestoneInSupabase = useMilestoneStore((s) => s.updateMilestoneInSupabase)
  const removeMilestoneFromSupabase = useMilestoneStore((s) => s.removeMilestoneFromSupabase)
  const fetchFromSupabase = useMilestoneStore((s) => s.fetchFromSupabase)
  const familyMembers = useAppStore((s) => s.familyMembers)
  const currentFamily = useAppStore((s) => s.currentFamily)
  const user = useAuthStore((s) => s.user)
  const { t, isRTL } = useI18n()
  const mt = t.milestones

  const hasFetchedRef = useRef(false)
  useEffect(() => {
    if (!currentFamily?.id || !user?.id || hasFetchedRef.current) return
    hasFetchedRef.current = true
    fetchFromSupabase(currentFamily.id, user.id).catch(() => {})
  }, [currentFamily?.id, user?.id, fetchFromSupabase])

  const prevFamilyRef = useRef(currentFamily?.id)
  useEffect(() => {
    if (!currentFamily?.id || !user?.id || prevFamilyRef.current === currentFamily.id) return
    prevFamilyRef.current = currentFamily.id
    fetchFromSupabase(currentFamily.id, user.id).catch(() => {})
  }, [currentFamily?.id, user?.id, fetchFromSupabase])

  const [activeFilter, setActiveFilter] = useState<MilestoneType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formType, setFormType] = useState<MilestoneType>('birthday')
  const [formDescription, setFormDescription] = useState('')
  const [formPersonId, setFormPersonId] = useState('')
  const [formRecurring, setFormRecurring] = useState(true)
  const [formNotifyDays, setFormNotifyDays] = useState(3)

  const filteredMilestones = useMemo(() => {
    let result = milestones
    if (activeFilter !== 'all') result = result.filter((m) => m.type === activeFilter)
    if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); result = result.filter((m) => m.title.toLowerCase().includes(q) || m.personName?.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q)) }
    return result
  }, [milestones, activeFilter, searchQuery])

  const upcomingMilestones = useMemo(() => {
    return milestones.map((m) => ({ ...m, daysUntil: getDaysUntilDate(m.date) })).filter((m) => m.daysUntil <= 30).sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 5)
  }, [milestones])

  const sortedMilestones = useMemo(() => {
    return [...filteredMilestones].map((m) => ({ ...m, daysUntil: getDaysUntilDate(m.date) })).sort((a, b) => a.daysUntil - b.daysUntil)
  }, [filteredMilestones])

  const stats = useMemo(() => {
    const birthdays = milestones.filter((m) => m.type === 'birthday').length
    const thisMonth = milestones.filter((m) => { const d = new Date(m.date); return d.getMonth() === new Date().getMonth() }).length
    const nextUpcoming = milestones.map((m) => ({ ...m, daysUntil: getDaysUntilDate(m.date) })).sort((a, b) => a.daysUntil - b.daysUntil)[0]
    return {
      total: milestones.length, birthdays, thisMonth,
      nextUpcoming: nextUpcoming ? (nextUpcoming.daysUntil === 0 ? mt.today : nextUpcoming.daysUntil === 1 ? mt.tomorrow : mt.inDays.replace('{n}', String(nextUpcoming.daysUntil))) : '—',
    }
  }, [milestones, mt])

  const monthStripData = useMemo(() => {
    const now = new Date(); const year = now.getFullYear(); const month = now.getMonth(); const daysInMonth = new Date(year, month + 1, 0).getDate()
    return Array.from({ length: daysInMonth }, (_, d) => {
      const dayMilestones = milestones.filter((m) => { const mDate = new Date(m.date); return mDate.getMonth() === month && mDate.getDate() === d + 1 })
      return { day: d + 1, hasMilestone: dayMilestones.length > 0, milestoneTypes: dayMilestones.map((m) => m.type) }
    })
  }, [milestones])

  const resetForm = useCallback(() => { setFormTitle(''); setFormDate(''); setFormType('birthday'); setFormDescription(''); setFormPersonId(''); setFormRecurring(true); setFormNotifyDays(3) }, [])
  const handleOpenAdd = useCallback(() => { resetForm(); setEditingMilestone(null); setShowAddDialog(true) }, [resetForm])
  const handleOpenEdit = useCallback((milestone: Milestone) => { setFormTitle(milestone.title); setFormDate(milestone.date.split('T')[0]); setFormType(milestone.type); setFormDescription(milestone.description || ''); setFormPersonId(milestone.personId || ''); setFormRecurring(milestone.isRecurring); setFormNotifyDays(milestone.notifyDaysBefore); setEditingMilestone(milestone); setShowAddDialog(true) }, [])

  const handleSave = useCallback(() => {
    if (!formTitle.trim() || !formDate) { toast.error(isRTL ? 'يرجى ملء الحقول المطلوبة' : 'Please fill in required fields'); return }
    const personName = formPersonId ? familyMembers.find((fm) => fm.user_id === formPersonId)?.profiles?.first_name || familyMembers.find((fm) => fm.user_id === formPersonId)?.nickname || '' : ''
    const milestoneData: Milestone = { id: editingMilestone?.id || crypto.randomUUID(), title: formTitle.trim(), date: new Date(formDate).toISOString(), type: formType, description: formDescription.trim() || undefined, personId: formPersonId || undefined, personName: personName || undefined, emoji: typeConfig[formType].emoji, isRecurring: formRecurring, notifyDaysBefore: formNotifyDays, createdAt: editingMilestone?.createdAt || new Date().toISOString() }
    const familyId = currentFamily?.id || 'demo-family-001'; const userId = user?.id || 'demo-user-001'
    if (editingMilestone) { updateMilestoneInSupabase(milestoneData.id, milestoneData, familyId); toast.success(isRTL ? 'تم تحديث المناسبة' : 'Milestone updated') }
    else { addMilestoneToSupabase(milestoneData, familyId, userId); toast.success(isRTL ? 'تمت إضافة المناسبة' : 'Milestone added') }
    setShowAddDialog(false); resetForm(); setEditingMilestone(null)
  }, [formTitle, formDate, formType, formDescription, formPersonId, formRecurring, formNotifyDays, editingMilestone, familyMembers, isRTL, updateMilestoneInSupabase, addMilestoneToSupabase, resetForm, currentFamily?.id, user?.id])

  const handleDelete = useCallback(async (id: string) => { await removeMilestoneFromSupabase(id); setDeleteConfirmId(null); toast.success(isRTL ? 'تم حذف المناسبة' : 'Milestone deleted') }, [removeMilestoneFromSupabase, isRTL])

  const dir = isRTL ? 'rtl' : 'ltr'
  const todayDate = new Date().getDate()

  return (
    <Container maxWidth="lg" sx={{ py: 3 }} dir={dir}>
      <Stack spacing={3}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CakeIcon sx={{ color: 'error.main' }} />
            <Box>
              <Typography variant="h5" fontWeight={700}>{mt.title}</Typography>
              <Typography variant="body2" color="text.secondary">{isRTL ? 'تتبع التواريخ المهمة لعائلتك' : "Track your family's important dates"}</Typography>
            </Box>
          </Stack>
          <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}>{mt.addMilestone}</Button>
        </Stack>

        {/* Statistics */}
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 6, sm: 3 }}><StatCard icon={Celebration} label={mt.totalMilestones} value={stats.total} color="primary" /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><StatCard icon={CakeIcon} label={mt.birthdaysCount} value={stats.birthdays} color="error" /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><StatCard icon={Schedule} label={mt.nextUpcoming} value={stats.nextUpcoming} color="success" smallValue /></Grid>
          <Grid size={{ xs: 6, sm: 3 }}><StatCard icon={CalendarMonth} label={mt.thisMonthCount} value={stats.thisMonth} color="primary" /></Grid>
        </Grid>

        {/* Month Calendar Strip */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 4 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <CalendarMonth sx={{ fontSize: 14 }} />
            <Typography variant="caption" fontWeight={500}>{new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' })}</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} sx={{ overflowX: 'auto', pb: 1 }}>
            {monthStripData.map((day) => (
              <Stack key={day.day} alignItems="center" sx={{ minWidth: 36, py: 1, px: 0.5, borderRadius: 2, bgcolor: day.day === todayDate ? 'primary.main' + '15' : day.hasMilestone ? 'action.hover' : 'transparent', ring: day.day === todayDate ? 1 : 0 }}>
                <Typography variant="caption" fontWeight={500} sx={{ fontSize: 10, color: day.day === todayDate ? 'primary.main' : 'text.disabled' }}>{day.day}</Typography>
                {day.hasMilestone && (
                  <Stack direction="row" spacing={0.25} sx={{ mt: 0.5 }}>
                    {day.milestoneTypes.slice(0, 3).map((type, i) => (
                      <Box key={i} sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: `${typeConfig[type].color}.main` }} />
                    ))}
                  </Stack>
                )}
              </Stack>
            ))}
          </Stack>
        </Paper>

        {/* Filter Tabs & Search */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Stack direction="row" spacing={0.75} sx={{ overflowX: 'auto', pb: 0.5 }}>
            {filterTypes.map((filter) => {
              const isActive = activeFilter === filter.key
              const emoji = filter.key === 'all' ? '📋' : typeConfig[filter.key as MilestoneType].emoji
              return (
                <Chip key={filter.key} label={`${emoji} ${mt[filter.labelKey]}`} size="small" variant={isActive ? 'filled' : 'outlined'} color={isActive ? 'primary' : 'default'} onClick={() => setActiveFilter(filter.key)} sx={{ cursor: 'pointer' }} />
              )
            })}
          </Stack>
          <TextField placeholder={mt.search} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} size="small" sx={{ maxWidth: 300 }} InputProps={{ startAdornment: <Search sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} /> }} />
        </Stack>

        {/* Upcoming Section */}
        {upcomingMilestones.length > 0 && activeFilter === 'all' && !searchQuery.trim() && (
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              <Schedule sx={{ fontSize: 14 }} />
              <Typography variant="subtitle2">{mt.upcoming}</Typography>
            </Stack>
            <Grid container spacing={1.5}>
              {upcomingMilestones.map((milestone, index) => {
                const config = typeConfig[milestone.type]
                const countdown = getCountdownChip(milestone.daysUntil, mt)
                return (
                  <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={milestone.id}>
                    <Paper variant="outlined" onClick={() => handleOpenEdit(milestone)} sx={{ p: 2, borderRadius: 4, cursor: 'pointer', borderColor: `${config.color}.main`, opacity: 0.8, '&:hover': { opacity: 1, borderColor: `${config.color}.main` } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Box sx={{ width: 40, height: 40, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${config.color}.main`, opacity: 0.15, fontSize: 18 }}>{config.emoji}</Box>
                          <Box>
                            <Typography variant="body2" fontWeight={600} noWrap>{milestone.title}</Typography>
                            {milestone.personName && <Typography variant="caption" color="text.secondary">{milestone.personName}</Typography>}
                          </Box>
                        </Stack>
                        <Chip label={countdown.label} size="small" color={countdown.color} variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
                        <CalendarMonth sx={{ fontSize: 12, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">{formatDate(milestone.date, isRTL)}</Typography>
                        {milestone.type === 'birthday' && <Typography variant="caption" color="error.main">· {mt.turning.replace('{age}', String(calculateAge(milestone.date)))}</Typography>}
                        {milestone.type === 'anniversary' && <Typography variant="caption" color="primary.main">· {mt.anniversaryYearOther.replace('{n}', String(calculateAnniversaryYears(milestone.date)))}</Typography>}
                      </Stack>
                    </Paper>
                  </Grid>
                )
              })}
            </Grid>
          </Box>
        )}

        {/* Timeline View */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
            <TrendingUp sx={{ fontSize: 14 }} />
            <Typography variant="subtitle2">{mt.timeline}</Typography>
          </Stack>

          {sortedMilestones.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: 4 }}>
              <Stack alignItems="center" spacing={2}>
                <Box sx={{ width: 80, height: 80, borderRadius: 4, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CardGiftcard sx={{ fontSize: 40, color: 'text.disabled' }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={600}>{mt.noMilestones}</Typography>
                  <Typography variant="body2" color="text.secondary">{mt.noMilestonesDesc}</Typography>
                </Box>
                <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}>{mt.addMilestone}</Button>
              </Stack>
            </Paper>
          ) : (
            <Box sx={{ position: 'relative' }}>
              <Box sx={{ position: 'absolute', left: isRTL ? 'auto' : 20, right: isRTL ? 20 : 'auto', top: 0, bottom: 0, width: 1, bgcolor: 'divider' }} />
              <Stack spacing={2}>
                <AnimatePresence mode="popLayout">
                  {sortedMilestones.map((milestone, index) => {
                    const config = typeConfig[milestone.type]
                    const countdown = getCountdownChip(milestone.daysUntil, mt)
                    return (
                      <motion.div key={milestone.id} initial={{ opacity: 0, x: isRTL ? 12 : -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isRTL ? 12 : -12 }} transition={{ duration: 0.25, delay: index * 0.03 }}>
                        <Stack direction="row" spacing={2} sx={{ pl: 1, position: 'relative' }}>
                          <Box sx={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 10, bgcolor: 'background.paper', border: 2, borderColor: 'background.paper', boxShadow: `0 0 0 2px ${theme.palette[config.color].main}30` }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: `${config.color}.main` }} />
                          </Box>
                          <Paper variant="outlined" onClick={() => handleOpenEdit(milestone)} sx={{ flex: 1, p: 2, borderRadius: 4, cursor: 'pointer', borderColor: `${config.color}.main`, opacity: 0.8, '&:hover': { opacity: 1 } }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                              <Stack direction="row" spacing={1.5}>
                                <Box sx={{ width: 40, height: 40, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${config.color}.main`, opacity: 0.15, fontSize: 18, flexShrink: 0 }}>{config.emoji}</Box>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="body2" fontWeight={600} noWrap>{milestone.title}</Typography>
                                  {milestone.personName && (
                                    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: 0.5 }}>
                                      <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Groups sx={{ fontSize: 12, color: 'text.disabled' }} />
                                      </Box>
                                      <Typography variant="caption" color="text.secondary">{milestone.personName}</Typography>
                                    </Stack>
                                  )}
                                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
                                    <CalendarMonth sx={{ fontSize: 12, color: 'text.disabled' }} />
                                    <Typography variant="caption" color="text.secondary">{formatDate(milestone.date, isRTL)}</Typography>
                                    {milestone.isRecurring && <Typography variant="caption" color="text.disabled">🔄</Typography>}
                                  </Stack>
                                  {milestone.description && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{milestone.description}</Typography>}
                                </Box>
                              </Stack>
                              <Stack alignItems="flex-end" spacing={1} sx={{ flexShrink: 0 }}>
                                <Chip label={countdown.label} size="small" color={countdown.color} variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                                {milestone.type === 'birthday' && <Typography variant="caption" color="error.main" sx={{ fontSize: 10, fontWeight: 500 }}>{mt.turning.replace('{age}', String(calculateAge(milestone.date)))}</Typography>}
                                {milestone.type === 'anniversary' && <Typography variant="caption" color="primary.main" sx={{ fontSize: 10, fontWeight: 500 }}>{mt.anniversaryYearOther.replace('{n}', String(calculateAnniversaryYears(milestone.date)))}</Typography>}
                                <Stack direction="row" spacing={0.5}>
                                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenEdit(milestone) }} aria-label={mt.editMilestone}><Edit sx={{ fontSize: 12 }} /></IconButton>
                                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(milestone.id) }} aria-label={mt.deleteMilestone} color="error"><Delete sx={{ fontSize: 12 }} /></IconButton>
                                </Stack>
                              </Stack>
                            </Stack>
                          </Paper>
                        </Stack>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </Stack>
            </Box>
          )}
        </Box>
      </Stack>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onClose={() => { setShowAddDialog(false); resetForm(); setEditingMilestone(null) }} maxWidth="sm" fullWidth dir={dir}>
        <DialogTitle>{editingMilestone ? mt.editMilestone : mt.addMilestone}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label={`${mt.milestoneTitle} *`} value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder={isRTL ? 'مثال: عيد ميلاد أحمد' : "e.g., Ahmed's Birthday"} size="small" fullWidth />
            <TextField type="date" label={`${mt.date} *`} value={formDate} onChange={(e) => setFormDate(e.target.value)} size="small" fullWidth InputLabelProps={{ shrink: true }} />
            <FormControl size="small" fullWidth><InputLabel>{mt.type}</InputLabel><Select value={formType} label={mt.type} onChange={(e) => setFormType(e.target.value as MilestoneType)}>
              {(['birthday', 'anniversary', 'graduation', 'achievement', 'custom'] as MilestoneType[]).map((type) => (<MenuItem key={type} value={type}>{typeConfig[type].emoji} {mt[type as keyof typeof mt]}</MenuItem>))}
            </Select></FormControl>
            <FormControl size="small" fullWidth><InputLabel>{mt.person}</InputLabel><Select value={formPersonId} label={mt.person} onChange={(e) => setFormPersonId(e.target.value)}>
              <MenuItem value=""><em>{mt.selectPerson}</em></MenuItem>
              {familyMembers.map((fm) => (<MenuItem key={fm.user_id} value={fm.user_id}>{fm.profiles?.first_name || fm.nickname || fm.user_id}</MenuItem>))}
            </Select></FormControl>
            <TextField label={mt.description} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder={isRTL ? 'أضف وصفًا (اختياري)' : 'Add a description (optional)'} size="small" fullWidth />
            <FormControlLabel control={<Switch checked={formRecurring} onChange={(e) => setFormRecurring(e.target.checked)} />} label={mt.recurring} />
            <FormControl size="small" fullWidth><InputLabel>{mt.notifyDaysBefore}</InputLabel><Select value={String(formNotifyDays)} label={mt.notifyDaysBefore} onChange={(e) => setFormNotifyDays(Number(e.target.value))}>
              {[1, 2, 3, 5, 7, 14, 30].map((d) => (<MenuItem key={d} value={String(d)}>{d} {isRTL ? 'أيام' : 'days'}</MenuItem>))}
            </Select></FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setShowAddDialog(false); resetForm(); setEditingMilestone(null) }} color="inherit">{t.common.cancel}</Button>
          <Button onClick={handleSave} variant="contained">{editingMilestone ? t.common.save : t.common.add}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} maxWidth="xs">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}><Delete /> {mt.deleteMilestone}</DialogTitle>
        <DialogContent><Typography variant="body2">{mt.confirmDelete}</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)} color="inherit">{t.common.cancel}</Button>
          <Button onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} color="error" variant="contained">{t.common.delete}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
