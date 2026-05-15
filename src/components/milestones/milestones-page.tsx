'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Cake,
  Gift,
  GraduationCap,
  Trophy,
  Star,
  Search,
  Calendar,
  Clock,
  Users,
  TrendingUp,
  PartyPopper,
  Heart,
  ChevronDown,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMilestoneStore, type Milestone, type MilestoneType } from '@/stores/milestone-store'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n/use-translation'
import { toast } from 'sonner'

// ─── Type Config ────────────────────────────────────────────────────
const typeConfig: Record<MilestoneType, { emoji: string; color: string; bg: string; border: string; dotColor: string }> = {
  birthday: { emoji: '🎂', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', dotColor: 'bg-pink-400' },
  anniversary: { emoji: '💍', color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20', dotColor: 'bg-teal-400' },
  graduation: { emoji: '🎓', color: 'text-[#0D9488]', bg: 'bg-[#0D9488]/10', border: 'border-[#0D9488]/20', dotColor: 'bg-[#0D9488]' },
  achievement: { emoji: '🏆', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dotColor: 'bg-emerald-400' },
  custom: { emoji: '⭐', color: 'text-[#0D9488]', bg: 'bg-[#0D9488]/10', border: 'border-[#0D9488]/20', dotColor: 'bg-[#0D9488]' },
}

const typeIconMap: Record<MilestoneType, React.ElementType> = {
  birthday: Cake,
  anniversary: Heart,
  graduation: GraduationCap,
  achievement: Trophy,
  custom: Star,
}

// ─── Helper Functions ────────────────────────────────────────────────
function getDaysUntilDate(dateStr: string): number {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const milestoneDate = new Date(dateStr)
  const thisYearDate = new Date(today.getFullYear(), milestoneDate.getMonth(), milestoneDate.getDate())
  if (thisYearDate < today) {
    thisYearDate.setFullYear(today.getFullYear() + 1)
  }
  return Math.ceil((thisYearDate.getTime() - today.getTime()) / 86400000)
}

function getCountdownBadge(days: number, t: typeof import('@/i18n/en').en.milestones) {
  if (days === 0) return { label: t.today, color: 'bg-green-500/20 text-green-400 border-green-500/30' }
  if (days === 1) return { label: t.tomorrow, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' }
  if (days <= 7) return { label: t.inDays.replace('{n}', String(days)), color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' }
  if (days <= 30) return { label: t.inDays.replace('{n}', String(days)), color: 'bg-[#0D9488]/15 text-[#0D9488] border-[#0D9488]/20' }
  return { label: t.inDays.replace('{n}', String(days)), color: 'bg-[--bg-surface-2] text-[--text-muted] border-[--border-subtle]' }
}

function calculateAge(birthDateStr: string): number {
  const birth = new Date(birthDateStr)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--
  }
  return age + 1 // "Turning X" means the upcoming age
}

function calculateAnniversaryYears(dateStr: string): number {
  const start = new Date(dateStr)
  const now = new Date()
  return now.getFullYear() - start.getFullYear()
}

function formatDate(dateStr: string, isRTL: boolean): string {
  const d = new Date(dateStr)
  const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' }
  return d.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', options)
}

// ─── Filter Tabs ────────────────────────────────────────────────────
const filterTypes: { key: MilestoneType | 'all'; labelKey: keyof import('@/i18n/en').TranslationKeys['milestones'] }[] = [
  { key: 'all', labelKey: 'all' },
  { key: 'birthday', labelKey: 'birthday' },
  { key: 'anniversary', labelKey: 'anniversary' },
  { key: 'graduation', labelKey: 'graduation' },
  { key: 'achievement', labelKey: 'achievement' },
  { key: 'custom', labelKey: 'custom' },
]

// ─── Main Component ─────────────────────────────────────────────────
export default function MilestonesPage() {
  // Selector-based subscriptions to avoid unnecessary re-renders
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

  // Fetch data from Supabase on mount
  const hasFetchedRef = useRef(false)
  useEffect(() => {
    if (!currentFamily?.id || !user?.id) return
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true

    fetchFromSupabase(currentFamily.id, user.id).catch((err) => {
      console.warn('[MilestonesPage] Initial fetch failed:', err)
    })
  }, [currentFamily?.id, user?.id, fetchFromSupabase])

  // Re-fetch when family changes
  const prevFamilyRef = useRef(currentFamily?.id)
  useEffect(() => {
    if (!currentFamily?.id || !user?.id) return
    if (prevFamilyRef.current === currentFamily.id) return
    prevFamilyRef.current = currentFamily.id

    fetchFromSupabase(currentFamily.id, user.id).catch((err) => {
      console.warn('[MilestonesPage] Re-fetch on family change failed:', err)
    })
  }, [currentFamily?.id, user?.id, fetchFromSupabase])

  const [activeFilter, setActiveFilter] = useState<MilestoneType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formType, setFormType] = useState<MilestoneType>('birthday')
  const [formDescription, setFormDescription] = useState('')
  const [formPersonId, setFormPersonId] = useState('')
  const [formRecurring, setFormRecurring] = useState(true)
  const [formNotifyDays, setFormNotifyDays] = useState(3)

  // Filtered milestones
  const filteredMilestones = useMemo(() => {
    let result = milestones
    if (activeFilter !== 'all') {
      result = result.filter((m) => m.type === activeFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.personName?.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q)
      )
    }
    return result
  }, [milestones, activeFilter, searchQuery])

  // Upcoming milestones (next 30 days)
  const upcomingMilestones = useMemo(() => {
    return milestones
      .map((m) => ({ ...m, daysUntil: getDaysUntilDate(m.date) }))
      .filter((m) => m.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5)
  }, [milestones])

  // All milestones sorted by next occurrence
  const sortedMilestones = useMemo(() => {
    return [...filteredMilestones]
      .map((m) => ({ ...m, daysUntil: getDaysUntilDate(m.date) }))
      .sort((a, b) => a.daysUntil - b.daysUntil)
  }, [filteredMilestones])

  // Statistics
  const stats = useMemo(() => {
    const birthdays = milestones.filter((m) => m.type === 'birthday').length
    const thisMonth = milestones.filter((m) => {
      const d = new Date(m.date)
      const now = new Date()
      return d.getMonth() === now.getMonth()
    }).length
    const nextUpcoming = milestones
      .map((m) => ({ ...m, daysUntil: getDaysUntilDate(m.date) }))
      .sort((a, b) => a.daysUntil - b.daysUntil)[0]
    return {
      total: milestones.length,
      birthdays,
      thisMonth,
      nextUpcoming: nextUpcoming
        ? nextUpcoming.daysUntil === 0
          ? mt.today
          : nextUpcoming.daysUntil === 1
            ? mt.tomorrow
            : mt.inDays.replace('{n}', String(nextUpcoming.daysUntil))
        : '—',
    }
  }, [milestones, mt])

  // Month strip data
  const monthStripData = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: { day: number; hasMilestone: boolean; milestoneTypes: MilestoneType[] }[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayMilestones = milestones.filter((m) => {
        const mDate = new Date(m.date)
        return mDate.getMonth() === month && mDate.getDate() === d
      })
      days.push({
        day: d,
        hasMilestone: dayMilestones.length > 0,
        milestoneTypes: dayMilestones.map((m) => m.type),
      })
    }
    return days
  }, [milestones])

  // Reset form
  const resetForm = useCallback(() => {
    setFormTitle('')
    setFormDate('')
    setFormType('birthday')
    setFormDescription('')
    setFormPersonId('')
    setFormRecurring(true)
    setFormNotifyDays(3)
  }, [])

  // Open add dialog
  const handleOpenAdd = useCallback(() => {
    resetForm()
    setEditingMilestone(null)
    setShowAddDialog(true)
  }, [resetForm])

  // Open edit dialog
  const handleOpenEdit = useCallback((milestone: Milestone) => {
    setFormTitle(milestone.title)
    setFormDate(milestone.date.split('T')[0])
    setFormType(milestone.type)
    setFormDescription(milestone.description || '')
    setFormPersonId(milestone.personId || '')
    setFormRecurring(milestone.isRecurring)
    setFormNotifyDays(milestone.notifyDaysBefore)
    setEditingMilestone(milestone)
    setShowAddDialog(true)
  }, [])

  // Save milestone
  const handleSave = useCallback(() => {
    if (!formTitle.trim() || !formDate) {
      toast.error(isRTL ? 'يرجى ملء الحقول المطلوبة' : 'Please fill in required fields')
      return
    }

    const personName = formPersonId
      ? familyMembers.find((fm) => fm.user_id === formPersonId)?.profiles?.first_name ||
        familyMembers.find((fm) => fm.user_id === formPersonId)?.nickname ||
        ''
      : ''

    const milestoneData: Milestone = {
      id: editingMilestone?.id || crypto.randomUUID(),
      title: formTitle.trim(),
      date: new Date(formDate).toISOString(),
      type: formType,
      description: formDescription.trim() || undefined,
      personId: formPersonId || undefined,
      personName: personName || undefined,
      emoji: typeConfig[formType].emoji,
      isRecurring: formRecurring,
      notifyDaysBefore: formNotifyDays,
      createdAt: editingMilestone?.createdAt || new Date().toISOString(),
    }

    const familyId = currentFamily?.id || 'demo-family-001'
    const userId = user?.id || 'demo-user-001'

    if (editingMilestone) {
      updateMilestoneInSupabase(milestoneData.id, milestoneData, familyId)
      toast.success(isRTL ? 'تم تحديث المناسبة' : 'Milestone updated')
    } else {
      addMilestoneToSupabase(milestoneData, familyId, userId)
      toast.success(isRTL ? 'تمت إضافة المناسبة' : 'Milestone added')
    }

    setShowAddDialog(false)
    resetForm()
    setEditingMilestone(null)
  }, [formTitle, formDate, formType, formDescription, formPersonId, formRecurring, formNotifyDays, editingMilestone, familyMembers, isRTL, updateMilestoneInSupabase, addMilestoneToSupabase, resetForm, currentFamily?.id, user?.id])

  // Delete milestone
  const handleDelete = useCallback(async (id: string) => {
    await removeMilestoneFromSupabase(id)
    setDeleteConfirmId(null)
    toast.success(isRTL ? 'تم حذف المناسبة' : 'Milestone deleted')
  }, [removeMilestoneFromSupabase, isRTL])

  const dir = isRTL ? 'rtl' : 'ltr'
  const today = new Date()
  const todayDate = today.getDate()

  return (
    <div className="space-y-6" dir={dir}>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-heading-2 font-display text-[--text-primary] flex items-center gap-2">
            <Cake className="size-6 text-pink-400" />
            {mt.title}
          </h1>
          <p className="text-sm text-[--text-muted] mt-1">
            {isRTL ? 'تتبع التواريخ المهمة لعائلتك' : 'Track your family\'s important dates'}
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="bg-[--accent-primary] hover:bg-[--accent-primary]/90 text-white rounded-xl gap-2 shadow-lg shadow-[--accent-primary]/20 btn-press"
        >
          <Plus className="size-4" />
          {mt.addMilestone}
        </Button>
      </motion.div>

      {/* ─── Statistics Bar ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <StatCard icon={PartyPopper} label={mt.totalMilestones} value={stats.total} color="text-[#0D9488]" bg="bg-[#0D9488]/10" />
        <StatCard icon={Cake} label={mt.birthdaysCount} value={stats.birthdays} color="text-pink-400" bg="bg-pink-500/10" />
        <StatCard icon={Clock} label={mt.nextUpcoming} value={stats.nextUpcoming} color="text-emerald-400" bg="bg-emerald-500/10" smallValue />
        <StatCard icon={Calendar} label={mt.thisMonthCount} value={stats.thisMonth} color="text-[#0D9488]" bg="bg-[#0D9488]/10" />
      </motion.div>

      {/* ─── Month Calendar Strip ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="glass rounded-2xl p-4 font-display shadow-lg"
      >
        <h3 className="section-header flex items-center gap-2">
          <Calendar className="size-3.5" />
          {today.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex gap-1 overflow-x-auto pb-2 custom-scrollbar">
          {monthStripData.map((day) => (
            <div
              key={day.day}
              className={`
                flex flex-col items-center min-w-[36px] py-2 px-1 rounded-lg transition-colors
                ${day.day === todayDate ? 'bg-[--accent-primary]/15 ring-1 ring-[--accent-primary]/30' : ''}
                ${day.hasMilestone ? 'bg-[--bg-surface-2]' : ''}
              `}
            >
              <span className={`text-[10px] font-medium ${day.day === todayDate ? 'text-[--accent-primary]' : 'text-[--text-muted]'}`}>
                {day.day}
              </span>
              {day.hasMilestone && (
                <div className="flex gap-0.5 mt-1">
                  {day.milestoneTypes.slice(0, 3).map((type, i) => (
                    <div
                      key={i}
                      className={`size-1.5 rounded-full ${typeConfig[type].dotColor}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* ─── Filter Tabs & Search ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {filterTypes.map((filter) => {
            const isActive = activeFilter === filter.key
            const emoji = filter.key === 'all' ? '📋' : typeConfig[filter.key as MilestoneType].emoji
            return (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                  transition-all whitespace-nowrap border
                  ${isActive
                    ? 'bg-[--accent-primary]/15 text-[--accent-primary] border-[--accent-primary]/30'
                    : 'bg-[--bg-surface] text-[--text-muted] border-[--border-subtle] hover:bg-[--bg-surface-2] hover:text-[--text-secondary]'
                  }
                `}
              >
                <span>{emoji}</span>
                {mt[filter.labelKey]}
              </button>
            )
          })}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute top-1/2 -translate-y-1/2 size-4 text-[--text-muted] start-3" />
          <Input
            placeholder={mt.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted] rounded-xl ps-9"
          />
        </div>
      </motion.div>

      {/* ─── Upcoming Section ────────────────────────────────────── */}
      {upcomingMilestones.length > 0 && activeFilter === 'all' && !searchQuery.trim() && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <h3 className="section-header flex items-center gap-2">
            <Clock className="size-3.5" />
            {mt.upcoming}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingMilestones.map((milestone, index) => {
              const config = typeConfig[milestone.type]
              const countdown = getCountdownBadge(milestone.daysUntil, mt)
              return (
                <motion.div
                  key={milestone.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.05 }}
                  className={`
                    glass-card glass rounded-2xl p-4 border cursor-pointer card-hover
                    ${config.border}
                  `}
                  onClick={() => handleOpenEdit(milestone)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`size-10 rounded-xl flex items-center justify-center text-lg ${config.bg}`}>
                        {config.emoji}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[--text-primary] line-clamp-1">
                          {milestone.title}
                        </p>
                        {milestone.personName && (
                          <p className="text-xs text-[--text-muted] mt-0.5">
                            {milestone.personName}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className={`${countdown.color} text-[10px] font-medium border shrink-0`}>
                      {countdown.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-xs text-[--text-muted]">
                    <Calendar className="size-3" />
                    {formatDate(milestone.date, isRTL)}
                    {milestone.type === 'birthday' && (
                      <span className="text-pink-400">
                        · {mt.turning.replace('{age}', String(calculateAge(milestone.date)))}
                      </span>
                    )}
                    {milestone.type === 'anniversary' && (
                      <span className="text-teal-400">
                        · {mt.anniversaryYearOther.replace('{n}', String(calculateAnniversaryYears(milestone.date)))}
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ─── Timeline View ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
      >
        <h3 className="section-header flex items-center gap-2">
          <TrendingUp className="size-3.5" />
          {mt.timeline}
        </h3>

        {sortedMilestones.length === 0 ? (
          /* ─── Empty State ────────────────────────────────────────── */
          <div className="glass rounded-2xl p-12 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, type: 'spring' }}
              className="flex flex-col items-center gap-4"
            >
              <div className="size-20 rounded-2xl bg-[--bg-surface-2] flex items-center justify-center">
                <Gift className="size-10 text-[--text-muted]" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[--text-primary]">{mt.noMilestones}</p>
                <p className="text-sm text-[--text-muted] mt-1">{mt.noMilestonesDesc}</p>
              </div>
              <Button
                onClick={handleOpenAdd}
                className="bg-[--accent-primary] hover:bg-[--accent-primary]/90 text-white rounded-xl gap-2 btn-press"
              >
                <Plus className="size-4" />
                {mt.addMilestone}
              </Button>
            </motion.div>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute start-5 top-0 bottom-0 w-px bg-[--border-subtle]" />

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {sortedMilestones.map((milestone, index) => {
                  const config = typeConfig[milestone.type]
                  const countdown = getCountdownBadge(milestone.daysUntil, mt)
                  const Icon = typeIconMap[milestone.type]

                  return (
                    <motion.div
                      key={milestone.id}
                      initial={{ opacity: 0, x: isRTL ? 12 : -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: isRTL ? 12 : -12 }}
                      transition={{ duration: 0.25, delay: index * 0.03 }}
                      className="relative flex gap-4 ps-2"
                    >
                      {/* Timeline dot */}
                      <div className={`
                        size-8 rounded-full flex items-center justify-center shrink-0 z-10
                        border-2 border-[--bg-primary] ${config.bg}
                      `}>
                        <div className={`size-2.5 rounded-full ${config.dotColor}`} />
                      </div>

                      {/* Milestone card */}
                      <div className={`
                        flex-1 glass-card glass rounded-2xl p-4 border cursor-pointer card-hover
                        ${config.border}
                      `}
                        onClick={() => handleOpenEdit(milestone)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`size-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${config.bg}`}>
                              {config.emoji}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[--text-primary] line-clamp-1">
                                {milestone.title}
                              </p>
                              {milestone.personName && (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <div className="size-5 rounded-full bg-[--bg-surface-2] flex items-center justify-center">
                                    <Users className="size-3 text-[--text-muted]" />
                                  </div>
                                  <span className="text-xs text-[--text-muted]">{milestone.personName}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-2 text-xs text-[--text-muted]">
                                <Calendar className="size-3" />
                                {formatDate(milestone.date, isRTL)}
                                <span className="text-[--text-muted]/50">·</span>
                                <span className="text-[--text-muted]/60">{mt.hijriDate}</span>
                                {milestone.isRecurring && (
                                  <>
                                    <span className="text-[--text-muted]/50">·</span>
                                    <span className="text-[--text-muted]/60">🔄</span>
                                  </>
                                )}
                              </div>
                              {milestone.description && (
                                <p className="text-xs text-[--text-muted] mt-1.5 line-clamp-2">
                                  {milestone.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <Badge className={`${countdown.color} text-[10px] font-medium border`}>
                              {countdown.label}
                            </Badge>
                            {milestone.type === 'birthday' && (
                              <span className="text-[10px] text-pink-400 font-medium">
                                {mt.turning.replace('{age}', String(calculateAge(milestone.date)))}
                              </span>
                            )}
                            {milestone.type === 'anniversary' && (
                              <span className="text-[10px] text-teal-400 font-medium">
                                {mt.anniversaryYearOther.replace('{n}', String(calculateAnniversaryYears(milestone.date)))}
                              </span>
                            )}
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenEdit(milestone)
                                }}
                                className="size-7 rounded-lg flex items-center justify-center text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-surface-2] transition-colors"
                                aria-label={mt.editMilestone}
                              >
                                <Pencil className="size-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeleteConfirmId(milestone.id)
                                }}
                                className="size-7 rounded-lg flex items-center justify-center text-[--text-muted] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                aria-label={mt.deleteMilestone}
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.div>

      {/* ─── Add/Edit Milestone Dialog ───────────────────────────── */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false)
          resetForm()
          setEditingMilestone(null)
        }
      }}>
        <DialogContent className="bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] max-w-md rounded-2xl shadow-2xl" dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingMilestone ? (
                <>{Pencil && <Pencil className="size-4" />} {mt.editMilestone}</>
              ) : (
                <>{Plus && <Plus className="size-4" />} {mt.addMilestone}</>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-[--text-secondary] text-sm">{mt.milestoneTitle} *</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={isRTL ? 'مثال: عيد ميلاد أحمد' : 'e.g., Ahmed\'s Birthday'}
                className="h-10 bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted] rounded-xl"
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label className="text-[--text-secondary] text-sm">{mt.date} *</Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="h-10 bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] rounded-xl"
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label className="text-[--text-secondary] text-sm">{mt.type}</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as MilestoneType)}>
                <SelectTrigger className="h-10 bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[--bg-surface] border-[--border-subtle]">
                  {(['birthday', 'anniversary', 'graduation', 'achievement', 'custom'] as MilestoneType[]).map((type) => (
                    <SelectItem key={type} value={type} className="text-[--text-primary] focus:bg-[--bg-surface-2] focus:text-[--text-primary]">
                      <span className="flex items-center gap-2">
                        {typeConfig[type].emoji} {mt[type as keyof typeof mt]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Person */}
            <div className="space-y-2">
              <Label className="text-[--text-secondary] text-sm">{mt.person}</Label>
              <Select value={formPersonId} onValueChange={setFormPersonId}>
                <SelectTrigger className="h-10 bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] rounded-xl">
                  <SelectValue placeholder={mt.selectPerson} />
                </SelectTrigger>
                <SelectContent className="bg-[--bg-surface] border-[--border-subtle]">
                  {familyMembers.map((fm) => (
                    <SelectItem key={fm.user_id} value={fm.user_id} className="text-[--text-primary] focus:bg-[--bg-surface-2] focus:text-[--text-primary]">
                      {fm.profiles?.first_name || fm.nickname || fm.user_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-[--text-secondary] text-sm">{mt.description}</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={isRTL ? 'أضف وصفًا (اختياري)' : 'Add a description (optional)'}
                className="h-10 bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted] rounded-xl"
              />
            </div>

            {/* Recurring & Notify */}
            <div className="flex items-center justify-between">
              <Label className="text-[--text-secondary] text-sm">{mt.recurring}</Label>
              <Switch
                checked={formRecurring}
                onCheckedChange={setFormRecurring}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[--text-secondary] text-sm">{mt.notifyDaysBefore}</Label>
              <Select value={String(formNotifyDays)} onValueChange={(v) => setFormNotifyDays(Number(v))}>
                <SelectTrigger className="h-10 bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[--bg-surface] border-[--border-subtle]">
                  {[1, 2, 3, 5, 7, 14, 30].map((d) => (
                    <SelectItem key={d} value={String(d)} className="text-[--text-primary] focus:bg-[--bg-surface-2] focus:text-[--text-primary]">
                      {d} {isRTL ? 'أيام' : 'days'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false)
                resetForm()
                setEditingMilestone(null)
              }}
              className="border-[--border-subtle] text-[--text-secondary] hover:bg-[--bg-surface-2] rounded-xl"
            >
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleSave}
              className="bg-[--accent-primary] hover:bg-[--accent-primary]/90 text-white rounded-xl btn-press"
            >
              {editingMilestone ? t.common.save : t.common.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm Dialog ───────────────────────────────── */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] max-w-sm rounded-2xl shadow-2xl" dir={dir}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="size-4" />
              {mt.deleteMilestone}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[--text-muted]">{mt.confirmDelete}</p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              className="border-[--border-subtle] text-[--text-secondary] hover:bg-[--bg-surface-2] rounded-xl"
            >
              {t.common.cancel}
            </Button>
            <Button
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl btn-press"
            >
              {t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Stat Card Component ────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
  smallValue = false,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
  bg: string
  smallValue?: boolean
}) {
  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-3 shadow-lg">
      <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
        <Icon className={`size-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className={`font-semibold text-[--text-primary] truncate ${smallValue ? 'text-sm' : 'text-xl'}`}>
          {value}
        </p>
        <p className="text-[10px] text-[--text-muted] uppercase tracking-wider truncate">{label}</p>
      </div>
    </div>
  )
}
