'use client'

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Keyboard } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'
import { useTaskStore } from '@/stores/task-store'
import { useI18n } from '@/i18n/use-translation'
import type { AppPage } from '@/types'

// ─── Page mapping for ⌘1-7 shortcuts ─────────────────────────────
const PAGE_SHORTCUTS: { key: string; page: AppPage; labelKey: keyof import('@/i18n/en').TranslationKeys['shortcuts'] }[] = [
  { key: '1', page: 'dashboard', labelKey: 'dashboard' },
  { key: '2', page: 'tasks', labelKey: 'tasks' },
  { key: '3', page: 'calendar', labelKey: 'calendar' },
  { key: '4', page: 'grocery', labelKey: 'grocery' },
  { key: '5', page: 'chat', labelKey: 'chat' },
  { key: '6', page: 'files', labelKey: 'files' },
  { key: '7', page: 'settings', labelKey: 'settings' },
]

// ─── Keyboard shortcut key component ──────────────────────────────
function ShortcutKey({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-white/[0.06] border border-white/[0.1] rounded-md text-xs font-mono text-[var(--text-secondary)]">
      {children}
    </span>
  )
}

// ─── Shortcut row component ───────────────────────────────────────
function ShortcutRow({ label, shortcut }: { label: string; shortcut: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <div className="flex items-center gap-1">{shortcut}</div>
    </div>
  )
}

// ─── Group header component ───────────────────────────────────────
function GroupHeader({ children, isFirst }: { children: React.ReactNode; isFirst?: boolean }) {
  return (
    <h3
      className={`text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 ${
        isFirst ? 'mt-0' : 'mt-4'
      }`}
    >
      {children}
    </h3>
  )
}

// ─── Global Keyboard Shortcuts Hook ───────────────────────────────
function useGlobalShortcuts() {
  const { setCurrentPage, setCommandPaletteOpen, setShortcutsModalOpen, shortcutsModalOpen, commandPaletteOpen, toggleSidebar } = useAppStore()
  const { language, setLanguage } = useI18n()
  const { setShowAddTask } = useTaskStore()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // ⌘K / Ctrl+K → Open Search (handled by command palette component)
      // We don't handle it here to avoid conflicts

      // ⌘/ / Ctrl+/ → Show Shortcuts (always works)
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setShortcutsModalOpen(!shortcutsModalOpen)
        return
      }

      // Escape → Close Dialog (always works)
      if (e.key === 'Escape') {
        if (shortcutsModalOpen) {
          setShortcutsModalOpen(false)
          return
        }
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false)
          return
        }
        return
      }

      // If command palette is open, don't process other shortcuts
      if (commandPaletteOpen) return

      // If shortcuts modal is open, only Esc should work (handled above)
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        setShortcutsModalOpen(!shortcutsModalOpen)
        return
      }

      // ⌘1-7 → Navigate to pages (always works, even in input)
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '7') {
        e.preventDefault()
        const pageShortcut = PAGE_SHORTCUTS.find((p) => p.key === e.key)
        if (pageShortcut) {
          setCurrentPage(pageShortcut.page)
          // Close any open overlays
          setShortcutsModalOpen(false)
          setCommandPaletteOpen(false)
        }
        return
      }

      // ⌘L / Ctrl+L → Switch Language
      // Note: ⌘L opens location bar in some browsers, but we preventDefault
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault()
        setLanguage(language === 'en' ? 'ar' : 'en')
        return
      }

      // ⌘\ / Ctrl+\ → Toggle Sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault()
        toggleSidebar()
        return
      }

      // Esc → Close dialog/overlay (only if one is open)
      if (e.key === 'Escape') {
        if (shortcutsModalOpen) {
          setShortcutsModalOpen(false)
          return
        }
        if (commandPaletteOpen) {
          setCommandPaletteOpen(false)
          return
        }
        return
      }

      // Single key shortcuts (only when no input is focused)
      if (isInputFocused) return

      // N → New Task
      if (e.key === 'n' || e.key === 'N') {
        // Don't trigger if meta/ctrl is held (that's ⌘N for new event)
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault()
          // ⌘N → New Event - navigate to calendar
          setCurrentPage('calendar')
          setShortcutsModalOpen(false)
          setCommandPaletteOpen(false)
          return
        }
        e.preventDefault()
        setShowAddTask(true)
        setCurrentPage('tasks')
        setShortcutsModalOpen(false)
        return
      }

      // E → Add Grocery Item
      if (e.key === 'e' || e.key === 'E') {
        if (e.metaKey || e.ctrlKey) return
        e.preventDefault()
        setCurrentPage('grocery')
        setShortcutsModalOpen(false)
        setCommandPaletteOpen(false)
        return
      }

      // ? → Help (open shortcuts modal)
      if (e.key === '?') {
        e.preventDefault()
        setShortcutsModalOpen(true)
        return
      }
    },
    [
      setCurrentPage,
      setCommandPaletteOpen,
      setShortcutsModalOpen,
      shortcutsModalOpen,
      commandPaletteOpen,
      toggleSidebar,
      language,
      setLanguage,
      setShowAddTask,
    ]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// ─── Main Component ───────────────────────────────────────────────
export function ShortcutsModal() {
  const { shortcutsModalOpen, setShortcutsModalOpen, setCommandPaletteOpen } = useAppStore()
  const { t, isRTL, language } = useI18n()

  // Register global keyboard shortcuts
  useGlobalShortcuts()

  const dir = isRTL ? 'rtl' : 'ltr'
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const modKey = isMac ? '⌘' : 'Ctrl'

  const close = useCallback(() => {
    setShortcutsModalOpen(false)
  }, [setShortcutsModalOpen])

  // Open from command palette
  const openShortcuts = useCallback(() => {
    setCommandPaletteOpen(false)
    setShortcutsModalOpen(true)
  }, [setCommandPaletteOpen, setShortcutsModalOpen])

  // Expose openShortcuts for command palette integration
  useEffect(() => {
    // Store a global reference so command palette can open it
    ;(window as unknown as Record<string, unknown>).__openShortcutsModal = openShortcuts
    return () => {
      delete (window as unknown as Record<string, unknown>).__openShortcutsModal
    }
  }, [openShortcuts])

  return (
    <AnimatePresence>
      {shortcutsModalOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            dir={dir}
          >
            <div
              className="bg-[var(--bg-surface)]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl max-w-lg w-full shadow-2xl shadow-black/40 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06]">
                <div className="flex items-center justify-center size-8 rounded-lg bg-[#6366F1]/10">
                  <Keyboard className="size-4 text-[#6366F1]" />
                </div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {t.shortcuts.keyboardShortcuts}
                </h2>
                <div className="flex-1" />
                <ShortcutKey>Esc</ShortcutKey>
              </div>

              {/* Shortcuts List */}
              <div className="px-6 py-4 max-h-[60vh] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10">
                {/* Navigation Group */}
                <GroupHeader isFirst>{t.shortcuts.navigation}</GroupHeader>

                <ShortcutRow
                  label={t.shortcuts.openSearch}
                  shortcut={<ShortcutKey>{modKey}K</ShortcutKey>}
                />
                <ShortcutRow
                  label={t.shortcuts.showShortcuts}
                  shortcut={<ShortcutKey>{modKey}/</ShortcutKey>}
                />

                {PAGE_SHORTCUTS.map((p) => (
                  <ShortcutRow
                    key={p.key}
                    label={t.shortcuts[p.labelKey]}
                    shortcut={<ShortcutKey>{modKey}{p.key}</ShortcutKey>}
                  />
                ))}

                {/* Actions Group */}
                <GroupHeader>{t.shortcuts.actions}</GroupHeader>

                <ShortcutRow
                  label={t.shortcuts.newTask}
                  shortcut={<ShortcutKey>N</ShortcutKey>}
                />
                <ShortcutRow
                  label={t.shortcuts.newEvent}
                  shortcut={<ShortcutKey>{modKey}N</ShortcutKey>}
                />
                <ShortcutRow
                  label={t.shortcuts.addGroceryItem}
                  shortcut={<ShortcutKey>E</ShortcutKey>}
                />
                <ShortcutRow
                  label={t.shortcuts.switchLanguage}
                  shortcut={<ShortcutKey>{modKey}L</ShortcutKey>}
                />
                <ShortcutRow
                  label={t.shortcuts.toggleSidebar}
                  shortcut={<ShortcutKey>{modKey}\</ShortcutKey>}
                />

                {/* General Group */}
                <GroupHeader>{t.shortcuts.general}</GroupHeader>

                <ShortcutRow
                  label={t.shortcuts.closeDialog}
                  shortcut={<ShortcutKey>Esc</ShortcutKey>}
                />
                <ShortcutRow
                  label={t.shortcuts.help}
                  shortcut={<ShortcutKey>?</ShortcutKey>}
                />
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-white/[0.06] flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-muted)]">
                  {isRTL ? 'الاختصارات تعمل عندما لا يكون هناك حقل إدخال نشط' : 'Shortcuts work when no input is focused'}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {modKey} = {isMac ? (isRTL ? 'أمر' : 'Command') : (isRTL ? 'تحكم' : 'Control')}
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
