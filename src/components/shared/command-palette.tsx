'use client'

import { useEffect, useCallback, useRef, useState, useMemo } from 'react'
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
 Clock,
 X,
 FileText,
 ShoppingBag,
 CalendarClock,
 MessageCircle,
 Sparkles,
 Wallet,
 UtensilsCrossed,
 Cake,
 Brush,
} from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { useTaskStore } from '@/stores/task-store'
import { useCalendarStore } from '@/stores/calendar-store'
import { useGroceryStore } from '@/stores/grocery-store'
import { useChatStore } from '@/stores/chat-store'
import { useFilesStore } from '@/stores/files-store'
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

// ─── Recent search history ────────────────────────────────────────
const SEARCH_HISTORY_KEY = 'usra-recent-searches'
const MAX_SEARCH_HISTORY = 5

function getSearchHistory(): string[] {
 if (typeof window === 'undefined') return []
 try {
  const raw = localStorage.getItem(SEARCH_HISTORY_KEY)
  return raw ? JSON.parse(raw) : []
 } catch {
  return []
 }
}

function addSearchHistory(query: string) {
 if (typeof window === 'undefined' || !query.trim()) return
 try {
  const existing = getSearchHistory().filter((q) => q !== query.trim())
  existing.unshift(query.trim())
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(existing.slice(0, MAX_SEARCH_HISTORY)))
 } catch {
  // ignore
 }
}

function clearSearchHistory() {
 if (typeof window === 'undefined') return
 try {
  localStorage.removeItem(SEARCH_HISTORY_KEY)
 } catch {
  // ignore
 }
}

function removeSearchHistoryItem(index: number) {
 if (typeof window === 'undefined') return
 try {
  const current = getSearchHistory()
  const updated = current.filter((_, i) => i !== index)
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated))
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
 { id: 'milestones', labelKey: 'milestones', icon: Cake, keywords: ['birthday', 'anniversary', 'milestone', 'مناسبة', 'عيد ميلاد', 'ذكرى'] },
 { id: 'chores', labelKey: 'chores', icon: Brush, keywords: ['household', 'rotation', 'chore', 'منزلية', 'تناوب', 'مهمة منزلية'] },
 { id: 'grocery', labelKey: 'grocery', icon: ShoppingCart, keywords: ['shopping', 'list', 'بقالة', 'تسوق'] },
 { id: 'meal-plan', labelKey: 'mealPlan', icon: UtensilsCrossed, keywords: ['meal', 'plan', 'food', 'recipe', 'وجبة', 'خطة', 'طعام', 'وصفة'] },
 { id: 'chat', labelKey: 'chat', icon: MessageSquare, keywords: ['messages', 'talk', 'محادثة', 'رسائل'] },
 { id: 'files', labelKey: 'files', icon: FolderOpen, keywords: ['documents', 'uploads', 'ملفات', 'مستندات'] },
 { id: 'budget', labelKey: 'budget', icon: Wallet, keywords: ['finance', 'money', 'expenses', 'budget', 'ميزانية', 'مصروفات', 'مال'] },
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

// ─── Content search result types ──────────────────────────────────
type ContentType = 'tasks' | 'events' | 'grocery' | 'chat' | 'files' | 'settings'

interface ContentSearchResult {
 id: string
 type: ContentType
 title: string
 subtitle: string
 snippet: string
 page: AppPage
 data?: unknown
}

// ─── Highlight matching text ──────────────────────────────────────
function HighlightMatch({ text, query }: { text: string; query: string }) {
 if (!query.trim()) return <>{text}</>

 const lowerText = text.toLowerCase()
 const lowerQuery = query.toLowerCase()
 const index = lowerText.indexOf(lowerQuery)

 if (index === -1) return <>{text}</>

 const before = text.slice(0, index)
 const match = text.slice(index, index + query.length)
 const after = text.slice(index + query.length)

 return (
  <>
   {before}
   <span className="text-[--accent-primary] font-medium">{match}</span>
   {after}
  </>
 )
}

// ─── Type icon and color config ───────────────────────────────────
const typeConfig: Record<ContentType, { icon: React.ElementType; color: string; bgColor: string }> = {
 tasks: { icon: CheckSquare, color: 'text-[--accent-primary]', bgColor: 'bg-[--accent-primary]/15' },
 events: { icon: CalendarClock, color: 'text-[#22C55E]', bgColor: 'bg-[#22C55E]/15' },
 grocery: { icon: ShoppingBag, color: 'text-[var(--accent)]', bgColor: 'bg-[var(--accent)]/15' },
 chat: { icon: MessageCircle, color: 'text-[var(--accent-primary)]', bgColor: 'bg-[var(--accent-primary)]/15' },
 files: { icon: FileText, color: 'text-[var(--accent)]', bgColor: 'bg-[var(--accent)]/15' },
 settings: { icon: Settings, color: 'text-muted-foreground', bgColor: 'bg-[--text-muted]/15' },
}

// ─── Component ────────────────────────────────────────────────────
export function CommandPalette() {
 const { commandPaletteOpen, setCommandPaletteOpen, setCurrentPage } = useAppStore()
 // Lazy store reads: only access store data when palette is open to avoid
 // re-rendering on every store change while closed. Actions are stable refs.
 const { t, language, isRTL, setLanguage } = useI18n()
 const { user } = useAuthStore()
 const inputRef = useRef<HTMLInputElement>(null)

 // Read store data lazily — only when palette is open
 const tasks = commandPaletteOpen ? useTaskStore.getState().tasks : []
 const events = commandPaletteOpen ? useCalendarStore.getState().events : []
 const groceryItems = commandPaletteOpen ? useGroceryStore.getState().items : []
 const messages = commandPaletteOpen ? useChatStore.getState().messages : []
 const files = commandPaletteOpen ? useFilesStore.getState().files : []

 const [query, setQuery] = useState('')
 const [activeFilter, setActiveFilter] = useState<ContentType | 'all'>('all')
 // Use a version counter to re-derive search history from localStorage
 const [historyVersion, setHistoryVersion] = useState(0)

 // Derive search history from localStorage (cheap read, avoids setState in effects)
 const searchHistory = useMemo(() => getSearchHistory(), [historyVersion, commandPaletteOpen])

 // Custom close handler that also resets state
 const closePalette = useCallback(() => {
  setCommandPaletteOpen(false)
  setQuery('')
  setActiveFilter('all')
 }, [setCommandPaletteOpen])

 // Refresh search history (bumps version counter to trigger re-derivation)
 const refreshSearchHistory = useCallback(() => {
  setHistoryVersion((v) => v + 1)
 }, [])

 // Open palette and refresh history
 const openPalette = useCallback(() => {
  setCommandPaletteOpen(true)
  refreshSearchHistory()
 }, [setCommandPaletteOpen, refreshSearchHistory])

 // Global keyboard shortcut
 useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
   if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    if (commandPaletteOpen) {
     closePalette()
    } else {
     openPalette()
    }
   }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
 }, [commandPaletteOpen, closePalette, openPalette])

 // Focus input when opened
 useEffect(() => {
  if (commandPaletteOpen) {
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
   useTaskStore.getState().updateTask({
    ...task,
    status: newStatus,
    completed_at: newStatus === 'done' ? new Date().toISOString() : null,
   })
   closePalette()
  },
  [closePalette]
 )

 // Edit task
 const editTask = useCallback(
  (task: Task) => {
   useTaskStore.getState().setEditingTask(task)
   setCurrentPage('tasks')
   addRecentItem({ value: `action-edit-task`, label: isRTL ? 'تعديل مهمة' : 'Edit Task', type: 'action' })
   closePalette()
  },
  [setCurrentPage, isRTL, closePalette]
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
    useTaskStore.getState().setShowAddTask(true)
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
  {
   id: 'start-tour',
   labelEn: 'Start Tour',
   labelAr: 'بدء الجولة',
   icon: Sparkles,
   action: async () => {
    const { useTourStore } = await import('@/stores/tour-store')
    closePalette()
    setTimeout(() => {
     useTourStore.getState().startTour()
    }, 300)
    addRecentItem({ value: 'action-start-tour', label: isRTL ? 'بدء الجولة' : 'Start Tour', type: 'action' })
   },
   keywords: ['tour', 'guide', 'onboarding', 'help', 'جولة', 'دليل', 'مساعدة'],
  },
 ]

 // ─── Multi-content search ──────────────────────────────────────
 const contentResults = useMemo<ContentSearchResult[]>(() => {
  if (!query.trim()) return []

  const q = query.toLowerCase()
  const results: ContentSearchResult[] = []

  // Search tasks
  if (activeFilter === 'all' || activeFilter === 'tasks') {
   tasks.forEach((task) => {
    const titleMatch = task.title.toLowerCase().includes(q)
    const descMatch = task.description?.toLowerCase().includes(q) ?? false
    const assigneeMatch = task.assignee?.first_name?.toLowerCase().includes(q) ?? false

    if (titleMatch || descMatch || assigneeMatch) {
     results.push({
      id: `task-${task.id}`,
      type: 'tasks',
      title: task.title,
      subtitle: t.search.inTasks,
      snippet: task.description
       ? task.description.slice(0, 80) + (task.description.length > 80 ? '...' : '')
       : task.priority + ' · ' + task.status,
      page: 'tasks',
      data: task,
     })
    }
   })
  }

  // Search events
  if (activeFilter === 'all' || activeFilter === 'events') {
   events.forEach((event) => {
    const titleMatch = event.title.toLowerCase().includes(q)
    const descMatch = event.description?.toLowerCase().includes(q) ?? false

    if (titleMatch || descMatch) {
     results.push({
      id: `event-${event.id}`,
      type: 'events',
      title: event.title,
      subtitle: t.search.inCalendar,
      snippet: event.description
       ? event.description.slice(0, 80) + (event.description.length > 80 ? '...' : '')
       : (event.all_day ? (isRTL ? 'طوال اليوم' : 'All day') : new Date(event.start_time).toLocaleString()),
      page: 'calendar',
      data: event,
     })
    }
   })
  }

  // Search grocery items
  if (activeFilter === 'all' || activeFilter === 'grocery') {
   groceryItems.forEach((item) => {
    const nameMatch = item.name.toLowerCase().includes(q)

    if (nameMatch) {
     results.push({
      id: `grocery-${item.id}`,
      type: 'grocery',
      title: item.name,
      subtitle: t.search.inGrocery,
      snippet: item.category
       ? (isRTL ? `الفئة: ${item.category}` : `Category: ${item.category}`) + (item.checked ? (isRTL ? ' · مكتمل' : ' · Checked') : '')
       : (item.checked ? (isRTL ? 'مكتمل' : 'Checked') : (isRTL ? 'قيد الانتظار' : 'Pending')),
      page: 'grocery',
      data: item,
     })
    }
   })
  }

  // Search chat messages
  if (activeFilter === 'all' || activeFilter === 'chat') {
   messages.forEach((msg) => {
    const contentMatch = msg.content.toLowerCase().includes(q)

    if (contentMatch) {
     const senderName = msg.sender?.first_name || (isRTL ? 'مستخدم' : 'User')
     results.push({
      id: `chat-${msg.id}`,
      type: 'chat',
      title: senderName,
      subtitle: t.search.inChat,
      snippet: msg.content.slice(0, 80) + (msg.content.length > 80 ? '...' : ''),
      page: 'chat',
      data: msg,
     })
    }
   })
  }

  // Search files
  if (activeFilter === 'all' || activeFilter === 'files') {
   files.forEach((file) => {
    const nameMatch = file.name.toLowerCase().includes(q)

    if (nameMatch) {
     results.push({
      id: `file-${file.id}`,
      type: 'files',
      title: file.name,
      subtitle: t.search.inFiles,
      snippet: file.file_type + ' · ' + (file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : ''),
      page: 'files',
      data: file,
     })
    }
   })
  }

  // Search settings tabs
  if (activeFilter === 'all' || activeFilter === 'settings') {
   const settingsTabs = [
    { id: 'family', label: t.settings.family },
    { id: 'user', label: t.settings.user },
    { id: 'account', label: t.settings.account },
    { id: 'preferences', label: t.settings.preferences },
    { id: 'security', label: t.settings.security },
    { id: 'data', label: t.settings.data },
    { id: 'integrations', label: t.settings.integrations },
    { id: 'premium', label: t.settings.premium },
   ]

   settingsTabs.forEach((tab) => {
    if (tab.label.toLowerCase().includes(q)) {
     results.push({
      id: `settings-${tab.id}`,
      type: 'settings',
      title: tab.label,
      subtitle: t.search.inSettings,
      snippet: isRTL ? `الانتقال إلى ${tab.label}` : `Go to ${tab.label}`,
      page: 'settings',
     })
    }
   })
  }

  return results
 }, [query, activeFilter, tasks, events, groceryItems, messages, files, isRTL, t])

 // Group results by type
 const groupedResults = useMemo(() => {
  const groups: Record<ContentType, ContentSearchResult[]> = {
   tasks: [],
   events: [],
   grocery: [],
   chat: [],
   files: [],
   settings: [],
  }

  contentResults.forEach((result) => {
   groups[result.type].push(result)
  })

  return groups
 }, [contentResults])

 // Type group labels
 const typeLabels: Record<ContentType, string> = {
  tasks: t.search.filterTasks,
  events: t.search.filterEvents,
  grocery: t.search.filterGrocery,
  chat: t.search.filterChat,
  files: t.search.filterFiles,
  settings: isRTL ? 'الإعدادات' : 'Settings',
 }

 // Handle content result click
 const handleContentResultClick = useCallback(
  (result: ContentSearchResult) => {
   addSearchHistory(query)

   if (result.type === 'tasks' && result.data) {
    useTaskStore.getState().setEditingTask(result.data as Task)
   }

   setCurrentPage(result.page)
   closePalette()
  },
  [query, setCurrentPage, closePalette]
 )

 // Handle recent search click
 const handleRecentSearchClick = useCallback(
  (searchQuery: string) => {
   setQuery(searchQuery)
   inputRef.current?.focus()
  },
  []
 )

 // Handle clear search history
 const handleClearHistory = useCallback(() => {
  clearSearchHistory()
  refreshSearchHistory()
 }, [refreshSearchHistory])

 // Handle remove single search history item
 const handleRemoveSearchItem = useCallback(
  (index: number) => {
   removeSearchHistoryItem(index)
   refreshSearchHistory()
  },
  [refreshSearchHistory]
 )

 // Recent items
 const recentItems = getRecentItems()

 // Filter pills config
 const filterPills: { key: ContentType | 'all'; label: string }[] = [
  { key: 'all', label: t.search.filterAll },
  { key: 'tasks', label: t.search.filterTasks },
  { key: 'events', label: t.search.filterEvents },
  { key: 'grocery', label: t.search.filterGrocery },
  { key: 'chat', label: t.search.filterChat },
  { key: 'files', label: t.search.filterFiles },
 ]

 const hasContentResults = contentResults.length > 0
 const showContentSearch = query.trim().length > 0

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
       className="rounded-2xl border border-[--border-subtle] bg-[--bg-surface] backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden"
       shouldFilter={false}
       aria-label="Command palette"
      >
       {/* Search Input */}
       <div className="flex items-center border-b border-[--border-subtle] px-4">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <Command.Input
         ref={inputRef}
         value={query}
         onValueChange={setQuery}
         placeholder={t.search.searchAll}
         className="flex-1 bg-transparent px-3 py-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-[--border-subtle] bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
         ESC
        </kbd>
       </div>

       {/* Filter Pills (show when there's a query) */}
       {showContentSearch && (
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-[--border-subtle] overflow-x-auto">
         {filterPills.map((pill) => (
          <button
           key={pill.key}
           type="button"
           onClick={() => setActiveFilter(pill.key)}
           className={`text-xs px-3 py-1 rounded-full cursor-pointer transition-all whitespace-nowrap ${
            activeFilter === pill.key
             ? 'bg-[--accent-primary]/20 text-[--accent-primary] border border-primary/30'
             : 'bg-muted text-[var(--muted-foreground)] hover:bg-muted border border-transparent'
           }`}
          >
           {pill.label}
          </button>
         ))}
        </div>
       )}

       {/* Results */}
       <Command.List role="listbox" className="max-h-80 overflow-y-auto p-2 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted">

        {/* ─── No query state: Recent + Pages + Quick Actions ─── */}
        {!showContentSearch && (
         <>
          {/* Recent Search History */}
          {searchHistory.length > 0 && (
           <Command.Group
            heading={t.search.recentSearches}
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
           >
            <div className="flex items-center justify-between px-2 py-1">
             <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t.search.recentSearches}</span>
             <button
              type="button"
              onClick={(e) => {
               e.stopPropagation()
               handleClearHistory()
              }}
              className="text-[10px] text-muted-foreground hover:text-[--accent-primary] transition-colors cursor-pointer"
             >
              {t.search.clearHistory}
             </button>
            </div>
            {searchHistory.map((searchQuery, idx) => (
             <Command.Item
              key={`recent-search-${idx}`}
              value={`recent-search-${searchQuery}`}
              onSelect={() => handleRecentSearchClick(searchQuery)}
              role="option"
              className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-lg px-3 py-2.5 text-sm cursor-pointer data-[selected=true]:bg-[--accent-primary]/15 data-[selected=true]:text-foreground transition-colors"
             >
              <Clock className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-muted-foreground">{searchQuery}</span>
              <button
               type="button"
               onClick={(e) => {
                e.stopPropagation()
                handleRemoveSearchItem(idx)
               }}
               className="p-0.5 rounded hover:bg-muted transition-colors"
              >
               <X className="size-3 text-muted-foreground" />
              </button>
             </Command.Item>
            ))}
           </Command.Group>
          )}

          {/* Recent Group */}
          {recentItems.length > 0 && (
           <Command.Group
            heading={isRTL ? 'الأخيرة' : 'Recent'}
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
           >
            {recentItems.map((item) => {
             const isPage = item.type === 'page'
             const pageId = item.value.replace('page-', '')
             const pageDef = pages.find((p) => p.id === pageId)
             const Icon = pageDef?.icon || ArrowRight
             return (
              <Command.Item
               key={item.value}
               value={item.value + ' ' + item.label}
               onSelect={() => {
                if (isPage && pageDef) {
                 navigateToPage(pageId as AppPage)
                }
               }}
               role="option"
               className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground cursor-pointer data-[selected=true]:bg-[--accent-primary]/15 data-[selected=true]:text-foreground transition-colors"
              >
               <Icon className="size-4 shrink-0 text-muted-foreground data-[selected=true]:text-[--accent-primary]" />
               <span className="flex-1 truncate">{item.label}</span>
               <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
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
           className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
          >
           {pages.map((page) => {
            const Icon = page.icon
            const label = t.nav[page.labelKey]
            return (
             <Command.Item
              key={page.id}
              value={`page-${page.id} ${label} ${page.keywords.join(' ')}`}
              onSelect={() => navigateToPage(page.id)}
              role="option"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground cursor-pointer data-[selected=true]:bg-[--accent-primary]/15 data-[selected=true]:text-foreground transition-colors"
             >
              <Icon className="size-4 shrink-0 text-muted-foreground group-data-[selected=true]:text-[--accent-primary]" />
              <span className="flex-1 truncate">{label}</span>
              <span className="text-[10px] text-muted-foreground">
               {page.id === 'dashboard' ? '⌘1' : page.id === 'tasks' ? '⌘2' : page.id === 'calendar' ? '⌘3' : page.id === 'grocery' ? '⌘4' : page.id === 'chat' ? '⌘5' : page.id === 'files' ? '⌘6' : '⌘7'}
              </span>
             </Command.Item>
            )
           })}
          </Command.Group>

          {/* Quick Actions Group */}
          <Command.Group
           heading={isRTL ? 'إجراءات سريعة' : 'Quick Actions'}
           className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
          >
           {quickActions.map((action) => {
            const Icon = action.icon
            const label = isRTL ? action.labelAr : action.labelEn
            return (
             <Command.Item
              key={action.id}
              value={`${action.id} ${label} ${action.keywords.join(' ')}`}
              onSelect={action.action}
              role="option"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground cursor-pointer data-[selected=true]:bg-[--accent-primary]/15 data-[selected=true]:text-foreground transition-colors"
             >
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{label}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
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
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
           >
            {tasks.slice(0, 8).map((task) => (
             <Command.Item
              key={task.id}
              value={`task-${task.id} ${task.title} ${task.description || ''} ${task.priority} ${task.status}`}
              role="option"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground cursor-pointer data-[selected=true]:bg-[--accent-primary]/15 data-[selected=true]:text-foreground transition-colors"
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
                 ? 'bg-[--accent-primary] border-primary text-white'
                 : 'border-[--border-medium] hover:border-primary'
               }`}
               aria-label={task.status === 'done' ? 'Mark as incomplete' : 'Mark as complete'}
              >
               {task.status === 'done' && <Check className="size-2.5" />}
              </button>
              <span className={`flex-1 truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
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
               <Pencil className="size-3 text-muted-foreground opacity-0 group-data-[selected=true]:opacity-100" />
              </div>
             </Command.Item>
            ))}
           </Command.Group>
          )}
         </>
        )}

        {/* ─── Content search results (when query is typed) ─── */}
        {showContentSearch && (
         <>
          {/* No results */}
          {!hasContentResults && (
           <div className="py-8 text-center">
            <div className="mx-auto mb-2 p-2.5 rounded-xl bg-muted w-fit">
             <Search className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{t.search.noResults}</p>
            <p className="text-xs text-muted-foreground mt-1">{t.search.tryDifferentSearch}</p>
           </div>
          )}

          {/* Grouped results by type */}
          {(Object.entries(groupedResults) as [ContentType, ContentSearchResult[]][])
           .filter(([, items]) => items.length > 0)
           .map(([type, items]) => {
            return (
             <Command.Group
              key={type}
              heading={typeLabels[type]}
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
             >
              {items.map((result) => {
               const ItemIcon = typeConfig[result.type].icon
               return (
                <Command.Item
                 key={result.id}
                 value={`${result.id} ${result.title} ${result.snippet}`}
                 onSelect={() => handleContentResultClick(result)}
                 role="option"
                 className="px-3 py-2.5 rounded-lg hover:bg-muted cursor-pointer transition-colors flex items-center gap-3 data-[selected=true]:bg-[--accent-primary]/15 data-[selected=true]:text-foreground"
                >
                 {/* Type icon */}
                 <div className={`w-5 h-5 rounded-md flex items-center justify-center ${typeConfig[result.type].bgColor}`}>
                  <ItemIcon className={`size-3 ${typeConfig[result.type].color}`} />
                 </div>
                 {/* Content */}
                 <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                   <span className="text-sm text-foreground truncate">
                    <HighlightMatch text={result.title} query={query} />
                   </span>
                   <span className="text-[10px] text-muted-foreground shrink-0">{result.subtitle}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                   <HighlightMatch text={result.snippet} query={query} />
                  </p>
                 </div>
                 {/* Arrow */}
                 <ArrowRight className="size-3.5 text-muted-foreground shrink-0 opacity-0 group-data-[selected=true]:opacity-100" />
                </Command.Item>
               )
              })}
             </Command.Group>
            )
           })}
         </>
        )}

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-[--border-subtle] px-3 py-2 mt-1">
         <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
           <kbd className="rounded border border-[--border-subtle] bg-muted px-1 py-0.5 text-[9px]">↑↓</kbd>
           {isRTL ? 'تنقل' : 'Navigate'}
          </span>
          <span className="flex items-center gap-1">
           <kbd className="rounded border border-[--border-subtle] bg-muted px-1 py-0.5 text-[9px]">↵</kbd>
           {isRTL ? 'اختيار' : 'Select'}
          </span>
          <span className="flex items-center gap-1">
           <kbd className="rounded border border-[--border-subtle] bg-muted px-1 py-0.5 text-[9px]">esc</kbd>
           {isRTL ? 'إغلاق' : 'Close'}
          </span>
         </div>
         <span className="text-[10px] text-muted-foreground">
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
