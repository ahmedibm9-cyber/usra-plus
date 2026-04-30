'use client'

import { Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface FABProps {
  onClick: () => void
  icon?: React.ReactNode
  label?: string
}

export function FAB({ onClick, icon, label }: FABProps) {
  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[--accent-primary] text-white shadow-lg md:hidden btn-cta-glow"
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      aria-label={label || 'Add'}
    >
      {icon || <Plus className="h-6 w-6" />}
    </motion.button>
  )
}
