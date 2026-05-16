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
  QrCode,
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
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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

// Dynamic import — qrcode library is heavy, only load when QR tab is viewed
const FamilyQRCode = dynamic(() => import('@/components/shared/family-qr-code').then(m => ({ default: m.FamilyQRCode })), { ssr: false, loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> })

export function AdvancedTab() {
  return (
    <div className="space-y-6">
      <AccentColorSection />
      <VisualEffectsSection />
      <GuidedTourSection />
      <DataControlSection />
      <IntegrationsSection />
    </div>
  )
}

// ─── Accent Color Section ──────────────────────────────────────────────────

function AccentColorSection() {
  const { isRTL } = useI18n()
  const { accentColor, setAccentColor } = useUIPreferencesStore()

  return (
    <SectionCard>
      <SectionTitle>
        <span className="flex items-center gap-2">
          <Palette className="size-4 text-primary" />
          {isRTL ? 'لون التمييز' : 'Accent Color'}
        </span>
      </SectionTitle>
      <SectionDescription>
        {isRTL ? 'اختر لون التمييز الرئيسي للتطبيق' : 'Choose the primary accent color for the app'}
      </SectionDescription>

      <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 mt-2">
        {Object.values(ACCENT_COLORS).map((config) => (
          <button
            key={config.id}
            onClick={() => setAccentColor(config.id)}
            className={`group relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
              accentColor === config.id
                ? 'bg-primary/10 border-primary/30'
                : 'bg-muted/50 border-border hover:bg-muted hover:border-border'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full transition-transform ${
                accentColor === config.id ? 'scale-110 ring-2 ring-offset-2 ring-offset-card' : 'group-hover:scale-105'
              }`}
              style={{
                backgroundColor: config.primary,
                boxShadow: accentColor === config.id ? `0 0 12px rgba(${config.glow}, 0.4)` : 'none',
              }}
            />
            <span className={`text-[10px] font-medium leading-tight text-center ${
              accentColor === config.id ? 'text-foreground' : 'text-muted-foreground'
            }`}>
              {config.label}
            </span>
            {accentColor === config.id && (
              <Check
                className="absolute -top-1 -right-1 size-4 rounded-full p-0.5 text-white"
                style={{ backgroundColor: config.primary }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-muted border border-border">
        <button
          className="px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all"
          style={{ backgroundColor: ACCENT_COLORS[accentColor].primary }}
        >
          {isRTL ? 'معاينة الزر' : 'Button Preview'}
        </button>
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: ACCENT_COLORS[accentColor].primary, boxShadow: `0 0 8px rgba(${ACCENT_COLORS[accentColor].glow}, 0.5)` }}
        />
        <span className="text-xs text-muted-foreground">
          {isRTL ? 'هذا كيف سيبدو اللون' : 'This is how the color looks'}
        </span>
      </div>
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
        <span className="flex items-center gap-2">
          <Eye className="size-4 text-primary" />
          {isRTL ? 'تأثيرات بصرية' : 'Visual Effects'}
        </span>
      </SectionTitle>
      <SectionDescription>
        {isRTL ? 'تخصيص المظهر المرئي للتطبيق' : 'Customize the visual appearance of the app'}
      </SectionDescription>

      <SettingRow
        label={isRTL ? 'انعكاسات واجهة المستخدم' : 'UI Reflections'}
        description={isRTL ? 'انعكاسات زجاجية وتأثيرات انكسار الضوء' : 'Glass reflections and light refraction effects'}
      >
        <Switch checked={reflectionsEnabled} onCheckedChange={toggleReflections} />
      </SettingRow>

      {!reflectionsEnabled && (
        <div className="mt-2 rounded-lg border border-border bg-muted px-3 py-2">
          <p className="text-xs text-muted-foreground">
            {isRTL
              ? 'الوضع المسطّح Premium — بدون تأثيرات ضبابية أو انعكاسات زجاجية'
              : 'Flat Premium mode — no blur effects or glass reflections'}
          </p>
        </div>
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
        <span className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          {isRTL ? 'جولة تطبيق' : 'App Tour'}
        </span>
      </SectionTitle>
      <SectionDescription>{isRTL ? 'أخذ جولة حول ميزات التطبيق' : 'Take a guided tour of the app features'}</SectionDescription>

      <Button
        onClick={async () => {
          const { useTourStore } = await import('@/stores/tour-store')
          useTourStore.getState().startTour()
        }}
        className="bg-primary hover:bg-primary/90 text-white rounded-xl"
      >
        <Sparkles className="size-4 mr-2" />
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

  // Export state
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json')
  const [exportSelection, setExportSelection] = useState({
    tasks: true,
    events: true,
    grocery: true,
    messages: true,
  })

  // Import state
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

  // Clear state
  const [clearSelection, setClearSelection] = useState({
    tasks: true,
    events: true,
    grocery: true,
    messages: true,
  })
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  // Data from stores
  const { tasks } = useTaskStore()
  const { events } = useCalendarStore()
  const { items: groceryItems } = useGroceryStore()
  const { messages } = useChatStore()

  // Counts for display
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

  const toggleAllExport = useCallback(() => {
    const newVal = !isAllExportSelected
    setExportSelection({ tasks: newVal, events: newVal, grocery: newVal, messages: newVal })
  }, [isAllExportSelected])

  const isAllClearSelected = Object.values(clearSelection).every(Boolean)

  const toggleAllClear = useCallback(() => {
    const newVal = !isAllClearSelected
    setClearSelection({ tasks: newVal, events: newVal, grocery: newVal, messages: newVal })
  }, [isAllClearSelected])

  // ─── Export Logic ─────────────────────────────────────────────────────

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
        const data: Record<string, unknown> = {
          exportedAt: new Date().toISOString(),
          version: '1.0',
          app: 'USRA PLUS',
        }

        if (exportSelection.tasks) {
          data.tasks = tasks.map((task) => ({
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            assigned_to: task.assigned_to,
            due_date: task.due_date,
            completed_at: task.completed_at,
            created_at: task.created_at,
          }))
        }

        if (exportSelection.events) {
          data.events = events.map((event) => ({
            id: event.id,
            title: event.title,
            description: event.description,
            start_time: event.start_time,
            end_time: event.end_time,
            all_day: event.all_day,
            color: event.color,
            created_at: event.created_at,
          }))
        }

        if (exportSelection.grocery) {
          data.groceryItems = groceryItems.map((item) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            checked: item.checked,
            created_at: item.created_at,
          }))
        }

        if (exportSelection.messages) {
          data.messages = messages.map((msg) => ({
            id: msg.id,
            content: msg.content,
            sender_id: msg.sender_id,
            message_type: msg.message_type,
            created_at: msg.created_at,
          }))
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `usra-plus-export-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // CSV Export with UTF-8 BOM for Arabic support
        const sections: string[] = []

        if (exportSelection.tasks) {
          sections.push(
            isRTL ? '--- المهام ---' : '--- Tasks ---',
            ['Title', 'Status', 'Priority', 'Assignee', 'Due Date', 'Created At'].join(','),
            ...tasks.map((task) =>
              [
                `"${(task.title ?? '').replace(/"/g, '""')}"`,
                task.status ?? '',
                task.priority ?? '',
                task.assignee?.first_name ? `"${task.assignee.first_name} ${task.assignee.last_name ?? ''}".trim()` : '',
                task.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : '',
                task.created_at ? new Date(task.created_at).toISOString().slice(0, 10) : '',
              ].join(',')
            )
          )
        }

        if (exportSelection.events) {
          sections.push(
            '',
            isRTL ? '--- أحداث التقويم ---' : '--- Calendar Events ---',
            ['Title', 'Description', 'Start Time', 'End Time', 'All Day', 'Color', 'Created At'].join(','),
            ...events.map((event) =>
              [
                `"${(event.title ?? '').replace(/"/g, '""')}"`,
                `"${(event.description ?? '').replace(/"/g, '""')}"`,
                event.start_time ?? '',
                event.end_time ?? '',
                event.all_day ? 'Yes' : 'No',
                event.color ?? '',
                event.created_at ? new Date(event.created_at).toISOString().slice(0, 10) : '',
              ].join(',')
            )
          )
        }

        if (exportSelection.grocery) {
          sections.push(
            '',
            isRTL ? '--- قائمة البقالة ---' : '--- Grocery List ---',
            ['Name', 'Category', 'Quantity', 'Checked', 'Created At'].join(','),
            ...groceryItems.map((item) =>
              [
                `"${(item.name ?? '').replace(/"/g, '""')}"`,
                `"${(item.category ?? '').replace(/"/g, '""')}"`,
                String(item.quantity ?? 1),
                item.checked ? 'Yes' : 'No',
                item.created_at ? new Date(item.created_at).toISOString().slice(0, 10) : '',
              ].join(',')
            )
          )
        }

        if (exportSelection.messages) {
          sections.push(
            '',
            isRTL ? '--- رسائل الدردشة ---' : '--- Chat Messages ---',
            ['Content', 'Sender', 'Type', 'Timestamp'].join(','),
            ...messages.map((msg) =>
              [
                `"${(msg.content ?? '').replace(/"/g, '""')}"`,
                msg.sender?.first_name ? `"${msg.sender.first_name}"` : msg.sender_id ?? '',
                msg.message_type ?? '',
                msg.created_at ? new Date(msg.created_at).toISOString() : '',
              ].join(',')
            )
          )
        }

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

  // ─── Import Logic ─────────────────────────────────────────────────────

  const parseImportFile = useCallback(
    async (file: File) => {
      try {
        if (file.name.endsWith('.json')) {
          const text = await file.text()
          const parsed = JSON.parse(text)

          if (typeof parsed !== 'object' || Array.isArray(parsed)) {
            toast.error(t.dataControl.invalidFile)
            return
          }

          const preview = {
            tasks: Array.isArray(parsed.tasks) ? parsed.tasks.length : 0,
            events: Array.isArray(parsed.events) ? parsed.events.length : 0,
            grocery: Array.isArray(parsed.groceryItems) ? parsed.groceryItems.length : 0,
            messages: Array.isArray(parsed.messages) ? parsed.messages.length : 0,
            total: 0,
          }
          preview.total = preview.tasks + preview.events + preview.grocery + preview.messages

          if (preview.total === 0) {
            toast.error(t.dataControl.importFailed)
            return
          }

          if (preview.tasks > 0 && !parsed.tasks[0]?.title) {
            toast.error(t.dataControl.importFailed)
            return
          }
          if (preview.events > 0 && !parsed.events[0]?.title) {
            toast.error(t.dataControl.importFailed)
            return
          }
          if (preview.grocery > 0 && !parsed.groceryItems[0]?.name) {
            toast.error(t.dataControl.importFailed)
            return
          }
          if (preview.messages > 0 && !parsed.messages[0]?.content) {
            toast.error(t.dataControl.importFailed)
            return
          }

          setImportPreview(preview)
          setImportData(parsed)
        } else if (file.name.endsWith('.csv')) {
          const text = await file.text()
          const lines = text.split('\n').filter((l) => l.trim() && !l.startsWith('---'))

          const taskStartIdx = lines.findIndex((l) =>
            l.toLowerCase().includes('title') && l.toLowerCase().includes('status')
          )

          if (taskStartIdx < 0) {
            toast.error(t.dataControl.importFailed)
            return
          }

          const taskLines = lines.slice(taskStartIdx + 1)
          const validTaskLines = taskLines.filter((l) => l.trim() && !l.startsWith('---') && !l.includes('Calendar') && !l.includes('Grocery') && !l.includes('Chat'))

          const preview = {
            tasks: validTaskLines.length,
            events: 0,
            grocery: 0,
            messages: 0,
            total: validTaskLines.length,
          }

          if (preview.total === 0) {
            toast.error(t.dataControl.importFailed)
            return
          }

          const taskObjects = validTaskLines.map((line, idx) => {
            const parts = line.split(',').map((p) => p.replace(/^"|"$/g, '').trim())
            return {
              id: `imported-task-${Date.now()}-${idx}`,
              title: parts[0] || `Task ${idx + 1}`,
              status: parts[1] || 'todo',
              priority: parts[2] || 'medium',
              due_date: parts[4] || null,
              created_at: new Date().toISOString(),
            }
          })

          setImportPreview(preview)
          setImportData({ tasks: taskObjects })
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) parseImportFile(file)
    },
    [parseImportFile]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) parseImportFile(file)
    },
    [parseImportFile]
  )

  const handleImportConfirm = useCallback(async () => {
    if (!importData) return

    setImporting(true)
    try {
      const taskStore = useTaskStore.getState()
      const groceryStore = useGroceryStore.getState()
      const calendarStore = useCalendarStore.getState()
      const chatStore = useChatStore.getState()

      if (Array.isArray(importData.tasks)) {
        const newTasks = (importData.tasks as Record<string, unknown>[]).map((task) => ({
          id: (task.id as string) || `imported-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          family_id: '',
          title: (task.title as string) || 'Untitled',
          description: (task.description as string) || null,
          status: (task.status as string) || 'todo',
          priority: (task.priority as string) || 'medium',
          assigned_to: (task.assigned_to as string) || null,
          created_by: '',
          due_date: (task.due_date as string) || null,
          completed_at: (task.completed_at as string) || null,
          created_at: (task.created_at as string) || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })) as Task[]
        taskStore.setTasks([...taskStore.tasks, ...newTasks])
      }

      if (Array.isArray(importData.events)) {
        const newEvents = (importData.events as Record<string, unknown>[]).map((event) => ({
          id: (event.id as string) || `imported-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          family_id: '',
          title: (event.title as string) || 'Untitled Event',
          description: (event.description as string) || null,
          start_time: (event.start_time as string) || new Date().toISOString(),
          end_time: (event.end_time as string) || null,
          all_day: (event.all_day as boolean) ?? false,
          color: (event.color as string) || null,
          created_by: '',
          created_at: (event.created_at as string) || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })) as CalendarEvent[]
        calendarStore.setEvents([...calendarStore.events, ...newEvents])
      }

      if (Array.isArray(importData.groceryItems)) {
        const newItems = (importData.groceryItems as Record<string, unknown>[]).map((item) => ({
          id: (item.id as string) || `imported-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          family_id: '',
          name: (item.name as string) || 'Unnamed Item',
          category: (item.category as string) || null,
          quantity: (item.quantity as number) ?? 1,
          checked: (item.checked as boolean) ?? false,
          added_by: '',
          created_at: (item.created_at as string) || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })) as GroceryItem[]
        groceryStore.setItems([...groceryStore.items, ...newItems])
      }

      if (Array.isArray(importData.messages)) {
        const newMessages = (importData.messages as Record<string, unknown>[]).map((msg) => ({
          id: (msg.id as string) || `imported-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          family_id: '',
          content: (msg.content as string) || '',
          sender_id: (msg.sender_id as string) || '',
          message_type: (msg.message_type as string) || 'text',
          reply_to: null,
          created_at: (msg.created_at as string) || new Date().toISOString(),
        })) as ChatMessage[]
        chatStore.setMessages([...chatStore.messages, ...newMessages])
      }

      setImportPreview(null)
      setImportData(null)
      setImportFile(null)
      setImportConfirmOpen(false)
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
          <span className="flex items-center gap-2">
            <HardDrive className="size-4 text-primary" /> {isRTL ? 'استخدام التخزين' : 'Storage Usage'}
          </span>
        </SectionTitle>
        <SectionDescription>{isRTL ? 'استهلاك التخزين الحالي' : 'Your current storage consumption'}</SectionDescription>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-foreground text-sm">2.4 GB of 5 GB</span>
              <span className="text-accent text-sm font-medium">48%</span>
            </div>
            <Progress value={48} className="h-2 bg-muted [&>div]:bg-primary" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted border border-border">
              <p className="text-muted-foreground text-xs">{t.files.title}</p>
              <p className="text-foreground text-sm font-medium">1.8 GB</p>
            </div>
            <div className="p-3 rounded-xl bg-muted border border-border">
              <p className="text-muted-foreground text-xs">{t.chat.title}</p>
              <p className="text-foreground text-sm font-medium">0.4 GB</p>
            </div>
            <div className="p-3 rounded-xl bg-muted border border-border">
              <p className="text-muted-foreground text-xs">{t.tasks.title} & {t.calendar.title}</p>
              <p className="text-foreground text-sm font-medium">0.1 GB</p>
            </div>
            <div className="p-3 rounded-xl bg-muted border border-border">
              <p className="text-muted-foreground text-xs">{isRTL ? 'أخرى' : 'Other'}</p>
              <p className="text-foreground text-sm font-medium">0.1 GB</p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Export Section */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Download className="size-4 text-primary" /> {t.dataControl.exportData}
          </span>
        </SectionTitle>
        <SectionDescription>
          {isRTL ? 'قم بتنزيل نسخة من بياناتك بالتنسيق المفضل لديك' : 'Download a copy of your data in your preferred format'}
        </SectionDescription>

        <div className="space-y-5">
          <div>
            <Label className="text-foreground text-xs mb-2 block">{t.dataControl.exportFormat}</Label>
            <div className="flex gap-2">
              <Button
                variant={exportFormat === 'json' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExportFormat('json')}
                className={
                  exportFormat === 'json'
                    ? 'bg-primary text-white hover:bg-primary/80 gap-1.5'
                    : 'border-border text-foreground hover:bg-muted gap-1.5'
                }
              >
                <FileJson className="size-4" />
                {t.dataControl.json}
              </Button>
              <Button
                variant={exportFormat === 'csv' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setExportFormat('csv')}
                className={
                  exportFormat === 'csv'
                    ? 'bg-primary text-white hover:bg-primary/80 gap-1.5'
                    : 'border-border text-foreground hover:bg-muted gap-1.5'
                }
              >
                <FileSpreadsheet className="size-4" />
                {t.dataControl.csv}
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-foreground text-xs">{t.dataControl.selectData}</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAllExport}
                className="text-accent text-xs h-6 px-2"
              >
                {isAllExportSelected ? t.dataControl.deselectAll : t.dataControl.selectAll}
              </Button>
            </div>

            <div className="space-y-2">
              {dataTypeItems.map(({ key, icon: Icon, label, count }) => (
                <div
                  key={key}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => toggleExport(key)}
                >
                  <Checkbox
                    checked={exportSelection[key]}
                    onCheckedChange={() => toggleExport(key)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Icon className="size-4 text-accent shrink-0" />
                  <span className="text-foreground text-sm flex-1">{label}</span>
                  <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <Button
            onClick={handleExport}
            disabled={exporting || !Object.values(exportSelection).some(Boolean)}
            className="w-full bg-primary hover:bg-primary/80 text-white gap-2"
          >
            {exporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {exporting ? t.dataControl.exporting : t.dataControl.exportData}
          </Button>
        </div>
      </SectionCard>

      {/* Import Section */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Upload className="size-4 text-primary" /> {t.dataControl.importData}
          </span>
        </SectionTitle>
        <SectionDescription>
          {isRTL ? 'قم باستيراد البيانات من ملف JSON أو CSV' : 'Import data from a JSON or CSV file'}
        </SectionDescription>

        <div className="space-y-4">
          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer
              ${isDragging
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-border bg-muted hover:border-primary/50 hover:bg-muted/80'
              }
            `}
            onClick={() => {
              const input = document.getElementById('import-file-input') as HTMLInputElement | null
              input?.click()
            }}
          >
            <input
              id="import-file-input"
              type="file"
              accept=".json,.csv"
              className="hidden"
              onChange={handleFileInput}
            />
            <motion.div
              animate={isDragging ? { scale: 1.05, y: -4 } : { scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Upload className={`size-10 mx-auto mb-3 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className="text-foreground text-sm font-medium mb-1">{t.dataControl.dropzone}</p>
              <p className="text-muted-foreground text-xs">{t.dataControl.supportedFormats}</p>
            </motion.div>
          </div>

          {/* File Selected Indicator */}
          {importFile && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20"
            >
              <FileJson className="size-5 text-accent" />
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-medium truncate">{importFile.name}</p>
                <p className="text-muted-foreground text-xs">
                  {(importFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setImportFile(null)
                  setImportPreview(null)
                  setImportData(null)
                }}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="size-4" />
              </Button>
            </motion.div>
          )}

          {/* Import Preview */}
          {importPreview && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-muted border border-border"
            >
              <h4 className="text-foreground text-sm font-semibold mb-3 flex items-center gap-2">
                <Eye className="size-4 text-accent" />
                {t.dataControl.importPreviewTitle}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {importPreview.tasks > 0 && (
                  <div className="p-2.5 rounded-lg bg-background border border-border">
                    <p className="text-muted-foreground text-xs">{t.dataControl.tasks}</p>
                    <p className="text-foreground text-sm font-medium">
                      {t.dataControl.itemCount.replace('{count}', String(importPreview.tasks))}
                    </p>
                  </div>
                )}
                {importPreview.events > 0 && (
                  <div className="p-2.5 rounded-lg bg-background border border-border">
                    <p className="text-muted-foreground text-xs">{t.dataControl.events}</p>
                    <p className="text-foreground text-sm font-medium">
                      {t.dataControl.itemCount.replace('{count}', String(importPreview.events))}
                    </p>
                  </div>
                )}
                {importPreview.grocery > 0 && (
                  <div className="p-2.5 rounded-lg bg-background border border-border">
                    <p className="text-muted-foreground text-xs">{t.dataControl.grocery}</p>
                    <p className="text-foreground text-sm font-medium">
                      {t.dataControl.itemCount.replace('{count}', String(importPreview.grocery))}
                    </p>
                  </div>
                )}
                {importPreview.messages > 0 && (
                  <div className="p-2.5 rounded-lg bg-background border border-border">
                    <p className="text-muted-foreground text-xs">{t.dataControl.messages}</p>
                    <p className="text-foreground text-sm font-medium">
                      {t.dataControl.itemCount.replace('{count}', String(importPreview.messages))}
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-accent text-xs font-medium">
                  {isRTL ? 'الإجمالي' : 'Total'}: {t.dataControl.itemCount.replace('{count}', String(importPreview.total))}
                </p>
              </div>
            </motion.div>
          )}

          {/* Import Button */}
          <Button
            onClick={() => setImportConfirmOpen(true)}
            disabled={!importPreview || importing}
            className="w-full bg-primary hover:bg-primary/80 text-white gap-2"
          >
            {importing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {importing ? t.dataControl.applying : t.dataControl.importData}
          </Button>

          {/* Import Confirmation Dialog */}
          <AlertDialog open={importConfirmOpen} onOpenChange={setImportConfirmOpen}>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">
                  {t.dataControl.importData}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  {t.dataControl.importWarning.replace('{count}', String(importPreview?.total ?? 0))}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-muted border-border text-foreground">
                  {t.common.cancel}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleImportConfirm}
                  className="bg-primary text-white hover:bg-primary/80"
                >
                  {t.common.confirm}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SectionCard>

      {/* Clear Data Section */}
      <SectionCard className="border-[#EF4444]/20">
        <SectionTitle className="text-[#EF4444]">
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-4" /> {t.dataControl.clearData}
          </span>
        </SectionTitle>
        <SectionDescription>
          {isRTL ? 'إزالة البيانات نهائيًا من USRA PLUS' : 'Permanently remove data from USRA PLUS'}
        </SectionDescription>

        <div className="space-y-4">
          <Alert className="bg-[#EF4444]/5 border-[#EF4444]/20">
            <AlertTriangle className="size-4 text-[#EF4444]" />
            <AlertDescription className="text-[#EF4444]/80 text-xs">
              {t.dataControl.clearWarning}
            </AlertDescription>
          </Alert>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-foreground text-xs">{t.dataControl.selectData}</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAllClear}
                className="text-[#EF4444]/70 text-xs h-6 px-2 hover:text-[#EF4444]"
              >
                {isAllClearSelected ? t.dataControl.deselectAll : t.dataControl.selectAll}
              </Button>
            </div>

            <div className="space-y-2">
              {dataTypeItems.map(({ key, icon: Icon, label, count }) => (
                <div
                  key={key}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => toggleClear(key)}
                >
                  <Checkbox
                    checked={clearSelection[key]}
                    onCheckedChange={() => toggleClear(key)}
                    className="data-[state=checked]:bg-[#EF4444] data-[state=checked]:border-[#EF4444]"
                  />
                  <Icon className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground text-sm flex-1">{label}</span>
                  <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="destructive"
            onClick={() => setClearConfirmOpen(true)}
            disabled={!Object.values(clearSelection).some(Boolean) || clearing}
            className="w-full gap-2"
          >
            {clearing ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            {clearing ? t.common.loading : t.dataControl.clearData}
          </Button>

          <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[#EF4444]">
                  {t.dataControl.clearData}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  {t.dataControl.clearWarning}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-muted border-border text-foreground">
                  {t.common.cancel}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearConfirm}
                  className="bg-[#EF4444] text-white hover:bg-[#EF4444]/80"
                >
                  {t.common.confirm}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SectionCard>
    </>
  )
}

// ─── Integrations Section ──────────────────────────────────────────────────

function IntegrationsSection() {
  const { t, isRTL } = useI18n()
  const { currentFamily, setCurrentFamily } = useAppStore()
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const inviteCode = currentFamily?.invite_code ?? 'DEMO-CODE'
  const familyName = currentFamily?.name ?? (isRTL ? 'عائلتي' : 'My Family')

  const handleCopyCode = useCallback(() => {
    try {
      navigator.clipboard.writeText(inviteCode)
      setCopied(true)
      toast.success(t.integrations.copiedToClipboard)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t.common.error)
    }
  }, [inviteCode, t.integrations.copiedToClipboard, t.common.error])

  const handleShareWhatsApp = useCallback(() => {
    const text = encodeURIComponent(`${t.integrations.shareWhatsAppText} ${inviteCode}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }, [inviteCode, t.integrations.shareWhatsAppText])

  const handleRegenerateCode = useCallback(async () => {
    if (!currentFamily) return
    setRegenerating(true)
    try {
      const newCode = `${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      const supabase = createClient()
      const { error } = await supabase
        .from('families')
        .update({ invite_code: newCode })
        .eq('id', currentFamily.id)
      if (error) throw error
      setCurrentFamily({ ...currentFamily, invite_code: newCode })
      toast.success(isRTL ? 'تم إعادة توليد رمز الدعوة' : 'Invite code regenerated')
    } catch {
      const newCode = `${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      setCurrentFamily({ ...currentFamily, invite_code: newCode } as NonNullable<typeof currentFamily>)
      toast.success(isRTL ? 'تم إعادة توليد رمز الدعوة' : 'Invite code regenerated')
    } finally {
      setRegenerating(false)
    }
  }, [currentFamily, setCurrentFamily, isRTL])

  const connectedApps = [
    {
      id: 'google-calendar',
      name: t.integrations.googleCalendar,
      description: t.integrations.googleCalendarDesc,
      icon: CalendarDays,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      id: 'apple-health',
      name: t.integrations.appleHealth,
      description: t.integrations.appleHealthDesc,
      icon: Heart,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
    {
      id: 'smart-home',
      name: t.integrations.smartHome,
      description: t.integrations.smartHomeDesc,
      icon: Home,
      color: 'text-accent',
      bgColor: 'bg-emerald-500/10',
    },
  ]

  return (
    <>
      {/* Family Invite Card */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <QrCode className="size-4 text-primary" /> {t.integrations.familyInvite}
          </span>
        </SectionTitle>
        <SectionDescription>{t.integrations.scanToJoin}</SectionDescription>

        {/* QR Code Component */}
        <div className="flex justify-center my-4">
          <FamilyQRCode
            inviteCode={inviteCode}
            familyName={familyName}
            size={180}
          />
        </div>

        <Separator className="my-4 bg-muted" />

        {/* Invite Code with Copy */}
        <div>
          <span className="text-muted-foreground text-xs block mb-2">{t.integrations.inviteCode}</span>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-accent font-mono text-sm tracking-widest">
              {inviteCode}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="border-border text-foreground hover:bg-muted"
            >
              {copied ? <Check className="size-4 text-green-400" /> : <Copy className="size-4" />}
              {copied ? t.common.copied : t.settings.copyCode}
            </Button>
          </div>
        </div>

        <Separator className="my-4 bg-muted" />

        {/* Share Options */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareWhatsApp}
            className="flex-1 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 rounded-xl border-[#25D366]/20"
          >
            <MessageCircle className="size-4" />
            {t.integrations.shareViaWhatsApp}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"
              >
                <RefreshCw className="size-4" />
                {t.integrations.regenerateCode}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">
                  {t.integrations.regenerateConfirmTitle}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  {t.integrations.regenerateConfirmDesc}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-muted border-border text-foreground">
                  {t.common.cancel}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRegenerateCode}
                  disabled={regenerating}
                  className="bg-primary text-white hover:bg-primary/80"
                >
                  {regenerating ? <Loader2 className="size-4 animate-spin" /> : t.integrations.regenerateCode}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SectionCard>

      {/* Connected Apps */}
      <SectionCard>
        <SectionTitle>
          <span className="flex items-center gap-2">
            <Plug className="size-4 text-primary" /> {t.integrations.connectedApps}
          </span>
        </SectionTitle>
        <SectionDescription>
          {isRTL ? 'المزيد من التكاملات في الطريق. استكشف الميزات المتاحة مع خطتك الحالية.' : 'More integrations are on the way. Explore the features available with your current plan.'}
        </SectionDescription>

        <div className="space-y-3">
          {connectedApps.map((app) => (
            <div
              key={app.id}
              className="flex items-center gap-3 p-4 rounded-xl opacity-60 bg-muted border border-border"
            >
              <div className={`size-10 rounded-lg ${app.bgColor} flex items-center justify-center`}>
                <app.icon className={`size-5 ${app.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-medium">{app.name}</p>
                <p className="text-muted-foreground text-xs">{app.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-500/10 text-accent border-emerald-500/20 text-xs">
                  {t.integrations.comingSoon}
                </Badge>
                <Lock className="size-3.5 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <Alert className="bg-primary/5 border-primary/20">
        <Sparkles className="size-4 text-accent" />
        <AlertDescription className="text-accent text-sm">
          {isRTL
            ? 'اربط تطبيقاتك المفضلة بـ USRA PLUS. يدعم حاليًا رموز QR العائلية ومشاركة واتساب.'
            : 'Connect your favorite apps to USRA PLUS. Currently supporting Family QR codes and WhatsApp sharing.'}
        </AlertDescription>
      </Alert>
    </>
  )
}
