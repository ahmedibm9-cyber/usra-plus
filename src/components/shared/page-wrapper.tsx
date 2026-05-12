'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/stores/app-store'
import { PageErrorBoundary } from '@/components/shared/page-error-boundary'

interface PageWrapperProps {
  children: React.ReactNode
}

// Subtle stagger container for child elements
export function StaggerContainer({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.06, delayChildren: 0.05 },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Individual stagger item
export function StaggerItem({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Hoverable card wrapper with subtle lift effect
export function HoverCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.99, transition: { duration: 0.1 } }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function PageWrapper({ children }: PageWrapperProps) {
  const currentPage = useAppStore((state) => state.currentPage)

  return (
    <PageErrorBoundary>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </PageErrorBoundary>
  )
}

export default PageWrapper
