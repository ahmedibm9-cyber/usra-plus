'use client'

import { useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'

// useSyncExternalStore avoids the "setState in effect" lint error
const emptySubscribe = () => () => {}
function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
}

export function ThemeToggle() {
  const { theme, setTheme } = useAppStore()
  const mounted = useIsMounted()

  if (!mounted) {
    return (
      <button
        className="w-9 h-9 rounded-xl border border-[--border-subtle] bg-[--bg-surface] flex items-center justify-center"
        aria-label="Toggle theme"
      >
        <Moon className="w-4 h-4 text-[--text-muted]" />
      </button>
    )
  }

  const isDark = theme === 'dark'

  const toggle = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <button
      onClick={toggle}
      className="relative w-9 h-9 rounded-xl border border-[--border-subtle] bg-[--bg-surface] hover:bg-[--bg-surface-2] hover:border-[--border-medium] flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#E50914]/30"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="sun"
            initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <Sun className="w-4 h-4 text-amber-400" />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ rotate: 90, scale: 0.5, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <Moon className="w-4 h-4 text-[#E50914]" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}
