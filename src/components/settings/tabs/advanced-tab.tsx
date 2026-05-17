'use client'

import React, { useState, useCallback } from 'react'
import {
  Eye,
  Palette,
  Check,
  Download,
  HardDrive,
  CheckCircle2,
  CalendarDays,
  ShoppingCart,
  MessageCircle,
  Upload,
  FileJson,
  FileSpreadsheet,
  AlertTriangle,
  Sparkles,
  Copy,
  RefreshCw,
  Heart,
  Home,
  Lock,
  Plug,
  X,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

import Stack from '@mui/material/Stack'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Switch from '@mui/material/Switch'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import LinearProgress from '@mui/material/LinearProgress'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'

import { useAppStore } from '@/stores/app-store'
import { useTaskStore } from '@/stores/task-store'
import { useGroceryStore } from '@/stores/grocery-store'
import { useCalendarStore } from '@/stores/calendar-store'
import { useChatStore } from '@/stores/chat-store'
import { useUIPreferencesStore, ACCENT_COLORS } from '@/stores/ui-preferences-store'
import { useI18n } from '@/i18n/use-translation'
import { createClient } from '@/lib/supabase/client'
import type { Task, CalendarEvent, GroceryItem, ChatMessage } from '@/types'

import { SectionCard, SectionTitle, SectionDescription, SettingRow } from '../settings-helpers'

const FamilyQRCode = dynamic(() => import('@/components/shared/family-qr-code').then(m => ({ default: m.FamilyQRCode })), { ssr: false, loading: () => <Stack alignItems="center" sx={{ p: 4 }}><Loader2 size={20} className="animate-spin" sx={{ color: 'primary.main' }} /></Stack> })

export function AdvancedTab() {
  return (
    <Stack spacing={3}>
      <AccentColorSection />
      <VisualEffectsSection />
      <GuidedTourSection />
      <DataControlSection />
    </Stack>
  )
}

// ─── Accent Color Section ──────────────────────────────────────────────────

function AccentColorSection() {
  const { isRTL } = useI18n()
  const { accentColor, setAccentColor } = useUIPreferencesStore()

  return (
    <SectionCard>
      <SectionTitle>
        <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
          <Palette size={16} sx={{ color: 'primary.main' }} />
          {isRTL ? 'لون التمييز' : 'Accent Color'}
        </Stack>
      </SectionTitle>
      <SectionDescription>
        {isRTL ? 'اختر لون التمييز الرئيسي للتطبيق' : 'Choose the primary accent color for the app'}
      </SectionDescription>

      <Grid container spacing={1.5} sx={{ mt: 1 }}>
        {Object.values(ACCENT_COLORS).map((config) => (
          <Grid key={config.id} size={{ xs: 3, sm: 1.7 }}>
            <Button
              fullWidth
              variant={accentColor === config.id ? 'contained' : 'outlined'}
              onClick={() => setAccentColor(config.id)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                p: 1.5,
                borderRadius: 3,
                textTransform: 'none',
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: config.primary,
                  transform: accentColor === config.id ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 0.2s',
                  boxShadow: accentColor === config.id ? `0 0 12px rgba(${config.glow}, 0.4)` : 'none',
                }}
              />
              <Typography variant="caption" sx={{ fontSize: 10, lineHeight: 1.2, textAlign: 'center' }}>
                {config.label}
              </Typography>
              {accentColor === config.id && <Check size={14} />}
            </Button>
          </Grid>
        ))}
      </Grid>

      {/* Preview */}
      <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1.5 }} sx={{ mt: 2 }}>
        <Button
          variant="contained"
          sx={{
            bgcolor: ACCENT_COLORS[accentColor].primary,
            '&:hover': { bgcolor: ACCENT_COLORS[accentColor].primary, opacity: 0.9 },
          }}
          size="small"
        >
          {isRTL ? 'معاينة الزر' : 'Button Preview'}
        </Button>
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            bgcolor: ACCENT_COLORS[accentColor].primary,
            boxShadow: `0 0 8px rgba(${ACCENT_COLORS[accentColor].glow}, 0.5)`,
          }}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {isRTL ? 'هذا كيف سيبدو اللون' : 'This is how the color looks'}
        </Typography>
      </Stack>
    </SectionCard>
  )
}

// ─── Visual Effects Section ────────────────────────────────────────────────

function VisualEffectsSection() {
  const { isRTL } = useI18n()
  const { reflectionsEnabled, toggleReflections } = useUIPreferencesStore()

  return (
    <SectionCard>
      <SectionTitle>
        <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
          <Eye size={16} sx={{ color: 'primary.main' }} />
          {isRTL ? 'تأثيرات بصرية' : 'Visual Effects'}
        </Stack>
      </SectionTitle>
      <SectionDescription>
        {isRTL ? 'تخصيص المظهر المرئي للتطبيق' : 'Customize the visual appearance of the app'}
      </SectionDescription>

      <SettingRow
        label={isRTL ? 'انعكاسات واجهة المستخدم' : 'UI Reflections'}
        description={isRTL ? 'انعكاسات زجاجية وتأثيرات انكسار الضوء' : 'Glass reflections and light refraction effects'}
      >
        <Switch checked={reflectionsEnabled} onChange={toggleReflections} size="small" />
      </SettingRow>

      {!reflectionsEnabled && (
        <Paper elevation={0} variant="outlined" sx={{ mt: 1, p: 1.5, borderRadius: 2 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {isRTL
              ? 'الوضع المسطّح Premium — بدون تأثيرات ضبابية أو انعكاسات زجاجية'
              : 'Flat Premium mode — no blur effects or glass reflections'}
          </Typography>
        </Paper>
      )}
    </SectionCard>
  )
}

// ─── Guided Tour Section ───────────────────────────────────────────────────

function GuidedTourSection() {
  const { t, isRTL } = useI18n()

  return (
    <SectionCard>
      <SectionTitle>
        <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
          <Sparkles size={16} sx={{ color: 'primary.main' }} />
          {isRTL ? 'جولة تطبيق' : 'App Tour'}
        </Stack>
      </SectionTitle>
      <SectionDescription>{isRTL ? 'أخذ جولة حول ميزات التطبيق' : 'Take a guided tour of the app features'}</SectionDescription>

      <Button
        variant="contained"
        onClick={async () => {
          const { useTourStore } = await import('@/stores/tour-store')
          useTourStore.getState().startTour()
        }}
        startIcon={<Sparkles size={16} />}
      >
        {isRTL ? t.tour.restartTour : t.tour.startTour}
      </Button>
    </SectionCard>
  )
}

// ─── Data Control Section ──────────────────────────────────────────────────

function DataControlSection() {
  const { t, isRTL } = useI18n()
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [clearing, setClearing] = useState(false)

  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json')
  const [exportSelection, setExportSelection] = useState({
    tasks: true,
    events: true,
    grocery: true,
    messages: true,
  })

  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<{
    tasks: number
    events: number
    grocery: number
    messages: number
    total: number
  } | null>(null)
  const [importData, setImportData] = useState<Record<string, unknown[]> | null>(null)
  const [importConfirmOpen, setImportConfirmOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const [clearSelection, setClearSelection] = useState({
    tasks: true,
    events: true,
    grocery: true,
    messages: true,
  })
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  const { tasks } = useTaskStore()
  const { events } = useCalendarStore()
  const { items: groceryItems } = useGroceryStore()
  const { messages } = useChatStore()

  const dataCounts = {
    tasks: tasks.length,
    events: events.length,
    grocery: groceryItems.length,
    messages: messages.length,
  }

  const toggleExport = useCallback((key: keyof typeof exportSelection) => {
    setExportSelection((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const toggleClear = useCallback((key: keyof typeof clearSelection) => {
    setClearSelection((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const isAllExportSelected = Object.values(exportSelection).every(Boolean)
  const isAllClearSelected = Object.values(clearSelection).every(Boolean)

  const toggleAllExport = useCallback(() => {
    const newVal = !isAllExportSelected
    setExportSelection({ tasks: newVal, events: newVal, grocery: newVal, messages: newVal })
  }, [isAllExportSelected])

  const toggleAllClear = useCallback(() => {
    const newVal = !isAllClearSelected
    setClearSelection({ tasks: newVal, events: newVal, grocery: newVal, messages: newVal })
  }, [isAllClearSelected])

  // Export Logic
  const handleExport = useCallback(async () => {
    const hasSelection = Object.values(exportSelection).some(Boolean)
    if (!hasSelection) {
      toast.error(t.dataControl.noDataToExport)
      return
    }
    setExporting(true)
    try {
      const BOM = '\uFEFF'
      if (exportFormat === 'json') {
        const data: Record<string, unknown> = { exportedAt: new Date().toISOString(), version: '1.0', app: 'USRA PLUS' }
        if (exportSelection.tasks) data.tasks = tasks.map((task) => ({ id: task.id, title: task.title, description: task.description, status: task.status, priority: task.priority, assigned_to: task.assigned_to, due_date: task.due_date, completed_at: task.completed_at, created_at: task.created_at }))
        if (exportSelection.events) data.events = events.map((event) => ({ id: event.id, title: event.title, description: event.description, start_time: event.start_time, end_time: event.end_time, all_day: event.all_day, color: event.color, created_at: event.created_at }))
        if (exportSelection.grocery) data.groceryItems = groceryItems.map((item) => ({ id: item.id, name: item.name, category: item.category, quantity: item.quantity, checked: item.checked, created_at: item.created_at }))
        if (exportSelection.messages) data.messages = messages.map((msg) => ({ id: msg.id, content: msg.content, sender_id: msg.sender_id, message_type: msg.message_type, created_at: msg.created_at }))
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `usra-plus-export-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const sections: string[] = []
        if (exportSelection.tasks) { sections.push(isRTL ? '--- المهام ---' : '--- Tasks ---', ['Title', 'Status', 'Priority', 'Assignee', 'Due Date', 'Created At'].join(','), ...tasks.map((task) => [`"${(task.title ?? '').replace(/"/g, '""')}"`, task.status ?? '', task.priority ?? '', task.assignee?.first_name ? `"${task.assignee.first_name} ${task.assignee.last_name ?? ''}".trim()` : '', task.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : '', task.created_at ? new Date(task.created_at).toISOString().slice(0, 10) : ''].join(','))) }
        if (exportSelection.events) { sections.push('', isRTL ? '--- أحداث التقويم ---' : '--- Calendar Events ---', ['Title', 'Description', 'Start Time', 'End Time', 'All Day', 'Color', 'Created At'].join(','), ...events.map((event) => [`"${(event.title ?? '').replace(/"/g, '""')}"`, `"${(event.description ?? '').replace(/"/g, '""')}"`, event.start_time ?? '', event.end_time ?? '', event.all_day ? 'Yes' : 'No', event.color ?? '', event.created_at ? new Date(event.created_at).toISOString().slice(0, 10) : ''].join(','))) }
        if (exportSelection.grocery) { sections.push('', isRTL ? '--- قائمة البقالة ---' : '--- Grocery List ---', ['Name', 'Category', 'Quantity', 'Checked', 'Created At'].join(','), ...groceryItems.map((item) => [`"${(item.name ?? '').replace(/"/g, '""')}"`, `"${(item.category ?? '').replace(/"/g, '""')}"`, String(item.quantity ?? 1), item.checked ? 'Yes' : 'No', item.created_at ? new Date(item.created_at).toISOString().slice(0, 10) : ''].join(','))) }
        if (exportSelection.messages) { sections.push('', isRTL ? '--- رسائل الدردشة ---' : '--- Chat Messages ---', ['Content', 'Sender', 'Type', 'Timestamp'].join(','), ...messages.map((msg) => [`"${(msg.content ?? '').replace(/"/g, '""')}"`, msg.sender?.first_name ? `"${msg.sender.first_name}"` : msg.sender_id ?? '', msg.message_type ?? '', msg.created_at ? new Date(msg.created_at).toISOString() : ''].join(','))) }
        const csvContent = BOM + sections.join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `usra-plus-export-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
      toast.success(t.dataControl.exportSuccess)
    } catch {
      toast.error(t.common.error)
    } finally {
      setExporting(false)
    }
  }, [exportFormat, exportSelection, tasks, events, groceryItems, messages, t, isRTL])

  // Import Logic
  const parseImportFile = useCallback(
    async (file: File) => {
      try {
        if (file.name.endsWith('.json')) {
          const text = await file.text()
          const parsed = JSON.parse(text)
          if (typeof parsed !== 'object' || Array.isArray(parsed)) { toast.error(t.dataControl.invalidFile); return }
          const preview = { tasks: Array.isArray(parsed.tasks) ? parsed.tasks.length : 0, events: Array.isArray(parsed.events) ? parsed.events.length : 0, grocery: Array.isArray(parsed.groceryItems) ? parsed.groceryItems.length : 0, messages: Array.isArray(parsed.messages) ? parsed.messages.length : 0, total: 0 }
          preview.total = preview.tasks + preview.events + preview.grocery + preview.messages
          if (preview.total === 0) { toast.error(t.dataControl.importFailed); return }
          setImportPreview(preview)
          setImportData(parsed)
        } else {
          toast.error(t.dataControl.invalidFile)
          return
        }
        setImportFile(file)
      } catch {
        toast.error(t.dataControl.importFailed)
      }
    },
    [t]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false) }, [])
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) parseImportFile(file) }, [parseImportFile])
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) parseImportFile(file) }, [parseImportFile])

  const handleImportConfirm = useCallback(async () => {
    if (!importData) return
    setImporting(true)
    try {
      const taskStore = useTaskStore.getState()
      const groceryStore = useGroceryStore.getState()
      const calendarStore = useCalendarStore.getState()
      const chatStore = useChatStore.getState()
      if (Array.isArray(importData.tasks)) {
        const newTasks = (importData.tasks as Record<string, unknown>[]).map((task) => ({ id: (task.id as string) || `imported-${Date.now()}-${Math.random().toString(36).slice(2)}`, family_id: '', title: (task.title as string) || 'Untitled', description: (task.description as string) || null, status: (task.status as string) || 'todo', priority: (task.priority as string) || 'medium', assigned_to: (task.assigned_to as string) || null, created_by: '', due_date: (task.due_date as string) || null, completed_at: (task.completed_at as string) || null, created_at: (task.created_at as string) || new Date().toISOString(), updated_at: new Date().toISOString() })) as Task[]
        taskStore.setTasks([...taskStore.tasks, ...newTasks])
      }
      if (Array.isArray(importData.events)) {
        const newEvents = (importData.events as Record<string, unknown>[]).map((event) => ({ id: (event.id as string) || `imported-${Date.now()}-${Math.random().toString(36).slice(2)}`, family_id: '', title: (event.title as string) || 'Untitled Event', description: (event.description as string) || null, start_time: (event.start_time as string) || new Date().toISOString(), end_time: (event.end_time as string) || null, all_day: (event.all_day as boolean) ?? false, color: (event.color as string) || null, created_by: '', created_at: (event.created_at as string) || new Date().toISOString(), updated_at: new Date().toISOString() })) as CalendarEvent[]
        calendarStore.setEvents([...calendarStore.events, ...newEvents])
      }
      if (Array.isArray(importData.groceryItems)) {
        const newItems = (importData.groceryItems as Record<string, unknown>[]).map((item) => ({ id: (item.id as string) || `imported-${Date.now()}-${Math.random().toString(36).slice(2)}`, family_id: '', name: (item.name as string) || 'Unnamed Item', category: (item.category as string) || null, quantity: (item.quantity as number) ?? 1, checked: (item.checked as boolean) ?? false, added_by: '', created_at: (item.created_at as string) || new Date().toISOString(), updated_at: new Date().toISOString() })) as GroceryItem[]
        groceryStore.setItems([...groceryStore.items, ...newItems])
      }
      if (Array.isArray(importData.messages)) {
        const newMessages = (importData.messages as Record<string, unknown>[]).map((msg) => ({ id: (msg.id as string) || `imported-${Date.now()}-${Math.random().toString(36).slice(2)}`, family_id: '', content: (msg.content as string) || '', sender_id: (msg.sender_id as string) || '', message_type: (msg.message_type as string) || 'text', reply_to: null, created_at: (msg.created_at as string) || new Date().toISOString() })) as ChatMessage[]
        chatStore.setMessages([...chatStore.messages, ...newMessages])
      }
      setImportPreview(null); setImportData(null); setImportFile(null); setImportConfirmOpen(false)
      toast.success(t.dataControl.importSuccess)
    } catch {
      toast.error(t.dataControl.importFailed)
    } finally {
      setImporting(false)
    }
  }, [importData, t])

  const handleClearConfirm = useCallback(async () => {
    setClearing(true)
    try {
      const taskStore = useTaskStore.getState()
      const groceryStore = useGroceryStore.getState()
      const calendarStore = useCalendarStore.getState()
      const chatStore = useChatStore.getState()
      if (clearSelection.tasks) taskStore.setTasks([])
      if (clearSelection.events) calendarStore.setEvents([])
      if (clearSelection.grocery) groceryStore.setItems([])
      if (clearSelection.messages) chatStore.setMessages([])
      setClearConfirmOpen(false)
      toast.success(t.dataControl.clearSuccess)
    } catch {
      toast.error(t.common.error)
    } finally {
      setClearing(false)
    }
  }, [clearSelection, t])

  const dataTypeItems = [
    { key: 'tasks' as const, icon: CheckCircle2, label: t.dataControl.tasks, count: dataCounts.tasks },
    { key: 'events' as const, icon: CalendarDays, label: t.dataControl.events, count: dataCounts.events },
    { key: 'grocery' as const, icon: ShoppingCart, label: t.dataControl.grocery, count: dataCounts.grocery },
    { key: 'messages' as const, icon: MessageCircle, label: t.dataControl.messages, count: dataCounts.messages },
  ]

  return (
    <>
      {/* Storage */}
      <SectionCard>
        <SectionTitle>
          <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
            <HardDrive size={16} sx={{ color: 'primary.main' }} /> {isRTL ? 'استخدام التخزين' : 'Storage Usage'}
          </Stack>
        </SectionTitle>
        <SectionDescription>{isRTL ? 'استهلاك التخزين الحالي' : 'Your current storage consumption'}</SectionDescription>

        <Stack spacing={2}>
          <Box>
            <Stack sx={{ flexDirection: 'row' }} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="body2">2.4 GB of 5 GB</Typography>
              <Typography variant="body2" sx={{ color: 'primary.main' }} sx={{ fontWeight: 500 }}>48%</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={48} sx={{ height: 8, borderRadius: 4 }} />
          </Box>

          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <Paper elevation={0} variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t.files.title}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>1.8 GB</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Paper elevation={0} variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t.chat.title}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>0.4 GB</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Paper elevation={0} variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t.tasks.title} & {t.calendar.title}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>0.1 GB</Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Paper elevation={0} variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>{isRTL ? 'أخرى' : 'Other'}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>0.1 GB</Typography>
              </Paper>
            </Grid>
          </Grid>
        </Stack>
      </SectionCard>

      {/* Export Section */}
      <SectionCard>
        <SectionTitle>
          <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
            <Download size={16} sx={{ color: 'primary.main' }} /> {t.dataControl.exportData}
          </Stack>
        </SectionTitle>
        <SectionDescription>
          {isRTL ? 'قم بتنزيل نسخة من بياناتك بالتنسيق المفضل لديك' : 'Download a copy of your data in your preferred format'}
        </SectionDescription>

        <Stack spacing={2.5}>
          <Box>
            <Typography variant="caption" sx={{ mb: 1, display: 'block' }}>{t.dataControl.exportFormat}</Typography>
            <Stack sx={{ flexDirection: 'row', gap: 1 }}>
              <Button
                variant={exportFormat === 'json' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setExportFormat('json')}
                startIcon={<FileJson size={16} />}
              >
                {t.dataControl.json}
              </Button>
              <Button
                variant={exportFormat === 'csv' ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setExportFormat('csv')}
                startIcon={<FileSpreadsheet size={16} />}
              >
                {t.dataControl.csv}
              </Button>
            </Stack>
          </Box>

          <Box>
            <Stack sx={{ flexDirection: 'row' }} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="caption">{t.dataControl.selectData}</Typography>
              <Button variant="text" size="small" sx={{ color: 'primary.main' }} onClick={toggleAllExport} sx={{ fontSize: 12, minHeight: 24, px: 1 }}>
                {isAllExportSelected ? t.dataControl.deselectAll : t.dataControl.selectAll}
              </Button>
            </Stack>

            <Stack spacing={1}>
              {dataTypeItems.map(({ key, icon: Icon, label, count }) => (
                <Paper
                  key={key}
                  elevation={0}
                  variant="outlined"
                  onClick={() => toggleExport(key)}
                  sx={{ p: 1.5, borderRadius: 3, cursor: 'pointer', transition: 'background 0.15s', '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1.5 }}>
                    <Checkbox checked={exportSelection[key]} size="small" />
                    <Icon size={16} sx={{ color: 'secondary.main' }} />
                    <Typography variant="body2" sx={{ flex: 1 }}>{label}</Typography>
                    <Chip label={count} size="small" variant="outlined" />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>

          <Button
            variant="contained"
            onClick={handleExport}
            disabled={exporting || !Object.values(exportSelection).some(Boolean)}
            fullWidth
            startIcon={exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          >
            {exporting ? t.dataControl.exporting : t.dataControl.exportData}
          </Button>
        </Stack>
      </SectionCard>

      {/* Import Section */}
      <SectionCard>
        <SectionTitle>
          <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
            <Upload size={16} sx={{ color: 'primary.main' }} /> {t.dataControl.importData}
          </Stack>
        </SectionTitle>
        <SectionDescription>
          {isRTL ? 'قم باستيراد البيانات من ملف JSON أو CSV' : 'Import data from a JSON or CSV file'}
        </SectionDescription>

        <Stack spacing={2}>
          {/* Drop Zone */}
          <Paper
            elevation={0}
            variant="outlined"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              const input = document.getElementById('import-file-input') as HTMLInputElement | null
              input?.click()
            }}
            sx={{
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              borderStyle: 'dashed',
              borderWidth: 2,
              borderColor: isDragging ? 'primary.main' : 'divider',
              bgcolor: isDragging ? 'primary.main' : 'action.hover',
              opacity: isDragging ? 0.1 : 1,
              borderRadius: 4,
              transition: 'all 0.2s',
            }}
          >
            <input id="import-file-input" type="file" accept=".json,.csv" style={{ display: 'none' }} onChange={handleFileInput} />
            <Upload size={40} color={isDragging ? 'primary' : 'text.secondary'} />
            <Typography variant="body2" sx={{ fontWeight: 500, mt: 1.5 }}>{t.dataControl.dropzone}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t.dataControl.supportedFormats}</Typography>
          </Paper>

          {/* File Selected */}
          {importFile && (
            <Paper elevation={0} variant="outlined" sx={{ p: 1.5, borderRadius: 3, borderColor: 'primary.light' }}>
              <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1.5 }}>
                <FileJson size={20} sx={{ color: 'secondary.main' }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>{importFile.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{(importFile.size / 1024).toFixed(1)} KB</Typography>
                </Box>
                <IconButton size="small" onClick={() => { setImportFile(null); setImportPreview(null); setImportData(null) }}>
                  <X size={16} />
                </IconButton>
              </Stack>
            </Paper>
          )}

          {/* Import Preview */}
          {importPreview && (
            <Paper elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
              <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }} sx={{ mb: 1.5 }}>
                <Eye size={16} sx={{ color: 'secondary.main' }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.dataControl.importPreviewTitle}</Typography>
              </Stack>
              <Grid container spacing={1}>
                {importPreview.tasks > 0 && (
                  <Grid size={{ xs: 6 }}>
                    <Paper elevation={0} variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t.dataControl.tasks}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {t.dataControl.itemCount.replace('{count}', String(importPreview.tasks))}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
                {importPreview.events > 0 && (
                  <Grid size={{ xs: 6 }}>
                    <Paper elevation={0} variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t.dataControl.events}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {t.dataControl.itemCount.replace('{count}', String(importPreview.events))}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
                {importPreview.grocery > 0 && (
                  <Grid size={{ xs: 6 }}>
                    <Paper elevation={0} variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t.dataControl.grocery}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {t.dataControl.itemCount.replace('{count}', String(importPreview.grocery))}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
                {importPreview.messages > 0 && (
                  <Grid size={{ xs: 6 }}>
                    <Paper elevation={0} variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t.dataControl.messages}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {t.dataControl.itemCount.replace('{count}', String(importPreview.messages))}
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" sx={{ color: 'primary.main' }} sx={{ fontWeight: 500 }}>
                {isRTL ? 'الإجمالي' : 'Total'}: {t.dataControl.itemCount.replace('{count}', String(importPreview.total))}
              </Typography>
            </Paper>
          )}

          <Button
            variant="contained"
            onClick={() => setImportConfirmOpen(true)}
            disabled={!importPreview || importing}
            fullWidth
            startIcon={importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          >
            {importing ? t.dataControl.applying : t.dataControl.importData}
          </Button>

          {/* Import Confirmation Dialog */}
          <Dialog open={importConfirmOpen} onClose={() => setImportConfirmOpen(false)}>
            <DialogTitle>{t.dataControl.importData}</DialogTitle>
            <DialogContent>
              <DialogContentText>
                {t.dataControl.importWarning.replace('{count}', String(importPreview?.total ?? 0))}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setImportConfirmOpen(false)}>{t.common.cancel}</Button>
              <Button variant="contained" onClick={handleImportConfirm}>{t.common.confirm}</Button>
            </DialogActions>
          </Dialog>
        </Stack>
      </SectionCard>

      {/* Clear Data Section */}
      <SectionCard sx={{ borderColor: 'error.light' }}>
        <SectionTitle>
          <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
            <AlertTriangle size={16} sx={{ color: 'error.main' }} /> {t.dataControl.clearData}
          </Stack>
        </SectionTitle>
        <SectionDescription>
          {isRTL ? 'إزالة البيانات نهائيًا من USRA PLUS' : 'Permanently remove data from USRA PLUS'}
        </SectionDescription>

        <Stack spacing={2}>
          <Alert severity="error" variant="outlined">
            <AlertTriangle size={16} />
            <Typography variant="caption" sx={{ color: 'error.main' }}>{t.dataControl.clearWarning}</Typography>
          </Alert>

          <Box>
            <Stack sx={{ flexDirection: 'row' }} alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="caption">{t.dataControl.selectData}</Typography>
              <Button variant="text" size="small" sx={{ color: 'error.main' }} onClick={toggleAllClear} sx={{ fontSize: 12, minHeight: 24, px: 1 }}>
                {isAllClearSelected ? t.dataControl.deselectAll : t.dataControl.selectAll}
              </Button>
            </Stack>

            <Stack spacing={1}>
              {dataTypeItems.map(({ key, icon: Icon, label, count }) => (
                <Paper
                  key={key}
                  elevation={0}
                  variant="outlined"
                  onClick={() => toggleClear(key)}
                  sx={{ p: 1.5, borderRadius: 3, cursor: 'pointer', transition: 'background 0.15s', '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1.5 }}>
                    <Checkbox checked={clearSelection[key]} size="small" sx={{ color: 'error.main' }} />
                    <Icon size={16} sx={{ color: 'error.main' }} />
                    <Typography variant="body2" sx={{ flex: 1 }}>{label}</Typography>
                    <Chip label={count} size="small" variant="outlined" sx={{ color: 'error.main' }} />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>

          <Button
            variant="contained"
            sx={{ color: 'error.main' }}
            onClick={() => setClearConfirmOpen(true)}
            disabled={!Object.values(clearSelection).some(Boolean)}
            fullWidth
            startIcon={<Trash2 size={16} />}
          >
            {t.dataControl.clearData}
          </Button>

          <Dialog open={clearConfirmOpen} onClose={() => setClearConfirmOpen(false)}>
            <DialogTitle>{t.dataControl.clearData}</DialogTitle>
            <DialogContent>
              <DialogContentText>
                {isRTL ? 'هل أنت متأكد أنك تريد مسح البيانات المحددة؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to clear the selected data? This action cannot be undone.'}
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setClearConfirmOpen(false)}>{t.common.cancel}</Button>
              <Button sx={{ color: 'error.main' }} variant="contained" onClick={handleClearConfirm}>{t.common.confirm}</Button>
            </DialogActions>
          </Dialog>
        </Stack>
      </SectionCard>
    </>
  )
}
