'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTaskStore } from '@/stores/task-store'
import { useAppStore } from '@/stores/app-store'
import { useAuthStore } from '@/stores/auth-store'
import { useI18n } from '@/i18n/use-translation'
import type { Task, TaskPriority, TaskStatus, FamilyMember } from '@/types'
import { format, isToday, isTomorrow, isPast, isThisWeek, formatDistanceToNow, parseISO } from 'date-fns'
import { toast } from 'sonner'
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
  Checkbox,
  Avatar,
  Tooltip,
  Tabs,
  Tab,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  LinearProgress,
  useTheme,
  useMediaQuery,
  Fab,
  InputAdornment,
} from '@mui/material'
import {
  Add,
  Search,
  SwapVert,
  CalendarToday,
  CheckCircle,
  RadioButtonUnchecked,
  AccessTime,
  Edit,
  Delete,
  ChatBubbleOutlined,
  Send,
  PlaylistAddCheck,
  GridView,
  ViewList,
  Warning,
  Person,
} from '@mui/icons-material'

// ─── Priority Config ────────────────────────────────────────────────
const PRIORITY_CONFIG: Record<TaskPriority, { chipColor: 'error' | 'primary' | 'secondary' | 'success'; label: string }> = {
  urgent: { chipColor: 'error', label: 'Urgent' },
  high: { chipColor: 'primary', label: 'High' },
  medium: { chipColor: 'secondary', label: 'Medium' },
  low: { chipColor: 'success', label: 'Low' },
}

const STATUS_CONFIG: Record<TaskStatus, { chipColor: 'default' | 'primary' | 'success'; label: string }> = {
  todo: { chipColor: 'default', label: 'To Do' },
  in_progress: { chipColor: 'primary', label: 'In Progress' },
  done: { chipColor: 'success', label: 'Done' },
}

// ─── Date Grouping ──────────────────────────────────────────────────
type DateGroup = 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'later' | 'no_date'

function getDateGroup(task: Task): DateGroup {
  if (!task.due_date) return 'no_date'
  const date = parseISO(task.due_date)
  if (task.status !== 'done' && isPast(date) && !isToday(date)) return 'overdue'
  if (isToday(date)) return 'today'
  if (isTomorrow(date)) return 'tomorrow'
  if (isThisWeek(date)) return 'this_week'
  return 'later'
}

const DATE_GROUP_ORDER: DateGroup[] = ['overdue', 'today', 'tomorrow', 'this_week', 'later', 'no_date']

const DATE_GROUP_CONFIG: Record<DateGroup, { label: string; color: 'error' | 'primary' | 'primary' | 'secondary' | 'text.secondary' | 'text.secondary' }> = {
  overdue: { label: 'Overdue', color: 'error' },
  today: { label: 'Today', color: 'primary' },
  tomorrow: { label: 'Tomorrow', color: 'primary' },
  this_week: { label: 'This Week', color: 'secondary' },
  later: { label: 'Later', color: 'text.secondary' },
  no_date: { label: 'No Due Date', color: 'text.secondary' },
}

// ─── Task Form Type ─────────────────────────────────────────────────
interface TaskFormData {
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  assigned_to: string
  due_date: Date | undefined
}

const EMPTY_FORM: TaskFormData = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'todo',
  assigned_to: '',
  due_date: undefined,
}

// ─── Relative Time Helper ──────────────────────────────────────────
function getRelativeTime(dateStr: string, isRTL: boolean): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (isRTL) {
    if (diffMin < 1) return 'الآن'
    if (diffMin < 60) return `${diffMin}د`
    if (diffHr < 24) return `${diffHr}س`
    if (diffDay < 7) return `${diffDay}ي`
    return format(date, 'MMM d')
  }
  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m`
  if (diffHr < 24) return `${diffHr}h`
  if (diffDay < 7) return `${diffDay}d`
  return format(date, 'MMM d')
}

// ─── Task Card Component ────────────────────────────────────────────
function TaskCardComponent({
  task,
  onToggleDone,
  onEdit,
  onDelete,
}: {
  task: Task
  onToggleDone: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}) {
  const theme = useTheme()
  const priority = PRIORITY_CONFIG[task.priority]
  const statusCfg = STATUS_CONFIG[task.status]
  const isOverdue = task.due_date && task.status !== 'done' && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date))
  const isDone = task.status === 'done'

  const dueDateLabel = useMemo(() => {
    if (!task.due_date) return null
    const date = parseISO(task.due_date)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    if (isPast(date) && !isToday(date)) return formatDistanceToNow(date, { addSuffix: true })
    return format(date, 'MMM d')
  }, [task.due_date])

  const assigneeInitials = useMemo(() => {
    if (!task.assignee) return '?'
    const first = task.assignee.first_name?.[0] || ''
    const last = task.assignee.last_name?.[0] || ''
    return (first + last).toUpperCase() || '?'
  }, [task.assignee])

  return (
    <Card sx={{ opacity: isDone ? 0.6 : 1, transition: 'all 0.2s', '&:hover': { boxShadow: theme.shadows[4] } }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        {/* Checkbox */}
        <IconButton
          size="small"
          onClick={() => onToggleDone(task)}
          aria-label={isDone ? `Mark ${task.title} as incomplete` : `Mark ${task.title} as complete`}
          sx={{ mt: 0.25, p: 0.5 }}
        >
          {isDone ? (
            <CheckCircle sx={{ fontSize: 20, color: 'success.main' }} />
          ) : (
            <RadioButtonUnchecked sx={{ fontSize: 20, color: 'text.disabled' }} />
          )}
        </IconButton>

        {/* Content */}
        <Stack sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap" useFlexGap>
            <Typography
              variant="body2"
              fontWeight={500}
              noWrap
              sx={{
                ...(isDone && { textDecoration: 'line-through', color: 'text.disabled' }),
              }}
            >
              {task.title}
            </Typography>
            <Chip label={priority.label} size="small" color={priority.chipColor} variant="outlined" sx={{ fontSize: 10, height: 20 }} />
          </Stack>

          {task.description && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {task.description}
            </Typography>
          )}

          <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            <Chip
              icon={task.status === 'in_progress' ? <AccessTime sx={{ fontSize: 12 }} /> : task.status === 'done' ? <CheckCircle sx={{ fontSize: 12 }} /> : <RadioButtonUnchecked sx={{ fontSize: 12 }} />}
              label={statusCfg.label}
              size="small"
              variant="outlined"
              color={statusCfg.chipColor}
              sx={{ fontSize: 10, height: 20 }}
            />

            {task.due_date && (
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: isOverdue ? 'error.main' : 'text.secondary' }}>
                <CalendarToday sx={{ fontSize: 12 }} />
                <Typography variant="caption">{dueDateLabel}</Typography>
                {isOverdue && <Warning sx={{ fontSize: 12, color: 'error.main' }} />}
              </Stack>
            )}

            {task.assignee && (
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ ml: 'auto !important' }}>
                <Avatar sx={{ width: 20, height: 20, fontSize: 9, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                  {assigneeInitials}
                </Avatar>
                <Typography variant="caption" color="text.secondary">
                  {task.assignee.first_name || task.assignee.email?.split('@')[0]}
                </Typography>
              </Stack>
            )}
          </Stack>
        </Stack>

        {/* Action buttons */}
        <Stack direction="row" spacing={0} sx={{ flexShrink: 0 }}>
          <IconButton size="small" onClick={() => onEdit(task)} aria-label="Edit task">
            <Edit sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton size="small" onClick={() => onDelete(task.id)} aria-label="Delete task" color="error">
            <Delete sx={{ fontSize: 16 }} />
          </IconButton>
        </Stack>
      </CardContent>
    </Card>
  )
}

// ─── Task Modal (Add/Edit) ──────────────────────────────────────────
function TaskModal({
  open,
  onOpenChange,
  editingTask,
  familyMembers,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingTask: Task | null
  familyMembers: FamilyMember[]
  onSave: (data: TaskFormData) => Promise<void>
}) {
  const { t, isRTL } = useI18n()
  const [form, setForm] = useState<TaskFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (editingTask) {
        setForm({
          title: editingTask.title,
          description: editingTask.description || '',
          priority: editingTask.priority,
          status: editingTask.status,
          assigned_to: editingTask.assigned_to || '',
          due_date: editingTask.due_date ? parseISO(editingTask.due_date) : undefined,
        })
      } else {
        setForm(EMPTY_FORM)
      }
    }
  }, [open, editingTask])

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Task title is required')
      return
    }
    setSaving(true)
    try {
      await onSave(form)
      onOpenChange(false)
    } catch {
      toast.error('Failed to save task')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)} maxWidth="sm" fullWidth dir={isRTL ? 'rtl' : 'ltr'}>
      <DialogTitle>{editingTask ? t.tasks.editTask : t.tasks.addTask}</DialogTitle>
      <DialogContent sx={{ pb: 1 }}>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={t.tasks.taskTitle}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Enter task title..."
            size="small"
            fullWidth
          />

          <TextField
            label={t.tasks.description}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Add a description (optional)..."
            multiline
            rows={2}
            size="small"
            fullWidth
          />

          <Stack direction="row" spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>{t.tasks.priority}</InputLabel>
              <Select
                value={form.priority}
                label={t.tasks.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
              >
                {(['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((p) => (
                  <MenuItem key={p} value={p}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: `${PRIORITY_CONFIG[p].chipColor}.main` }} />
                      {PRIORITY_CONFIG[p].label}
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel>{t.tasks.status}</InputLabel>
              <Select
                value={form.status}
                label={t.tasks.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TaskStatus }))}
              >
                {(['todo', 'in_progress', 'done'] as TaskStatus[]).map((s) => (
                  <MenuItem key={s} value={s}>{STATUS_CONFIG[s].label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Stack direction="row" spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>{t.tasks.assignTo}</InputLabel>
              <Select
                value={form.assigned_to || '__none__'}
                label={t.tasks.assignTo}
                onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value === '__none__' ? '' : e.target.value }))}
              >
                <MenuItem value="__none__">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Person sx={{ fontSize: 14 }} />
                    <Typography variant="body2">Unassigned</Typography>
                  </Stack>
                </MenuItem>
                {familyMembers.map((member) => {
                  const name = member.profiles?.first_name || member.nickname || member.profiles?.email?.split('@')[0] || 'Member'
                  const initials = ((member.profiles?.first_name?.[0] || '') + (member.profiles?.last_name?.[0] || '')).toUpperCase() || '?'
                  return (
                    <MenuItem key={member.user_id} value={member.user_id}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Avatar sx={{ width: 20, height: 20, fontSize: 8, bgcolor: 'primary.main', color: 'primary.contrastText' }}>{initials}</Avatar>
                        <Typography variant="body2">{name}</Typography>
                      </Stack>
                    </MenuItem>
                  )
                })}
              </Select>
            </FormControl>

            <TextField
              label={t.tasks.dueDate}
              type="date"
              value={form.due_date ? format(form.due_date, 'yyyy-MM-dd') : ''}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value ? parseISO(e.target.value) : undefined }))}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              InputProps={{
                endAdornment: form.due_date ? (
                  <IconButton size="small" onClick={() => setForm((f) => ({ ...f, due_date: undefined }))}>
                    <Delete sx={{ fontSize: 14 }} />
                  </IconButton>
                ) : null,
              }}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => onOpenChange(false)} color="inherit">{t.common.cancel}</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !form.title.trim()}>
          {saving ? t.common.loading : t.common.save}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Date Section Header ────────────────────────────────────────────
function DateSectionHeader({ group, count }: { group: DateGroup; count: number }) {
  const theme = useTheme()
  const config = DATE_GROUP_CONFIG[group]
  const color = config.color as string
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 3, mb: 1.5, '&:first-of-type': { mt: 0 } }}>
      <Typography variant="caption" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 1, color: config.color }}>
        {config.label}
      </Typography>
      <Chip label={count} size="small" sx={{ fontSize: 10, height: 18 }} />
      <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
    </Stack>
  )
}

// ─── Main Tasks Page ────────────────────────────────────────────────
export default function TasksPage() {
  const { t, isRTL } = useI18n()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const supabase = useMemo(() => createClient(), [])
  const { currentFamily, familyMembers } = useAppStore()
  const { user } = useAuthStore()
  const {
    tasks,
    isLoading,
    fetchTasks,
    addTask,
    updateTask,
    deleteTask,
  } = useTaskStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState(0) // 0=All, 1=Active, 2=Completed
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const hasFetchedRef = useRef(false)

  useEffect(() => {
    if (currentFamily?.id && user?.id && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      fetchTasks(currentFamily.id, user.id).catch(() => {})
    }
  }, [currentFamily?.id, user?.id, fetchTasks])

  // Reset on family change
  const prevFamilyRef = useRef(currentFamily?.id)
  useEffect(() => {
    if (prevFamilyRef.current !== currentFamily?.id && currentFamily?.id && user?.id) {
      prevFamilyRef.current = currentFamily.id
      fetchTasks(currentFamily.id, user.id).catch(() => {})
    }
  }, [currentFamily?.id, user?.id, fetchTasks])

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((task) =>
        task.title.toLowerCase().includes(q) ||
        task.description?.toLowerCase().includes(q)
      )
    }
    switch (filterTab) {
      case 1: result = result.filter((t) => t.status !== 'done'); break
      case 2: result = result.filter((t) => t.status === 'done'); break
    }
    return result
  }, [tasks, searchQuery, filterTab])

  // Group by date
  const groupedTasks = useMemo(() => {
    const groups = new Map<DateGroup, Task[]>()
    for (const group of DATE_GROUP_ORDER) groups.set(group, [])
    for (const task of filteredTasks) {
      const group = getDateGroup(task)
      groups.get(group)?.push(task)
    }
    return groups
  }, [filteredTasks])

  const handleToggleDone = useCallback(async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done'
    try {
      const familyId = currentFamily?.id
      if (familyId) {
        await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id)
      }
      updateTask(task.id, { status: newStatus })
      if (newStatus === 'done') {
        toast.success('Task completed!')
      }
    } catch {
      updateTask(task.id, { status: newStatus })
    }
  }, [supabase, currentFamily?.id, updateTask])

  const handleSave = useCallback(async (data: TaskFormData) => {
    const familyId = currentFamily?.id || 'demo-family-001'
    const userId = user?.id || 'demo-user-001'
    const isEditing = !!editingTask

    const taskData = {
      title: data.title.trim(),
      description: data.description.trim() || null,
      priority: data.priority,
      status: data.status,
      assigned_to: data.assigned_to || null,
      due_date: data.due_date ? format(data.due_date, 'yyyy-MM-dd') : null,
    }

    if (isEditing) {
      await supabase.from('tasks').update(taskData).eq('id', editingTask.id)
      updateTask(editingTask.id, taskData)
      toast.success('Task updated')
    } else {
      const { data: inserted, error } = await supabase.from('tasks').insert({
        family_id: familyId,
        created_by: userId,
        ...taskData,
      }).select().single()
      if (error) throw error
      if (inserted) addTask(inserted as Task)
      toast.success('Task created')
    }
  }, [editingTask, supabase, currentFamily?.id, user?.id, updateTask, addTask])

  const handleEdit = useCallback((task: Task) => {
    setEditingTask(task)
    setModalOpen(true)
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    try {
      await supabase.from('tasks').delete().eq('id', id)
    } catch { /* fallback */ }
    deleteTask(id)
    toast.success('Task deleted')
  }, [supabase, deleteTask])

  const handleAddNew = useCallback(() => {
    setEditingTask(null)
    setModalOpen(true)
  }, [])

  // Stats
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === 'done').length
  const activeTasks = totalTasks - completedTasks
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <Container maxWidth="lg" sx={{ py: 3 }} dir={isRTL ? 'rtl' : 'ltr'}>
      <Stack spacing={3}>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${theme.palette.primary.main}15`, border: `1px solid ${theme.palette.primary.main}30`, display: 'flex' }}>
              <PlaylistAddCheck sx={{ color: 'primary.main' }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700}>{t.tasks.title}</Typography>
              <Typography variant="body2" color="text.secondary">{activeTasks} active, {completedTasks} completed</Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Paper variant="outlined" sx={{ display: 'flex', p: 0.25, borderRadius: 2 }}>
              <IconButton size="small" onClick={() => setViewMode('list')} color={viewMode === 'list' ? 'primary' : 'default'} sx={{ borderRadius: 1.5 }}>
                <ViewList sx={{ fontSize: 16 }} />
              </IconButton>
              <IconButton size="small" onClick={() => setViewMode('kanban')} color={viewMode === 'kanban' ? 'primary' : 'default'} sx={{ borderRadius: 1.5 }}>
                <GridView sx={{ fontSize: 16 }} />
              </IconButton>
            </Paper>
            <Button variant="contained" startIcon={<Add sx={{ fontSize: 16}} />} onClick={handleAddNew}>
              {t.tasks.addTask}
            </Button>
          </Stack>
        </Stack>

        {/* Stats */}
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          {[
            { label: 'Total', value: totalTasks, color: theme.palette.primary.main },
            { label: 'Active', value: activeTasks, color: theme.palette.secondary.main },
            { label: 'Done', value: completedTasks, color: theme.palette.success.main },
          ].map((stat) => (
            <Paper key={stat.label} variant="outlined" sx={{ flex: '1 1 120px', p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                <PlaylistAddCheck sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="body2" fontWeight={700}>{stat.value}</Typography>
                <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
              </Box>
            </Paper>
          ))}
          <Paper variant="outlined" sx={{ flex: '1 1 140px', p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">Progress</Typography>
              <Typography variant="caption" fontWeight={600} color="primary">{completionRate}%</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={completionRate} sx={{ height: 8, borderRadius: 4 }} />
          </Paper>
        </Stack>

        {/* Search + Filter */}
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.tasks.search}
            size="small"
            sx={{ flex: '1 1 200px' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
          <Paper variant="outlined" sx={{ display: 'flex', borderRadius: 2 }}>
            <Tabs
              value={filterTab}
              onChange={(_, v) => setFilterTab(v)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label={`All (${tasks.length})`} sx={{ textTransform: 'none', minHeight: 40 }} />
              <Tab label={`Active (${activeTasks})`} sx={{ textTransform: 'none', minHeight: 40 }} />
              <Tab label={`Done (${completedTasks})`} sx={{ textTransform: 'none', minHeight: 40 }} />
            </Tabs>
          </Paper>
        </Stack>

        {/* Task List */}
        {viewMode === 'list' && (
          <Stack spacing={1}>
            {DATE_GROUP_ORDER.map((group) => {
              const groupTasks = groupedTasks.get(group) || []
              if (groupTasks.length === 0) return null
              return (
                <Box key={group}>
                  <DateSectionHeader group={group} count={groupTasks.length} />
                  <Stack spacing={1}>
                    {groupTasks.map((task) => (
                      <TaskCardComponent
                        key={task.id}
                        task={task}
                        onToggleDone={handleToggleDone}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </Stack>
                </Box>
              )
            })}

            {filteredTasks.length === 0 && (
              <Stack alignItems="center" sx={{ py: 8 }}>
                <PlaylistAddCheck sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">No tasks found</Typography>
                <Button variant="outlined" startIcon={<Add sx={{ fontSize: 16}} />} onClick={handleAddNew} sx={{ mt: 2 }}>
                  {t.tasks.addTask}
                </Button>
              </Stack>
            )}
          </Stack>
        )}

        {/* Kanban View */}
        {viewMode === 'kanban' && (
          <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 1 }}>
            {(['todo', 'in_progress', 'done'] as TaskStatus[]).map((status) => {
              const statusTasks = filteredTasks.filter((t) => t.status === status)
              const cfg = STATUS_CONFIG[status]
              return (
                <Paper key={status} variant="outlined" sx={{ minWidth: 280, maxWidth: 360, flex: '0 0 300px', p: 2, borderRadius: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <Chip label={cfg.label} size="small" color={cfg.chipColor} />
                    <Typography variant="caption" color="text.secondary">{statusTasks.length}</Typography>
                  </Stack>
                  <Stack spacing={1} sx={{ maxHeight: 500, overflowY: 'auto' }}>
                    {statusTasks.map((task) => (
                      <TaskCardComponent
                        key={task.id}
                        task={task}
                        onToggleDone={handleToggleDone}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                    {statusTasks.length === 0 && (
                      <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ py: 4 }}>No tasks</Typography>
                    )}
                  </Stack>
                </Paper>
              )
            })}
          </Stack>
        )}
      </Stack>

      {/* Task Modal */}
      <TaskModal
        open={modalOpen}
        onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingTask(null) }}
        editingTask={editingTask}
        familyMembers={familyMembers}
        onSave={handleSave}
      />

      {/* FAB for mobile */}
      {isMobile && (
        <Fab color="primary" onClick={handleAddNew} sx={{ position: 'fixed', bottom: 80, right: 16 }}>
          <Add />
        </Fab>
      )}
    </Container>
  )
}
