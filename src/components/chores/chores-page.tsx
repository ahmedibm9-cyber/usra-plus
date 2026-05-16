'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  LayoutGrid,
  List,
  Pause,
  Play,
  CheckCircle2,
  ArrowRight,
  Trash2,
  Pencil,
  Sparkles,
  Clock,
  Trophy,
  Users,
  BarChart3,
  CalendarDays,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useChoreStore, type Chore } from '@/stores/chore-store'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n/use-translation'
import { toast } from 'sonner'

// ─── Icon Options ──────────────────────────────────────────────────
const CHORE_ICONS = [
  { emoji: '🧹', label: 'Sweep' },
  { emoji: '🧽', label: 'Wash' },
  { emoji: '🍳', label: 'Cook' },
  { emoji: '🧺', label: 'Laundry' },
  { emoji: '🗑️', label: 'Trash' },
  { emoji: '🪟', label: 'Windows' },
  { emoji: '🌿', label: 'Garden' },
  { emoji: '📦', label: 'Organize' },
  { emoji: '🚿', label: 'Bathroom' },
  { emoji: '🧹', label: 'Vacuum' },
]

// ─── Person colors for avatars ─────────────────────────────────────
const PERSON_COLORS = [
  'bg-[var(--accent-primary)]',
  'bg-[var(--accent)]',
  'bg-[#22C55E]',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-[var(--accent-primary)]',
]

function getPersonColor(index: number) {
  return PERSON_COLORS[index % PERSON_COLORS.length]
}

// ─── Difficulty badge colors ───────────────────────────────────────
const DIFFICULTY_STYLES = {
  easy: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/20',
  medium: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  hard: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
}

// ─── Frequency badge colors ────────────────────────────────────────
const FREQUENCY_STYLES = {
  daily: 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border-[var(--accent-primary)]/20',
  weekly: 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border-[var(--accent-primary)]/20',
  biweekly: 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border-[var(--accent-primary)]/20',
  monthly: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
}

// ─── Progress Ring Component ───────────────────────────────────────
function ProgressRing({ percent, size = 36, strokeWidth = 3 }: { percent: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percent / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border-subtle)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--accent-primary)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
    </svg>
  )
}

// ─── Person Avatar Helper ──────────────────────────────────────────
function PersonAvatar({ personId, members, size = 'sm' }: { personId: string; members: { id: string; user_id: string; nickname?: string | null; profiles?: { first_name?: string | null; last_name?: string | null } }[]; size?: 'sm' | 'md' }) {
  const member = members.find((m) => m.user_id === personId || m.id === personId)
  const name = member?.nickname || member?.profiles?.first_name || personId.slice(0, 2)
  const idx = members.findIndex((m) => m.user_id === personId || m.id === personId)
  const colorClass = getPersonColor(idx >= 0 ? idx : 0)
  const dim = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs'

  return (
    <Avatar className={`${dim} ring-1 ring-[--border-subtle]`}>
      <AvatarFallback className={`${colorClass} text-white font-semibold`}>
        {name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  )
}

// ─── Add/Edit Chore Dialog ─────────────────────────────────────────
function AddChoreDialog({
  open,
  onOpenChange,
  editingChore,
  members,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingChore: Chore | null
  members: { id: string; user_id: string; nickname?: string | null; profiles?: { first_name?: string | null; last_name?: string | null } }[]
}) {
  const { t, isRTL } = useI18n()

  // Use key to force remount of inner form when dialog opens with different data
  const formKey = `${open}-${editingChore?.id ?? 'new'}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[--bg-surface] border-[--border-subtle] text-[--text-primary] max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="text-[--text-primary]">
            {editingChore ? t.chores.editChore : t.chores.addChore}
          </DialogTitle>
        </DialogHeader>
        <AddChoreForm
          key={formKey}
          editingChore={editingChore}
          members={members}
          onSave={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function AddChoreForm({
  editingChore,
  members,
  onSave,
}: {
  editingChore: Chore | null
  members: { id: string; user_id: string; nickname?: string | null; profiles?: { first_name?: string | null; last_name?: string | null } }[]
  onSave: () => void
}) {
  const { t, isRTL } = useI18n()
  const addChoreToSupabase = useChoreStore((s) => s.addChoreToSupabase)
  const updateChoreInSupabase = useChoreStore((s) => s.updateChoreInSupabase)
  const currentFamily = useAppStore((s) => s.currentFamily)
  const user = useAuthStore((s) => s.user)
  const isEditing = !!editingChore

  const [title, setTitle] = useState(editingChore?.title ?? '')
  const [description, setDescription] = useState(editingChore?.description ?? '')
  const [icon, setIcon] = useState(editingChore?.icon ?? '🧹')
  const [frequency, setFrequency] = useState<Chore['frequency']>(editingChore?.frequency ?? 'weekly')
  const [difficulty, setDifficulty] = useState<Chore['difficulty']>(editingChore?.difficulty ?? 'medium')
  const [estimatedMinutes, setEstimatedMinutes] = useState(editingChore?.estimatedMinutes ?? 15)
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(editingChore?.assignedTo ?? [])

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleSave = () => {
    if (!title.trim()) {
      toast.error(isRTL ? 'يرجى إدخال عنوان المهمة' : 'Please enter a chore title')
      return
    }
    if (selectedAssignees.length === 0) {
      toast.error(isRTL ? 'يرجى اختيار مسؤول واحد على الأقل' : 'Please select at least one assignee')
      return
    }

    const choreData: Chore = {
      id: editingChore?.id || crypto.randomUUID(),
      title: title.trim(),
      description: description.trim() || undefined,
      icon,
      frequency,
      assignedTo: selectedAssignees,
      rotationOrder: selectedAssignees,
      currentAssigneeIndex: editingChore?.currentAssigneeIndex ?? 0,
      lastRotatedAt: editingChore?.lastRotatedAt,
      difficulty,
      estimatedMinutes,
      isPaused: editingChore?.isPaused ?? false,
      createdAt: editingChore?.createdAt || new Date().toISOString(),
    }

    const familyId = currentFamily?.id || 'demo-family-001'
    const userId = user?.id || 'demo-user-001'

    if (isEditing) {
      updateChoreInSupabase(choreData.id, choreData, familyId)
      toast.success(isRTL ? 'تم تحديث المهمة' : 'Chore updated')
    } else {
      addChoreToSupabase(choreData, familyId, userId)
      toast.success(isRTL ? 'تمت إضافة المهمة' : 'Chore added')
    }
    onSave()
  }

  return (
    <>
      <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Icon Selector */}
          <div className="space-y-2">
            <Label className="text-[--text-secondary] text-sm">{t.chores.selectIcon}</Label>
            <div className="flex flex-wrap gap-2">
              {CHORE_ICONS.map((ic) => (
                <button
                  key={ic.emoji + ic.label}
                  type="button"
                  onClick={() => setIcon(ic.emoji)}
                  className={`text-xl p-2 rounded-xl transition-all duration-200 ${
                    icon === ic.emoji
                      ? 'bg-[--accent-primary]/20 ring-2 ring-[--accent-primary]/50 scale-110'
                      : 'bg-[--bg-surface-2] hover:bg-[--border-subtle]'
                  }`}
                >
                  {ic.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-[--text-secondary] text-sm">{t.chores.choreTitle}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isRTL ? 'مثال: غسل الأطباق' : 'e.g. Wash Dishes'}
              className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted]"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-[--text-secondary] text-sm">{t.chores.description}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isRTL ? 'وصف اختياري' : 'Optional description'}
              className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary] placeholder:text-[--text-muted]"
            />
          </div>

          {/* Frequency + Difficulty Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[--text-secondary] text-sm">{t.chores.frequency}</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as Chore['frequency'])}>
                <SelectTrigger className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[--bg-surface] border-[--border-subtle]">
                  <SelectItem value="daily">{t.chores.daily}</SelectItem>
                  <SelectItem value="weekly">{t.chores.weekly}</SelectItem>
                  <SelectItem value="biweekly">{t.chores.biweekly}</SelectItem>
                  <SelectItem value="monthly">{t.chores.monthly}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[--text-secondary] text-sm">{t.chores.difficulty}</Label>
              <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Chore['difficulty'])}>
                <SelectTrigger className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[--bg-surface] border-[--border-subtle]">
                  <SelectItem value="easy">{t.chores.easy}</SelectItem>
                  <SelectItem value="medium">{t.chores.medium}</SelectItem>
                  <SelectItem value="hard">{t.chores.hard}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Estimated Minutes */}
          <div className="space-y-2">
            <Label className="text-[--text-secondary] text-sm">{t.chores.estimatedMinutes}</Label>
            <Input
              type="number"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 0)}
              min={1}
              className="bg-[--bg-primary] border-[--border-subtle] text-[--text-primary]"
            />
          </div>

          {/* Assignees */}
          <div className="space-y-2">
            <Label className="text-[--text-secondary] text-sm">{t.chores.selectAssignees}</Label>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => {
                const userId = member.user_id
                const name = member.nickname || member.profiles?.first_name || userId.slice(0, 8)
                const isSelected = selectedAssignees.includes(userId)
                const idx = members.indexOf(member)
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleAssignee(userId)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isSelected
                        ? 'bg-[--accent-primary]/20 text-[--accent-primary] border border-[--accent-primary]/30'
                        : 'bg-[--bg-surface-2] text-[--text-muted] border border-transparent hover:border-[--border-subtle]'
                    }`}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full ${getPersonColor(idx)}`} />
                    {name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleSave}
            className="flex-1 bg-[--accent-primary] hover:bg-[--accent-primary]/90 text-white"
          >
            {isEditing ? t.common.save : t.common.add}
          </Button>
          <Button
            variant="outline"
            onClick={onSave}
            className="border-[--border-subtle] text-[--text-muted]"
          >
            {t.common.cancel}
          </Button>
        </div>
    </>
  )
}

// ─── Chore Card (Board View) ───────────────────────────────────────
function ChoreCard({
  chore,
  members,
  onDone,
  onEdit,
  onDelete,
  onTogglePause,
}: {
  chore: Chore
  members: { id: string; user_id: string; nickname?: string | null; profiles?: { first_name?: string | null; last_name?: string | null } }[]
  onDone: (chore: Chore) => void
  onEdit: (chore: Chore) => void
  onDelete: (chore: Chore) => void
  onTogglePause: (chore: Chore) => void
}) {
  const { t, isRTL } = useI18n()
  const choreLogs = useChoreStore(s => s.choreLogs)
  const currentAssignee = chore.rotationOrder[chore.currentAssigneeIndex] || chore.assignedTo[0]
  const nextAssigneeIndex = (chore.currentAssigneeIndex + 1) % chore.rotationOrder.length
  const nextAssignee = chore.rotationOrder[nextAssigneeIndex]
  const member = members.find((m) => m.user_id === currentAssignee || m.id === currentAssignee)
  const memberName = member?.nickname || member?.profiles?.first_name || currentAssignee.slice(0, 8)
  const nextMember = members.find((m) => m.user_id === nextAssignee || m.id === nextAssignee)
  const nextMemberName = nextMember?.nickname || nextMember?.profiles?.first_name || ''

  // Completion rate based on actual chore logs (completed today = 100%, else 0%)
  const today = new Date().toISOString().split('T')[0]
  const completedToday = choreLogs.some((l) => l.choreId === chore.id && l.completedAt.startsWith(today))
  const completionPercent = chore.isPaused ? 0 : (completedToday ? 100 : 0)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className={`card-hover glass-card rounded-xl p-4 border border-[--border-subtle] bg-[--bg-surface] space-y-3 ${
        chore.isPaused ? 'opacity-60' : ''
      }`}
    >
      {/* Top row: icon, title, menu */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">{chore.icon}</span>
          <h3 className="text-sm font-semibold text-[--text-primary] truncate">{chore.title}</h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded-lg hover:bg-[--bg-surface-2] text-[--text-muted] transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[--bg-surface] border-[--border-subtle]">
            <DropdownMenuItem onClick={() => onEdit(chore)}>
              <Pencil className="size-3.5 mr-2" />
              {t.common.edit}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTogglePause(chore)}>
              {chore.isPaused ? <Play className="size-3.5 mr-2" /> : <Pause className="size-3.5 mr-2" />}
              {chore.isPaused ? t.chores.resume : t.chores.pause}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(chore)} className="text-red-400 focus:text-red-300">
              <Trash2 className="size-3.5 mr-2" />
              {t.common.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Current assignee + rotation indicator */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <PersonAvatar personId={currentAssignee} members={members} />
          <span className="text-sm text-[--text-secondary] truncate">{memberName}</span>
        </div>
        {chore.rotationOrder.length > 1 && nextMemberName && (
          <div className="flex items-center gap-1 text-[10px] text-[--text-muted] shrink-0">
            <ArrowRight className={`size-3 ${isRTL ? 'rotate-180' : ''}`} />
            <span className="truncate max-w-[60px]">{nextMemberName}</span>
          </div>
        )}
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${DIFFICULTY_STYLES[chore.difficulty]}`}>
          {t.chores[chore.difficulty]}
        </Badge>
        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${FREQUENCY_STYLES[chore.frequency]}`}>
          {t.chores[chore.frequency]}
        </Badge>
        <div className="flex items-center gap-1 text-[10px] text-[--text-muted] ml-auto">
          <Clock className="size-3" />
          {chore.estimatedMinutes}{t.chores.minutes}
        </div>
      </div>

      {/* Progress ring + Done button */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <ProgressRing percent={completionPercent} size={30} strokeWidth={3} />
          <span className="text-[10px] text-[--text-muted]">{completionPercent}%</span>
        </div>
        {!chore.isPaused && (
          <Button
            size="sm"
            onClick={() => onDone(chore)}
            className="bg-[#22C55E]/20 text-[#22C55E] hover:bg-[#22C55E]/30 border border-[#22C55E]/20 h-7 text-xs px-3"
          >
            <CheckCircle2 className="size-3 mr-1" />
            {t.chores.done}
          </Button>
        )}
        {chore.isPaused && (
          <Badge variant="outline" className="text-[10px] text-[--text-muted] border-[--border-subtle]">
            {t.chores.paused}
          </Badge>
        )}
      </div>
    </motion.div>
  )
}

// ─── Chore List Row ────────────────────────────────────────────────
function ChoreListRow({
  chore,
  members,
  onDone,
  onEdit,
  onDelete,
  onTogglePause,
}: {
  chore: Chore
  members: { id: string; user_id: string; nickname?: string | null; profiles?: { first_name?: string | null; last_name?: string | null } }[]
  onDone: (chore: Chore) => void
  onEdit: (chore: Chore) => void
  onDelete: (chore: Chore) => void
  onTogglePause: (chore: Chore) => void
}) {
  const { t, isRTL } = useI18n()
  const { choreLogs } = useChoreStore()
  const currentAssignee = chore.rotationOrder[chore.currentAssigneeIndex] || chore.assignedTo[0]
  const member = members.find((m) => m.user_id === currentAssignee || m.id === currentAssignee)
  const memberName = member?.nickname || member?.profiles?.first_name || currentAssignee.slice(0, 8)

  const lastLog = choreLogs
    .filter((l) => l.choreId === chore.id)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0]
  const lastDone = lastLog ? new Date(lastLog.completedAt).toLocaleDateString() : t.chores.never

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`flex items-center gap-4 px-4 py-3 rounded-xl border border-[--border-subtle] bg-[--bg-surface] card-hover ${
        chore.isPaused ? 'opacity-60' : ''
      }`}
    >
      {/* Icon + Title */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-lg shrink-0">{chore.icon}</span>
        <span className="text-sm font-medium text-[--text-primary] truncate">{chore.title}</span>
      </div>

      {/* Assigned To */}
      <div className="flex items-center gap-1.5 shrink-0">
        <PersonAvatar personId={currentAssignee} members={members} />
        <span className="text-xs text-[--text-secondary] hidden sm:inline">{memberName}</span>
      </div>

      {/* Frequency */}
      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 hidden md:inline-flex ${FREQUENCY_STYLES[chore.frequency]}`}>
        {t.chores[chore.frequency]}
      </Badge>

      {/* Difficulty */}
      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 hidden md:inline-flex ${DIFFICULTY_STYLES[chore.difficulty]}`}>
        {t.chores[chore.difficulty]}
      </Badge>

      {/* Last Done */}
      <span className="text-xs text-[--text-muted] hidden lg:inline shrink-0">{lastDone}</span>

      {/* Status */}
      <Badge
        variant="outline"
        className={`text-[10px] px-1.5 py-0 shrink-0 ${
          chore.isPaused
            ? 'text-emerald-400 border-emerald-500/20'
            : 'text-[#22C55E] border-[#22C55E]/20'
        }`}
      >
        {chore.isPaused ? t.chores.paused : t.chores.active}
      </Badge>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {!chore.isPaused && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDone(chore)}
            className="size-7 p-0 text-[#22C55E] hover:text-[#22C55E] hover:bg-[#22C55E]/10"
          >
            <CheckCircle2 className="size-4" />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onTogglePause(chore)}
          className="size-7 p-0 text-[--text-muted] hover:text-[--text-secondary]"
        >
          {chore.isPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="size-7 p-0 text-[--text-muted]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[--bg-surface] border-[--border-subtle]">
            <DropdownMenuItem onClick={() => onEdit(chore)}>
              <Pencil className="size-3.5 mr-2" />{t.common.edit}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(chore)} className="text-red-400">
              <Trash2 className="size-3.5 mr-2" />{t.common.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  )
}

// ─── Rotation Schedule Grid ────────────────────────────────────────
function RotationScheduleGrid({ chores, members }: { chores: Chore[]; members: { id: string; user_id: string; nickname?: string | null; profiles?: { first_name?: string | null; last_name?: string | null } }[] }) {
  const { t, isRTL } = useI18n()
  const days = isRTL
    ? ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = new Date()
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - today.getDay() + i)
    return d
  })

  const activeChores = chores.filter((c) => !c.isPaused)

  return (
    <div className="glass-card rounded-xl border border-[--border-subtle] bg-[--bg-surface] p-4 overflow-x-auto custom-scrollbar">
      <h3 className="text-sm font-semibold text-[--text-primary] mb-3 flex items-center gap-2">
        <CalendarDays className="size-4 text-[--accent-primary]" />
        {t.chores.rotationSchedule}
      </h3>
      <div className="min-w-[500px]">
        {/* Header row */}
        <div className="grid grid-cols-8 gap-1 mb-2">
          <div className="text-[10px] text-[--text-muted] font-medium px-1" />
          {days.map((day, i) => (
            <div
              key={day}
              className={`text-[10px] font-medium text-center px-1 py-1 rounded-lg ${
                weekDates[i].toDateString() === today.toDateString()
                  ? 'bg-[--accent-primary]/10 text-[--accent-primary]'
                  : 'text-[--text-muted]'
              }`}
            >
              {day}
            </div>
          ))}
        </div>
        {/* Chore rows */}
        {activeChores.slice(0, 6).map((chore) => {
          const assigneeForDay = (dayIndex: number) => {
            const rotIdx = (chore.currentAssigneeIndex + dayIndex) % chore.rotationOrder.length
            const uid = chore.rotationOrder[rotIdx]
            const m = members.find((m) => m.user_id === uid || m.id === uid)
            return m?.nickname || m?.profiles?.first_name || uid.slice(0, 2)
          }
          return (
            <div key={chore.id} className="grid grid-cols-8 gap-1 mb-1">
              <div className="flex items-center gap-1 px-1 py-1">
                <span className="text-xs">{chore.icon}</span>
                <span className="text-[10px] text-[--text-secondary] truncate">{chore.title}</span>
              </div>
              {Array.from({ length: 7 }, (_, i) => (
                <div
                  key={i}
                  className={`text-[10px] text-center py-1 rounded-lg ${
                    weekDates[i].toDateString() === today.toDateString()
                      ? 'bg-[--bg-surface-2]'
                      : ''
                  }`}
                >
                  <span className="text-[--text-muted]">{assigneeForDay(i)}</span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Leaderboard Section ───────────────────────────────────────────
function LeaderboardSection({ members }: { members: { id: string; user_id: string; nickname?: string | null; profiles?: { first_name?: string | null; last_name?: string | null } }[] }) {
  const { t, isRTL } = useI18n()
  const { getLeaderboard, choreLogs } = useChoreStore()
  const leaderboard = getLeaderboard()

  // If no data yet, generate from logs
  const displayData = leaderboard.length > 0
    ? leaderboard
    : members.map((m) => {
        const count = choreLogs.filter((l) => l.completedBy === m.user_id).length
        return { personId: m.user_id, count }
      }).sort((a, b) => b.count - a.count)

  const maxCount = Math.max(...displayData.map((d) => d.count), 1)

  return (
    <div className="glass-card rounded-xl border border-[--border-subtle] bg-[--bg-surface] p-4">
      <h3 className="text-sm font-semibold text-[--text-primary] mb-3 flex items-center gap-2">
        <Trophy className="size-4 text-emerald-400" />
        {t.chores.leaderboard}
        <span className="text-[10px] text-[--text-muted] font-normal ml-1">{t.chores.thisWeek}</span>
      </h3>
      <div className="space-y-3">
        {displayData.map((entry, idx) => {
          const member = members.find((m) => m.user_id === entry.personId || m.id === entry.personId)
          const name = member?.nickname || member?.profiles?.first_name || entry.personId.slice(0, 8)
          const pct = maxCount > 0 ? (entry.count / maxCount) * 100 : 0

          return (
            <div key={entry.personId} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${idx === 0 ? 'text-emerald-400' : idx === 1 ? 'text-[--text-muted]' : 'text-[--text-muted]'}`}>
                    #{idx + 1}
                  </span>
                  <PersonAvatar personId={entry.personId} members={members} size="md" />
                  <span className="text-sm text-[--text-secondary]">{name}</span>
                </div>
                <span className="text-xs text-[--text-muted]">
                  {entry.count} {t.chores.completions}
                </span>
              </div>
              <Progress value={pct} className="h-1.5 bg-[--border-subtle]" />
            </div>
          )
        })}
        {displayData.length === 0 && (
          <p className="text-xs text-[--text-muted] text-center py-4">
            {t.chores.noChores}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Main Chores Page ──────────────────────────────────────────────
export default function ChoresPage() {
  const { t, isRTL } = useI18n()
  // Selector-based subscriptions to avoid unnecessary re-renders
  const chores = useChoreStore((s) => s.chores)
  const choreLogs = useChoreStore((s) => s.choreLogs)
  const fetchFromSupabase = useChoreStore((s) => s.fetchFromSupabase)
  const removeChoreFromSupabase = useChoreStore((s) => s.removeChoreFromSupabase)
  const logCompletionToSupabase = useChoreStore((s) => s.logCompletionToSupabase)
  const rotateChore = useChoreStore((s) => s.rotateChore)
  const pauseChore = useChoreStore((s) => s.pauseChore)
  const resumeChore = useChoreStore((s) => s.resumeChore)
  const updateChoreInSupabase = useChoreStore((s) => s.updateChoreInSupabase)
  const familyMembers = useAppStore((s) => s.familyMembers)
  const currentFamily = useAppStore((s) => s.currentFamily)
  const user = useAuthStore((s) => s.user)

  // Fetch data from Supabase on mount
  const hasFetchedRef = useRef(false)
  useEffect(() => {
    if (!currentFamily?.id || !user?.id) return
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true

    fetchFromSupabase(currentFamily.id, user.id).catch((err) => {
      console.warn('[ChoresPage] Initial fetch failed:', err)
    })
  }, [currentFamily?.id, user?.id, fetchFromSupabase])

  // Re-fetch when family changes
  const prevFamilyRef = useRef(currentFamily?.id)
  useEffect(() => {
    if (!currentFamily?.id || !user?.id) return
    if (prevFamilyRef.current === currentFamily.id) return
    prevFamilyRef.current = currentFamily.id

    fetchFromSupabase(currentFamily.id, user.id).catch((err) => {
      console.warn('[ChoresPage] Re-fetch on family change failed:', err)
    })
  }, [currentFamily?.id, user?.id, fetchFromSupabase])

  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingChore, setEditingChore] = useState<Chore | null>(null)

  const members = familyMembers

  // Filtered chores
  const filteredChores = useMemo(() => {
    let result = [...chores]
    switch (filter) {
      case 'active':
        result = result.filter((c) => !c.isPaused)
        break
      case 'paused':
        result = result.filter((c) => c.isPaused)
        break
      case 'completed': {
        const today = new Date().toISOString().split('T')[0]
        const todayChoreIds = choreLogs
          .filter((l) => l.completedAt.startsWith(today))
          .map((l) => l.choreId)
        result = result.filter((c) => todayChoreIds.includes(c.id))
        break
      }
    }
    return result
  }, [chores, filter, choreLogs])

  // Group by frequency for board view
  const choresByFrequency = useMemo(() => {
    const groups: Record<string, Chore[]> = {
      daily: [],
      weekly: [],
      biweekly: [],
      monthly: [],
    }
    filteredChores.forEach((c) => {
      if (groups[c.frequency]) groups[c.frequency].push(c)
    })
    return groups
  }, [filteredChores])

  // Stats
  const totalChores = chores.length
  const today = new Date().toISOString().split('T')[0]
  const completedToday = choreLogs.filter((l) => l.completedAt.startsWith(today)).length
  const completionRate = useChoreStore.getState().getCompletionRate()
  const leaderboardData = useChoreStore.getState().getLeaderboard()
  const topContributorId = leaderboardData[0]?.personId
  const topContributor = members.find((m) => m.user_id === topContributorId || m.id === topContributorId)
  const topContributorName = topContributor?.nickname || topContributor?.profiles?.first_name || '—'

  // Handlers
  const handleDone = useCallback(async (chore: Chore) => {
    const currentAssignee = chore.rotationOrder[chore.currentAssigneeIndex] || chore.assignedTo[0]
    await logCompletionToSupabase({
      id: crypto.randomUUID(),
      choreId: chore.id,
      completedBy: currentAssignee,
      completedAt: new Date().toISOString(),
    })
    // Update chore rotation in Supabase
    const familyId = currentFamily?.id || 'demo-family-001'
    const nextIndex = chore.rotationOrder.length > 0 ? (chore.currentAssigneeIndex + 1) % chore.rotationOrder.length : 0
    rotateChore(chore.id)
    updateChoreInSupabase(chore.id, { currentAssigneeIndex: nextIndex, lastRotatedAt: new Date().toISOString() }, familyId)
    toast.success(t.chores.choreCompleted)
  }, [logCompletionToSupabase, rotateChore, updateChoreInSupabase, currentFamily?.id, t])

  const handleEdit = useCallback((chore: Chore) => {
    setEditingChore(chore)
    setDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async (chore: Chore) => {
    if (confirm(t.chores.confirmDelete)) {
      await removeChoreFromSupabase(chore.id)
    }
  }, [removeChoreFromSupabase, t])

  const handleTogglePause = useCallback((chore: Chore) => {
    const familyId = currentFamily?.id || 'demo-family-001'
    if (chore.isPaused) {
      resumeChore(chore.id)
      updateChoreInSupabase(chore.id, { isPaused: false }, familyId)
    } else {
      pauseChore(chore.id)
      updateChoreInSupabase(chore.id, { isPaused: true }, familyId)
    }
  }, [pauseChore, resumeChore, updateChoreInSupabase, currentFamily?.id])

  const handleAddNew = useCallback(() => {
    setEditingChore(null)
    setDialogOpen(true)
  }, [])

  // Empty state
  if (chores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[--accent-primary]/10 mb-2">
            <Sparkles className="w-10 h-10 text-[--accent-primary]" />
          </div>
          <h2 className="text-xl font-semibold text-[--text-primary]">{t.chores.noChores}</h2>
          <p className="text-sm text-[--text-muted] max-w-sm">{t.chores.noChoresDesc}</p>
          <Button
            onClick={handleAddNew}
            className="relative z-10 bg-[--accent-primary] hover:bg-[--accent-primary]/90 text-white mt-2"
          >
            <Plus className="size-4 mr-2" />
            {t.chores.addChore}
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-heading-2 font-display text-[--text-primary]">{t.chores.title}</h2>
          <p className="text-sm text-[--text-muted] mt-0.5">
            {totalChores} {t.chores.totalChores.toLowerCase()}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter tabs */}
          <div className="flex items-center bg-[--bg-surface] border border-[--border-subtle] rounded-xl p-0.5 gap-0.5">
            {(['all', 'active', 'paused', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                  filter === f
                    ? 'bg-[--accent-primary]/15 text-[--accent-primary]'
                    : 'text-[--text-muted] hover:text-[--text-secondary]'
                }`}
              >
                {t.chores[f]}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-[--bg-surface] border border-[--border-subtle] rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                viewMode === 'board'
                  ? 'bg-[--accent-primary]/15 text-[--accent-primary]'
                  : 'text-[--text-muted]'
              }`}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                viewMode === 'list'
                  ? 'bg-[--accent-primary]/15 text-[--accent-primary]'
                  : 'text-[--text-muted]'
              }`}
            >
              <List className="size-4" />
            </button>
          </div>

          {/* Add Chore */}
          <AddChoreDialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open)
              if (!open) setEditingChore(null)
            }}
            editingChore={editingChore}
            members={members}
          />
          <Button onClick={handleAddNew} size="sm" className="relative z-10 bg-[--accent-primary] hover:bg-[--accent-primary]/90 text-white">
            <Plus className="size-4 mr-1.5" />
            {t.chores.addChore}
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="stat-card-wrapper glass-card rounded-xl border border-[--border-subtle] bg-[--bg-surface] p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="size-4 text-[--accent-primary]" />
            <span className="text-[10px] text-[--text-muted] font-medium uppercase tracking-wide">{t.chores.totalChores}</span>
          </div>
          <span className="text-2xl font-bold text-[--text-primary]">{totalChores}</span>
        </div>
        <div className="stat-card-wrapper glass-card rounded-xl border border-[--border-subtle] bg-[--bg-surface] p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="size-4 text-[#22C55E]" />
            <span className="text-[10px] text-[--text-muted] font-medium uppercase tracking-wide">{t.chores.completedToday}</span>
          </div>
          <span className="text-2xl font-bold text-[--text-primary]">{completedToday}</span>
        </div>
        <div className="stat-card-wrapper glass-card rounded-xl border border-[--border-subtle] bg-[--bg-surface] p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="size-4 text-[var(--accent-primary)]" />
            <span className="text-[10px] text-[--text-muted] font-medium uppercase tracking-wide">{t.chores.completionRate}</span>
          </div>
          <span className="text-2xl font-bold text-[--text-primary]">{completionRate}%</span>
        </div>
        <div className="stat-card-wrapper glass-card rounded-xl border border-[--border-subtle] bg-[--bg-surface] p-4">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="size-4 text-emerald-400" />
            <span className="text-[10px] text-[--text-muted] font-medium uppercase tracking-wide">{t.chores.topContributor}</span>
          </div>
          <span className="text-lg font-bold text-[--text-primary] truncate">{topContributorName}</span>
        </div>
      </div>

      {/* Rotation Schedule Grid */}
      <RotationScheduleGrid chores={chores} members={members} />

      {/* Board View or List View */}
      {viewMode === 'board' ? (
        <div className="space-y-6">
          {(['daily', 'weekly', 'monthly'] as const).map((freq) => {
            const freqChores = choresByFrequency[freq]
            if (freqChores.length === 0) return null
            return (
              <div key={freq}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className={`text-xs px-2 py-0.5 ${FREQUENCY_STYLES[freq]}`}>
                    {t.chores[freq]}
                  </Badge>
                  <span className="text-xs text-[--text-muted]">{freqChores.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <AnimatePresence mode="popLayout">
                    {freqChores.map((chore) => (
                      <ChoreCard
                        key={chore.id}
                        chore={chore}
                        members={members}
                        onDone={handleDone}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onTogglePause={handleTogglePause}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )
          })}
          {choresByFrequency.biweekly.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className={`text-xs px-2 py-0.5 ${FREQUENCY_STYLES.biweekly}`}>
                  {t.chores.biweekly}
                </Badge>
                <span className="text-xs text-[--text-muted]">{choresByFrequency.biweekly.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <AnimatePresence mode="popLayout">
                  {choresByFrequency.biweekly.map((chore) => (
                    <ChoreCard
                      key={chore.id}
                      chore={chore}
                      members={members}
                      onDone={handleDone}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onTogglePause={handleTogglePause}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filteredChores.map((chore) => (
              <ChoreListRow
                key={chore.id}
                chore={chore}
                members={members}
                onDone={handleDone}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onTogglePause={handleTogglePause}
              />
            ))}
          </AnimatePresence>
          {filteredChores.length === 0 && (
            <div className="text-center py-8 text-[--text-muted] text-sm">{t.chores.noChores}</div>
          )}
        </div>
      )}

      {/* Rotation Preview + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl border border-[--border-subtle] bg-[--bg-surface] p-4">
          <h3 className="text-sm font-semibold text-[--text-primary] mb-3 flex items-center gap-2">
            <Users className="size-4 text-[--accent-primary]" />
            {t.chores.rotationPreview}
            <span className="text-[10px] text-[--text-muted] font-normal">{t.chores.nextTwoWeeks}</span>
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {chores.filter((c) => !c.isPaused && c.rotationOrder.length > 1).map((chore) => {
              const rotations = Array.from({ length: 14 }, (_, i) => {
                const idx = (chore.currentAssigneeIndex + i) % chore.rotationOrder.length
                const uid = chore.rotationOrder[idx]
                const m = members.find((mm) => mm.user_id === uid || mm.id === uid)
                return m?.nickname || m?.profiles?.first_name || uid.slice(0, 2)
              })
              const week1 = rotations.slice(0, 7)
              const week2 = rotations.slice(7, 14)
              return (
                <div key={chore.id} className="flex items-center gap-2 text-[10px]">
                  <span className="shrink-0">{chore.icon}</span>
                  <span className="text-[--text-secondary] font-medium w-24 truncate shrink-0">{chore.title}</span>
                  <div className="flex items-center gap-0.5 flex-1 overflow-hidden">
                    {week1.map((name, i) => (
                      <span
                        key={i}
                        className="px-1 py-0.5 rounded bg-[--bg-surface-2] text-[--text-muted] whitespace-nowrap"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
            {chores.filter((c) => !c.isPaused && c.rotationOrder.length > 1).length === 0 && (
              <p className="text-xs text-[--text-muted] text-center py-4">{t.chores.noChores}</p>
            )}
          </div>
        </div>

        <LeaderboardSection members={members} />
      </div>
    </div>
  )
}
