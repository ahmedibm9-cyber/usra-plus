'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { List, Pause, ArrowRight, MoreVert } from '@mui/icons-material'
import { Plus, LayoutGrid, Play, CheckCircle2, Trash2, Pencil, Sparkles, Clock, Trophy, Users, BarChart3, CalendarDays } from 'lucide-react'
import {
  Container,
  Stack,
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  LinearProgress,
  Avatar,
  Menu,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Divider,
  Checkbox,
  FormControlLabel,
  useTheme,
} from '@mui/material'
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

// ─── Difficulty chip colors ───────────────────────────────────────
const DIFFICULTY_COLOR = {
  easy: 'success' as const,
  medium: 'warning' as const,
  hard: 'error' as const,
}

// ─── Frequency chip colors ────────────────────────────────────────
const FREQUENCY_COLOR = {
  daily: 'primary' as const,
  weekly: 'primary' as const,
  biweekly: 'primary' as const,
  monthly: 'secondary' as const,
}

// ─── Progress Ring Component ───────────────────────────────────────
function ProgressRing({ percent, size = 36, strokeWidth = 3 }: { percent: number; size?: number; strokeWidth?: number }) {
  const theme = useTheme()
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percent / 100) * circumference

  return (
    <Box sx={{ transform: 'rotate(-90deg)' }} component="svg" width={size} height={size}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={theme.palette.divider}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={theme.palette.primary.main}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        sx={{ transition: 'all 0.5s' }}
      />
    </Box>
  )
}

// ─── Person Avatar Helper ──────────────────────────────────────────
function PersonAvatar({ personId, members, size = 'small' }: { personId: string; members: { id: string; user_id: string; nickname?: string | null; profiles?: { first_name?: string | null; last_name?: string | null } }[]; size?: 'small' | 'medium' }) {
  const theme = useTheme()
  const member = members.find((m) => m.user_id === personId || m.id === personId)
  const name = member?.nickname || member?.profiles?.first_name || personId.slice(0, 2)

  const avatarColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
  ]
  const idx = members.findIndex((m) => m.user_id === personId || m.id === personId)
  const bgColor = avatarColors[idx >= 0 ? idx % avatarColors.length : 0]

  return (
    <Avatar sx={{ width: size === 'small' ? 24 : 32, height: size === 'small' ? 24 : 32, bgcolor: bgColor, fontSize: size === 'small' ? 10 : 12, fontWeight: 600 }}>
      {name.charAt(0).toUpperCase()}
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
  const formKey = `${open}-${editingChore?.id ?? 'new'}`

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="sm" fullWidth dir={isRTL ? 'rtl' : 'ltr'}>
      <DialogTitle>{editingChore ? t.chores.editChore : t.chores.addChore}</DialogTitle>
      <AddChoreForm
        key={formKey}
        editingChore={editingChore}
        members={members}
        onSave={() => onOpenChange(false)}
      />
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
  const theme = useTheme()
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
      <DialogContent sx={{ p: 2, maxHeight: '70vh', overflowY: 'auto' }}>
        <Stack spacing={2.5}>
          {/* Icon Selector */}
          <Stack spacing={1}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t.chores.selectIcon}</Typography>
            <Stack sx={{ flexDirection: 'row' }} flexWrap="wrap" spacing={1} useFlexGap>
              {CHORE_ICONS.map((ic) => (
                <IconButton
                  key={ic.emoji + ic.label}
                  onClick={() => setIcon(ic.emoji)}
                  sx={{
                    fontSize: 20,
                    p: 1,
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    ...(icon === ic.emoji
                      ? { bgcolor: `${theme.palette.primary.main}20`, outline: `2px solid ${theme.palette.primary.main}80`, transform: 'scale(1.1)' }
                      : { bgcolor: theme.palette.action.hover, '&:hover': { bgcolor: theme.palette.action.selected } }),
                  }}
                >
                  {ic.emoji}
                </IconButton>
              ))}
            </Stack>
          </Stack>

          {/* Title */}
          <Stack spacing={1}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t.chores.choreTitle}</Typography>
            <TextField
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isRTL ? 'مثال: غسل الأطباق' : 'e.g. Wash Dishes'}
              size="small"
              fullWidth
            />
          </Stack>

          {/* Description */}
          <Stack spacing={1}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t.chores.description}</Typography>
            <TextField
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isRTL ? 'وصف اختياري' : 'Optional description'}
              size="small"
              fullWidth
            />
          </Stack>

          {/* Frequency + Difficulty Row */}
          <Stack sx={{ flexDirection: 'row' }} spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>{t.chores.frequency}</InputLabel>
              <Select value={frequency} label={t.chores.frequency} onChange={(e) => setFrequency(e.target.value as Chore['frequency'])}>
                <MenuItem value="daily">{t.chores.daily}</MenuItem>
                <MenuItem value="weekly">{t.chores.weekly}</MenuItem>
                <MenuItem value="biweekly">{t.chores.biweekly}</MenuItem>
                <MenuItem value="monthly">{t.chores.monthly}</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>{t.chores.difficulty}</InputLabel>
              <Select value={difficulty} label={t.chores.difficulty} onChange={(e) => setDifficulty(e.target.value as Chore['difficulty'])}>
                <MenuItem value="easy">{t.chores.easy}</MenuItem>
                <MenuItem value="medium">{t.chores.medium}</MenuItem>
                <MenuItem value="hard">{t.chores.hard}</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {/* Estimated Minutes */}
          <Stack spacing={1}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t.chores.estimatedMinutes}</Typography>
            <TextField
              type="number"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 0)}
              size="small"
              fullWidth
              inputProps={{ min: 1 }}
            />
          </Stack>

          {/* Assignees */}
          <Stack spacing={1}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t.chores.selectAssignees}</Typography>
            <Stack sx={{ flexDirection: 'row' }} flexWrap="wrap" spacing={1} useFlexGap>
              {members.map((member) => {
                const userId = member.user_id
                const name = member.nickname || member.profiles?.first_name || userId.slice(0, 8)
                const isSelected = selectedAssignees.includes(userId)
                return (
                  <Chip
                    key={member.id}
                    label={name}
                    onClick={() => toggleAssignee(userId)}
                    variant={isSelected ? 'filled' : 'outlined'}
                    color={isSelected ? 'primary' : 'default'}
                    sx={{ cursor: 'pointer' }}
                  />
                )
              })}
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onSave} color="inherit">{t.common.cancel}</Button>
        <Button onClick={handleSave} variant="contained" fullWidth>
          {isEditing ? t.common.save : t.common.add}
        </Button>
      </DialogActions>
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
  const theme = useTheme()
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const choreLogs = useChoreStore(s => s.choreLogs)
  const currentAssignee = chore.rotationOrder[chore.currentAssigneeIndex] || chore.assignedTo[0]
  const nextAssigneeIndex = (chore.currentAssigneeIndex + 1) % chore.rotationOrder.length
  const nextAssignee = chore.rotationOrder[nextAssigneeIndex]
  const member = members.find((m) => m.user_id === currentAssignee || m.id === currentAssignee)
  const memberName = member?.nickname || member?.profiles?.first_name || currentAssignee.slice(0, 8)
  const nextMember = members.find((m) => m.user_id === nextAssignee || m.id === nextAssignee)
  const nextMemberName = nextMember?.nickname || nextMember?.profiles?.first_name || ''

  const today = new Date().toISOString().split('T')[0]
  const completedToday = choreLogs.some((l) => l.choreId === chore.id && l.completedAt.startsWith(today))
  const completionPercent = chore.isPaused ? 0 : (completedToday ? 100 : 0)

  return (
    <Card sx={{ opacity: chore.isPaused ? 0.6 : 1 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Top row: icon, title, menu */}
        <Stack sx={{ flexDirection: 'row' }} justifyContent="space-between" alignItems="flex-start">
          <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }} sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: 18, flexShrink: 0 }}>{chore.icon}</Typography>
            <Typography variant="body2" fontWeight={600} noWrap>{chore.title}</Typography>
          </Stack>
          <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <MoreVert fontSize="small" />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
            <MenuItem onClick={() => { onEdit(chore); setMenuAnchor(null) }}>
              <Pencil fontSize="small" sx={{ mr: 1.5 }} />
              {t.common.edit}
            </MenuItem>
            <MenuItem onClick={() => { onTogglePause(chore); setMenuAnchor(null) }}>
              {chore.isPaused ? <Play fontSize="small" sx={{ mr: 1.5 }} /> : <Pause fontSize="small" sx={{ mr: 1.5 }} />}
              {chore.isPaused ? t.chores.resume : t.chores.pause}
            </MenuItem>
            <MenuItem onClick={() => { onDelete(chore); setMenuAnchor(null) }} sx={{ color: theme.palette.error.main }}>
              <Trash2 fontSize="small" style={{ width: 14, height: 14, marginRight: 6 }} />
              {t.common.delete}
            </MenuItem>
          </Menu>
        </Stack>

        {/* Current assignee + rotation indicator */}
        <Stack sx={{ flexDirection: 'row' }} alignItems="center" justifyContent="space-between" sx={{ mt: 1.5 }}>
          <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }} sx={{ minWidth: 0 }}>
            <PersonAvatar personId={currentAssignee} members={members} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>{memberName}</Typography>
          </Stack>
          {chore.rotationOrder.length > 1 && nextMemberName && (
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 0.5 }} sx={{ flexShrink: 0 }}>
              <ArrowRight sx={{ fontSize: 12, transform: isRTL ? 'rotate(180deg)' : 'none' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap sx={{ maxWidth: 60 }}>{nextMemberName}</Typography>
            </Stack>
          )}
        </Stack>

        {/* Badges row */}
        <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 0.5 }} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
          <Chip label={t.chores[chore.difficulty]} size="small" color={DIFFICULTY_COLOR[chore.difficulty]} variant="outlined" sx={{ fontSize: 10, height: 20 }} />
          <Chip label={t.chores[chore.frequency]} size="small" color={FREQUENCY_COLOR[chore.frequency]} variant="outlined" sx={{ fontSize: 10, height: 20 }} />
          <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 0.5 }} sx={{ ml: 'auto !important' }}>
            <Clock sx={{ fontSize: 12 }} color="action" />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {chore.estimatedMinutes}{t.chores.minutes}
            </Typography>
          </Stack>
        </Stack>

        {/* Progress ring + Done button */}
        <Stack sx={{ flexDirection: 'row' }} alignItems="center" justifyContent="space-between" sx={{ mt: 1.5 }}>
          <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
            <ProgressRing percent={completionPercent} size={30} strokeWidth={3} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{completionPercent}%</Typography>
          </Stack>
          {!chore.isPaused && (
            <Button
              size="small"
              onClick={() => onDone(chore)}
              variant="outlined"
              sx={{ color: 'success.main' }}
              startIcon={<CheckCircle2 sx={{ fontSize: 14 }} />}
              sx={{ fontSize: 12, px: 1.5, py: 0.25, minHeight: 28 }}
            >
              {t.chores.done}
            </Button>
          )}
          {chore.isPaused && (
            <Chip label={t.chores.paused} size="small" variant="outlined" />
          )}
        </Stack>
      </CardContent>
    </Card>
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
  const theme = useTheme()
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const { choreLogs } = useChoreStore()
  const currentAssignee = chore.rotationOrder[chore.currentAssigneeIndex] || chore.assignedTo[0]
  const member = members.find((m) => m.user_id === currentAssignee || m.id === currentAssignee)
  const memberName = member?.nickname || member?.profiles?.first_name || currentAssignee.slice(0, 8)

  const lastLog = choreLogs
    .filter((l) => l.choreId === chore.id)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0]
  const lastDone = lastLog ? new Date(lastLog.completedAt).toLocaleDateString() : t.chores.never

  return (
    <Paper variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5, borderRadius: 2, opacity: chore.isPaused ? 0.6 : 1 }}>
      {/* Icon + Title */}
      <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }} sx={{ minWidth: 0, flex: 1 }}>
        <Typography sx={{ fontSize: 18, flexShrink: 0 }}>{chore.icon}</Typography>
        <Typography variant="body2" fontWeight={500} noWrap>{chore.title}</Typography>
      </Stack>

      {/* Assigned To */}
      <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 0.5 }} sx={{ flexShrink: 0 }}>
        <PersonAvatar personId={currentAssignee} members={members} />
        <Typography variant="caption" sx={{ color: 'text.secondary' }} sx={{ display: { xs: 'none', sm: 'inline' } }}>{memberName}</Typography>
      </Stack>

      {/* Frequency */}
      <Chip label={t.chores[chore.frequency]} size="small" color={FREQUENCY_COLOR[chore.frequency]} variant="outlined" sx={{ display: { xs: 'none', md: 'inline-flex' }, fontSize: 10, height: 20 }} />

      {/* Difficulty */}
      <Chip label={t.chores[chore.difficulty]} size="small" color={DIFFICULTY_COLOR[chore.difficulty]} variant="outlined" sx={{ display: { xs: 'none', md: 'inline-flex' }, fontSize: 10, height: 20 }} />

      {/* Last Done */}
      <Typography variant="caption" sx={{ color: 'text.secondary' }} sx={{ display: { xs: 'none', lg: 'inline' }, flexShrink: 0 }}>{lastDone}</Typography>

      {/* Status */}
      <Chip
        label={chore.isPaused ? t.chores.paused : t.chores.active}
        size="small"
        variant="outlined"
        color={chore.isPaused ? 'warning' : 'success'}
        sx={{ fontSize: 10, height: 20, flexShrink: 0 }}
      />

      {/* Actions */}
      <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 0 }} sx={{ flexShrink: 0 }}>
        {!chore.isPaused && (
          <Tooltip title={t.chores.done}>
            <IconButton size="small" sx={{ color: 'success.main' }} onClick={() => onDone(chore)}>
              <CheckCircle2 sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={chore.isPaused ? t.chores.resume : t.chores.pause}>
          <IconButton size="small" onClick={() => onTogglePause(chore)} color="inherit">
            {chore.isPaused ? <Play sx={{ fontSize: 14 }} /> : <Pause sx={{ fontSize: 14 }} />}
          </IconButton>
        </Tooltip>
        <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)} color="inherit">
          <MoreVert sx={{ fontSize: 14 }} />
        </IconButton>
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          <MenuItem onClick={() => { onEdit(chore); setMenuAnchor(null) }}>
            <Pencil fontSize="small" sx={{ mr: 1.5 }} />{t.common.edit}
          </MenuItem>
          <MenuItem onClick={() => { onDelete(chore); setMenuAnchor(null) }} sx={{ color: theme.palette.error.main }}>
            <Trash2 fontSize="small" style={{ width: 14, height: 14, marginRight: 6 }} />{t.common.delete}
          </MenuItem>
        </Menu>
      </Stack>
    </Paper>
  )
}

// ─── Rotation Schedule Grid ────────────────────────────────────────
function RotationScheduleGrid({ chores, members }: { chores: Chore[]; members: { id: string; user_id: string; nickname?: string | null; profiles?: { first_name?: string | null; last_name?: string | null } }[] }) {
  const { t, isRTL } = useI18n()
  const theme = useTheme()
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
    <Paper variant="outlined" sx={{ p: 2, overflowX: 'auto' }}>
      <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }} sx={{ mb: 1.5 }}>
        <CalendarDays sx={{ fontSize: 16, color: theme.palette.primary.main }} />
        <Typography variant="subtitle2">{t.chores.rotationSchedule}</Typography>
      </Stack>
      <Box sx={{ minWidth: 500 }}>
        {/* Header row */}
        <Stack sx={{ flexDirection: 'row' }} spacing={0} sx={{ mb: 1 }}>
          <Box sx={{ flex: '0 0 100px', px: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }} fontWeight={500}></Typography>
          </Box>
          {days.map((day, i) => (
            <Box key={i} sx={{ flex: 1, textAlign: 'center', px: 0.5, py: 0.5, borderRadius: 1, bgcolor: weekDates[i].toDateString() === today.toDateString() ? `${theme.palette.primary.main}15` : 'transparent' }}>
              <Typography variant="caption" fontWeight={500} color={weekDates[i].toDateString() === today.toDateString() ? 'primary' : 'text.secondary'}>
                {day}
              </Typography>
            </Box>
          ))}
        </Stack>
        {/* Chore rows */}
        {activeChores.slice(0, 6).map((chore) => {
          const assigneeForDay = (dayIndex: number) => {
            const rotIdx = (chore.currentAssigneeIndex + dayIndex) % chore.rotationOrder.length
            const uid = chore.rotationOrder[rotIdx]
            const m = members.find((m) => m.user_id === uid || m.id === uid)
            return m?.nickname || m?.profiles?.first_name || uid.slice(0, 2)
          }
          return (
            <Stack key={chore.id} direction="row" spacing={0} sx={{ mb: 0.25 }}>
              <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 0.5 }} sx={{ flex: '0 0 100px', px: 0.5, py: 0.5 }}>
                <Typography sx={{ fontSize: 12 }}>{chore.icon}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>{chore.title}</Typography>
              </Stack>
              {Array.from({ length: 7 }, (_, i) => (
                <Box key={i} sx={{ flex: 1, textAlign: 'center', py: 0.5, borderRadius: 1, bgcolor: weekDates[i].toDateString() === today.toDateString() ? theme.palette.action.hover : 'transparent' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{assigneeForDay(i)}</Typography>
                </Box>
              ))}
            </Stack>
          )
        })}
      </Box>
    </Paper>
  )
}

// ─── Leaderboard Section ───────────────────────────────────────────
function LeaderboardSection({ members }: { members: { id: string; user_id: string; nickname?: string | null; profiles?: { first_name?: string | null; last_name?: string | null } }[] }) {
  const { t } = useI18n()
  const theme = useTheme()
  const { getLeaderboard, choreLogs } = useChoreStore()
  const leaderboard = getLeaderboard()

  const displayData = leaderboard.length > 0
    ? leaderboard
    : members.map((m) => {
        const count = choreLogs.filter((l) => l.completedBy === m.user_id).length
        return { personId: m.user_id, count }
      }).sort((a, b) => b.count - a.count)

  const maxCount = Math.max(...displayData.map((d) => d.count), 1)

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }} sx={{ mb: 1.5 }}>
        <Trophy sx={{ fontSize: 16, color: theme.palette.success.main }} />
        <Typography variant="subtitle2">{t.chores.leaderboard}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }} sx={{ ml: 0.5 }}>{t.chores.thisWeek}</Typography>
      </Stack>
      <Stack spacing={1.5}>
        {displayData.map((entry, idx) => {
          const member = members.find((m) => m.user_id === entry.personId || m.id === entry.personId)
          const name = member?.nickname || member?.profiles?.first_name || entry.personId.slice(0, 8)
          const pct = maxCount > 0 ? (entry.count / maxCount) * 100 : 0

          return (
            <Box key={entry.personId}>
              <Stack sx={{ flexDirection: 'row' }} alignItems="center" justifyContent="space-between">
                <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight={700} color={idx === 0 ? 'success.main' : 'text.secondary'}>
                    #{idx + 1}
                  </Typography>
                  <PersonAvatar personId={entry.personId} members={members} size="medium" />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>{name}</Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {entry.count} {t.chores.completions}
                </Typography>
              </Stack>
              <LinearProgress variant="determinate" value={pct} sx={{ mt: 0.5, height: 6, borderRadius: 3 }} />
            </Box>
          )
        })}
        {displayData.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }} textAlign="center" sx={{ py: 2 }}>
            {t.chores.noChores}
          </Typography>
        )}
      </Stack>
    </Paper>
  )
}

// ─── Main Chores Page ──────────────────────────────────────────────
export default function ChoresPage() {
  const { t, isRTL } = useI18n()
  const theme = useTheme()
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

  const hasFetchedRef = useRef(false)
  useEffect(() => {
    if (!currentFamily?.id || !user?.id) return
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    fetchFromSupabase(currentFamily.id, user.id).catch((err) => {
      console.warn('[ChoresPage] Initial fetch failed:', err)
    })
  }, [currentFamily?.id, user?.id, fetchFromSupabase])

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

  const totalChores = chores.length
  const today = new Date().toISOString().split('T')[0]
  const completedToday = choreLogs.filter((l) => l.completedAt.startsWith(today)).length
  const completionRate = useChoreStore.getState().getCompletionRate()
  const leaderboardData = useChoreStore.getState().getLeaderboard()
  const topContributorId = leaderboardData[0]?.personId
  const topContributor = members.find((m) => m.user_id === topContributorId || m.id === topContributorId)
  const topContributorName = topContributor?.nickname || topContributor?.profiles?.first_name || '—'

  const handleDone = useCallback(async (chore: Chore) => {
    const currentAssignee = chore.rotationOrder[chore.currentAssigneeIndex] || chore.assignedTo[0]
    await logCompletionToSupabase({
      id: crypto.randomUUID(),
      choreId: chore.id,
      completedBy: currentAssignee,
      completedAt: new Date().toISOString(),
    })
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

  if (chores.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }} dir={isRTL ? 'rtl' : 'ltr'}>
        <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
          <Stack alignItems="center" spacing={2}>
            <Box sx={{ width: 80, height: 80, borderRadius: 3, bgcolor: `${theme.palette.primary.main}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
              <Sparkles sx={{ fontSize: 40, color: theme.palette.primary.main }} />
            </Box>
            <Typography variant="h6" fontWeight={600}>{t.chores.noChores}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }} textAlign="center" sx={{ maxWidth: 400 }}>{t.chores.noChoresDesc}</Typography>
            <Button variant="contained" startIcon={<Plus />} onClick={handleAddNew} sx={{ mt: 1 }}>
              {t.chores.addChore}
            </Button>
          </Stack>
        </Stack>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }} dir={isRTL ? 'rtl' : 'ltr'}>
      <Stack spacing={3}>
        {/* Header */}
        <Stack sx={{ flexDirection: 'row' }} justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>{t.chores.title}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }} sx={{ mt: 0.5 }}>
              {totalChores} {t.chores.totalChores.toLowerCase()}
            </Typography>
          </Box>

          <Stack sx={{ flexDirection: 'row' }} spacing={1} alignItems="center">
            {/* Filter tabs */}
            <Paper variant="outlined" sx={{ display: 'flex', p: 0.25, gap: 0.25, borderRadius: 2 }}>
              {(['all', 'active', 'paused', 'completed'] as const).map((f) => (
                <Button
                  key={f}
                  size="small"
                  onClick={() => setFilter(f)}
                  variant={filter === f ? 'contained' : 'text'}
                  sx={{ fontSize: 12, px: 1.5, py: 0.25, borderRadius: 1.5, textTransform: 'none' }}
                >
                  {t.chores[f]}
                </Button>
              ))}
            </Paper>

            {/* View toggle */}
            <Paper variant="outlined" sx={{ display: 'flex', p: 0.25, borderRadius: 2 }}>
              <IconButton size="small" onClick={() => setViewMode('board')} color={viewMode === 'board' ? 'primary' : 'default'} sx={{ borderRadius: 1.5 }}>
                <LayoutGrid sx={{ fontSize: 16 }} />
              </IconButton>
              <IconButton size="small" onClick={() => setViewMode('list')} color={viewMode === 'list' ? 'primary' : 'default'} sx={{ borderRadius: 1.5 }}>
                <List sx={{ fontSize: 16 }} />
              </IconButton>
            </Paper>

            <Button variant="contained" size="small" startIcon={<Plus sx={{ fontSize: 16 }} />} onClick={handleAddNew}>
              {t.chores.addChore}
            </Button>
          </Stack>
        </Stack>

        {/* Stats */}
        <Stack sx={{ flexDirection: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
          {[
            { label: t.chores.totalChores, value: totalChores, icon: <BarChart3 sx={{ fontSize: 20 }} />, color: theme.palette.primary.main },
            { label: t.chores.completedToday, value: completedToday, icon: <CheckCircle2 sx={{ fontSize: 20 }} />, color: theme.palette.success.main },
            { label: t.chores.completionRate, value: `${completionRate}%`, icon: <Trophy sx={{ fontSize: 20 }} />, color: theme.palette.secondary.main },
            { label: t.chores.topContributor, value: topContributorName, icon: <Users sx={{ fontSize: 20 }} />, color: theme.palette.warning.main },
          ].map((stat) => (
            <Paper key={stat.label} variant="outlined" sx={{ flex: '1 1 140px', p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                {stat.icon}
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={700}>{stat.value}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{stat.label}</Typography>
              </Box>
            </Paper>
          ))}
        </Stack>

        {/* Board View */}
        {viewMode === 'board' && (
          <Stack spacing={3}>
            {(['daily', 'weekly', 'biweekly', 'monthly'] as const).map((freq) => {
              const group = choresByFrequency[freq]
              if (!group || group.length === 0) return null
              return (
                <Box key={freq}>
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary' }} sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {t.chores[freq]}
                  </Typography>
                  <Stack sx={{ flexDirection: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
                    {group.map((chore) => (
                      <Box key={chore.id} sx={{ flex: '1 1 280px', maxWidth: 360 }}>
                        <ChoreCard
                          chore={chore}
                          members={members}
                          onDone={handleDone}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onTogglePause={handleTogglePause}
                        />
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )
            })}
          </Stack>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <Stack spacing={1}>
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
            {filteredChores.length === 0 && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }} textAlign="center" sx={{ py: 4 }}>
                {t.chores.noChores}
              </Typography>
            )}
          </Stack>
        )}

        {/* Rotation Schedule */}
        <RotationScheduleGrid chores={chores} members={members} />

        {/* Leaderboard */}
        <LeaderboardSection members={members} />
      </Stack>

      {/* Add/Edit Dialog */}
      <AddChoreDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingChore(null)
        }}
        editingChore={editingChore}
        members={members}
      />
    </Container>
  )
}
