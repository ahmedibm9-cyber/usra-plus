'use client'

import { useSyncExternalStore } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'

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
        className="w-9 h-9 rounded-xl border border-border bg-card/50 flex items-center justify-center"
        aria-label="Toggle theme"
      >
        <Moon className="w-4 h-4 text-muted-foreground" />
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
      className="relative w-9 h-9 rounded-xl border border-border bg-card/50 hover:bg-secondary hover:border-[#B8860B]/15 transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring/30"
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
            <Sun className="w-4 h-4 text-[#D4A843]" />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ rotate: 90, scale: 0.5, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <Moon className="w-4 h-4 text-[#047857]" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}
