'use client'

import { useEffect, useCallback, useRef } from 'react'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  CheckSquare,
  CalendarDays,
  ShoppingCart,
  MessageSquare,
  FolderOpen,
  Settings,
  Plus,
  CalendarPlus,
  PlusCircle,
  Send,
  Globe,
  Search,
  ArrowRight,
  Pencil,
  Check,
} from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { useTaskStore } from '@/stores/task-store'
import { useI18n } from '@/i18n/use-translation'
import { useAuthStore } from '@/stores/auth-store'
import type { AppPage, Task, TaskStatus } from '@/types'

// ─── Recent items (persisted in localStorage) ─────────────────────
interface RecentItem {
  value: string
  label: string
  type: 'page' | 'action'
  timestamp: number
}

const RECENT_KEY = 'usra-command-recent'
const MAX_RECENT = 5

function getRecentItems(): RecentItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function addRecentItem(item: Omit<RecentItem, 'timestamp'>) {
  if (typeof window === 'undefined') return
  try {
    const existing = getRecentItems().filter((r) => r.value !== item.value)
    existing.unshift({ ...item, timestamp: Date.now() })
    localStorage.setItem(RECENT_KEY, JSON.stringify(existing.slice(0, MAX_RECENT)))
  } catch {
    // ignore
  }
}

// ─── Page definitions ─────────────────────────────────────────────
interface PageItem {
  id: AppPage
  labelKey: keyof import('@/i18n/en').TranslationKeys['nav']
  icon: React.ElementType
  keywords: string[]
}

const pages: PageItem[] = [
  { id: 'dashboard', labelKey: 'dashboard', icon: LayoutDashboard, keywords: ['home', 'main', 'overview', 'لوحة'] },
  { id: 'tasks', labelKey: 'tasks', icon: CheckSquare, keywords: ['todo', 'checklist', 'مهمة', 'مهام'] },
  { id: 'calendar', labelKey: 'calendar', icon: CalendarDays, keywords: ['events', 'schedule', 'تقويم', 'أحداث'] },
  { id: 'grocery', labelKey: 'grocery', icon: ShoppingCart, keywords: ['shopping', 'list', 'بقالة', 'تسوق'] },
  { id: 'chat', labelKey: 'chat', icon: MessageSquare, keywords: ['messages', 'talk', 'محادثة', 'رسائل'] },
  { id: 'files', labelKey: 'files', icon: FolderOpen, keywords: ['documents', 'uploads', 'ملفات', 'مستندات'] },
  { id: 'settings', labelKey: 'settings', icon: Settings, keywords: ['preferences', 'config', 'إعدادات', 'تفضيلات'] },
]

// ─── Quick action definitions ─────────────────────────────────────
interface QuickAction {
  id: string
  labelEn: string
  labelAr: string
  icon: React.ElementType
  action: () => void
  keywords: string[]
}

// ─── Component ────────────────────────────────────────────────────
export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setCurrentPage } = useAppStore()
  const { tasks, setShowAddTask, setEditingTask, updateTask } = useTaskStore()
  const { t, language, isRTL, setLanguage } = useI18n()
  const { user } = useAuthStore()
  const inputRef = useRef<HTMLInputElement>(null)

  // Close on Escape
  const closePalette = useCallback(() => {
    setCommandPaletteOpen(false)
  }, [setCommandPaletteOpen])

  // Global keyboard shortcut: ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(!commandPaletteOpen)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commandPaletteOpen, setCommandPaletteOpen])

  // Focus input when opened
  useEffect(() => {
    if (commandPaletteOpen) {
      // Small delay so cmdk can mount first
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [commandPaletteOpen])

  // Navigate to page
  const navigateToPage = useCallback(
    (page: AppPage) => {
      setCurrentPage(page)
      addRecentItem({ value: `page-${page}`, label: t.nav[pages.find((p) => p.id === page)?.labelKey || 'dashboard'], type: 'page' })
      closePalette()
    },
    [setCurrentPage, t, closePalette]
  )

  // Mark task complete
  const markTaskComplete = useCallback(
    (task: Task) => {
      const newStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done'
      updateTask({
        ...task,
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null,
      })
      closePalette()
    },
    [updateTask, closePalette]
  )

  // Edit task
  const editTask = useCallback(
    (task: Task) => {
      setEditingTask(task)
      setCurrentPage('tasks')
      addRecentItem({ value: `action-edit-task`, label: isRTL ? 'تعديل مهمة' : 'Edit Task', type: 'action' })
      closePalette()
    },
    [setEditingTask, setCurrentPage, isRTL, closePalette]
  )

  // Switch language
  const switchLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'ar' : 'en')
    addRecentItem({ value: 'action-switch-lang', label: isRTL ? 'تبديل اللغة' : 'Switch Language', type: 'action' })
    closePalette()
  }, [language, setLanguage, isRTL, closePalette])

  // Quick actions
  const quickActions: QuickAction[] = [
    {
      id: 'add-task',
      labelEn: 'Add Task',
      labelAr: 'إضافة مهمة',
      icon: Plus,
      action: () => {
        setShowAddTask(true)
        setCurrentPage('tasks')
        addRecentItem({ value: 'action-add-task', label: isRTL ? 'إضافة مهمة' : 'Add Task', type: 'action' })
        closePalette()
      },
      keywords: ['new task', 'create', 'مهمة جديدة', 'إنشاء'],
    },
    {
      id: 'add-event',
      labelEn: 'Add Event',
      labelAr: 'إضافة حدث',
      icon: CalendarPlus,
      action: () => {
        setCurrentPage('calendar')
        addRecentItem({ value: 'action-add-event', label: isRTL ? 'إضافة حدث' : 'Add Event', type: 'action' })
        closePalette()
      },
      keywords: ['new event', 'create event', 'حدث جديد'],
    },
    {
      id: 'add-grocery',
      labelEn: 'Add Grocery Item',
      labelAr: 'إضافة عنصر بقالة',
      icon: PlusCircle,
      action: () => {
        setCurrentPage('grocery')
        addRecentItem({ value: 'action-add-grocery', label: isRTL ? 'إضافة عنصر بقالة' : 'Add Grocery Item', type: 'action' })
        closePalette()
      },
      keywords: ['new grocery', 'shopping item', 'عنصر جديد', 'بقالة'],
    },
    {
      id: 'send-message',
      labelEn: 'Send Message',
      labelAr: 'إرسال رسالة',
      icon: Send,
      action: () => {
        setCurrentPage('chat')
        addRecentItem({ value: 'action-send-msg', label: isRTL ? 'إرسال رسالة' : 'Send Message', type: 'action' })
        closePalette()
      },
      keywords: ['chat', 'message', 'محادثة', 'رسالة'],
    },
    {
      id: 'switch-language',
      labelEn: 'Switch Language',
      labelAr: 'تبديل اللغة',
      icon: Globe,
      action: switchLanguage,
      keywords: ['language', 'arabic', 'english', 'لغة', 'عربي', 'إنجليزي'],
    },
  ]

  // Recent items
  const recentItems = getRecentItems()

  const dir = isRTL ? 'rtl' : 'ltr'

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={closePalette}
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed inset-x-0 top-[12%] z-50 mx-auto w-full max-w-xl px-4"
            dir={dir}
          >
            <Command
              loop
              className="rounded-2xl border border-white/[0.08] bg-[#111117]/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden"
              shouldFilter
            >
              {/* Search Input */}
              <div className="flex items-center border-b border-white/[0.08] px-4">
                <Search className="size-4 shrink-0 text-[#6B7280]" />
                <Command.Input
                  ref={inputRef}
                  placeholder={isRTL ? 'ابحث عن صفحة، إجراء، أو مهمة...' : 'Search pages, actions, or tasks...'}
                  className="flex-1 bg-transparent px-3 py-3.5 text-sm text-[#E5E7EB] placeholder:text-[#6B7280] outline-none"

                />
                <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-[#6B7280] shrink-0">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <Command.List className="max-h-80 overflow-y-auto p-2 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10">
                {/* Empty state */}
                <Command.Empty className="py-8 text-center text-sm text-[#6B7280]">
                  {isRTL ? 'لا توجد نتائج' : 'No results found'}
                </Command.Empty>

                {/* Recent Group */}
                {recentItems.length > 0 && (
                  <Command.Group
                    heading={isRTL ? 'الأخيرة' : 'Recent'}
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[#6B7280]"
                  >
                    {recentItems.map((item) => {
                      const isPage = item.type === 'page'
                      const pageId = item.value.replace('page-', '')
                      const pageDef = pages.find((p) => p.id === pageId)
                      const Icon = pageDef?.icon || (isPage ? ArrowRight : ArrowRight)
                      return (
                        <Command.Item
                          key={item.value}
                          value={item.value + ' ' + item.label}
                          onSelect={() => {
                            if (isPage && pageDef) {
                              navigateToPage(pageId as AppPage)
                            }
                          }}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#E5E7EB] cursor-pointer data-[selected=true]:bg-[#6366F1]/15 data-[selected=true]:text-white transition-colors"
                        >
                          <Icon className="size-4 shrink-0 text-[#6B7280] data-[selected=true]:text-[#6366F1]" />
                          <span className="flex-1 truncate">{item.label}</span>
                          <span className="text-[10px] text-[#6B7280] uppercase tracking-wide">
                            {isRTL ? (isPage ? 'صفحة' : 'إجراء') : (isPage ? 'Page' : 'Action')}
                          </span>
                        </Command.Item>
                      )
                    })}
                  </Command.Group>
                )}

                {/* Pages Group */}
                <Command.Group
                  heading={isRTL ? 'الصفحات' : 'Pages'}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[#6B7280]"
                >
                  {pages.map((page) => {
                    const Icon = page.icon
                    const label = t.nav[page.labelKey]
                    return (
                      <Command.Item
                        key={page.id}
                        value={`page-${page.id} ${label} ${page.keywords.join(' ')}`}
                        onSelect={() => navigateToPage(page.id)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#E5E7EB] cursor-pointer data-[selected=true]:bg-[#6366F1]/15 data-[selected=true]:text-white transition-colors"
                      >
                        <Icon className="size-4 shrink-0 text-[#6B7280] group-data-[selected=true]:text-[#6366F1]" />
                        <span className="flex-1 truncate">{label}</span>
                        <span className="text-[10px] text-[#6B7280]">
                          {page.id === 'dashboard' ? '⌘1' : page.id === 'tasks' ? '⌘2' : page.id === 'calendar' ? '⌘3' : page.id === 'grocery' ? '⌘4' : page.id === 'chat' ? '⌘5' : page.id === 'files' ? '⌘6' : '⌘7'}
                        </span>
                      </Command.Item>
                    )
                  })}
                </Command.Group>

                {/* Quick Actions Group */}
                <Command.Group
                  heading={isRTL ? 'إجراءات سريعة' : 'Quick Actions'}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[#6B7280]"
                >
                  {quickActions.map((action) => {
                    const Icon = action.icon
                    const label = isRTL ? action.labelAr : action.labelEn
                    return (
                      <Command.Item
                        key={action.id}
                        value={`${action.id} ${label} ${action.keywords.join(' ')}`}
                        onSelect={action.action}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#E5E7EB] cursor-pointer data-[selected=true]:bg-[#6366F1]/15 data-[selected=true]:text-white transition-colors"
                      >
                        <Icon className="size-4 shrink-0 text-[#6B7280]" />
                        <span className="flex-1 truncate">{label}</span>
                        <span className="text-[10px] text-[#6B7280] uppercase tracking-wide">
                          {isRTL ? 'إجراء' : 'Action'}
                        </span>
                      </Command.Item>
                    )
                  })}
                </Command.Group>

                {/* Tasks Group */}
                {tasks.length > 0 && (
                  <Command.Group
                    heading={isRTL ? 'المهام' : 'Tasks'}
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[#6B7280]"
                  >
                    {tasks.slice(0, 8).map((task) => (
                      <Command.Item
                        key={task.id}
                        value={`task-${task.id} ${task.title} ${task.description || ''} ${task.priority} ${task.status}`}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#E5E7EB] cursor-pointer data-[selected=true]:bg-[#6366F1]/15 data-[selected=true]:text-white transition-colors"
                        onSelect={() => editTask(task)}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            markTaskComplete(task)
                          }}
                          className={`size-4 shrink-0 rounded border transition-colors flex items-center justify-center ${
                            task.status === 'done'
                              ? 'bg-[#6366F1] border-[#6366F1] text-white'
                              : 'border-white/20 hover:border-[#6366F1]'
                          }`}
                          aria-label={task.status === 'done' ? 'Mark as incomplete' : 'Mark as complete'}
                        >
                          {task.status === 'done' && <Check className="size-2.5" />}
                        </button>
                        <span className={`flex-1 truncate ${task.status === 'done' ? 'line-through text-[#6B7280]' : ''}`}>
                          {task.title}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                              task.priority === 'urgent'
                                ? 'bg-red-500/15 text-red-400'
                                : task.priority === 'high'
                                  ? 'bg-orange-500/15 text-orange-400'
                                  : task.priority === 'medium'
                                    ? 'bg-yellow-500/15 text-yellow-400'
                                    : 'bg-green-500/15 text-green-400'
                            }`}
                          >
                            {isRTL
                              ? t.tasks[task.priority as keyof typeof t.tasks] || task.priority
                              : task.priority}
                          </span>
                          <Pencil className="size-3 text-[#6B7280] opacity-0 group-data-[selected=true]:opacity-100" />
                        </div>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Footer hint */}
                <div className="flex items-center justify-between border-t border-white/[0.06] px-3 py-2 mt-1">
                  <div className="flex items-center gap-3 text-[10px] text-[#6B7280]">
                    <span className="flex items-center gap-1">
                      <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-1 py-0.5 text-[9px]">↑↓</kbd>
                      {isRTL ? 'تنقل' : 'Navigate'}
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-1 py-0.5 text-[9px]">↵</kbd>
                      {isRTL ? 'اختيار' : 'Select'}
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-1 py-0.5 text-[9px]">esc</kbd>
                      {isRTL ? 'إغلاق' : 'Close'}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#6B7280]">
                    {user?.first_name || 'User'}
                  </span>
                </div>
              </Command.List>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
