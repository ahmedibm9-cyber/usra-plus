'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/stores/app-store'
import { PageErrorBoundary } from '@/components/shared/page-error-boundary'

interface PageWrapperProps {
  children: React.ReactNode
}

const pageVariants = {
  initial: {
    opacity: 0,
    x: 8,
    scale: 0.995,
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
  exit: {
    opacity: 0,
    x: -8,
    scale: 0.995,
  },
}

const pageTransition = {
  type: 'tween',
  ease: [0.25, 0.46, 0.45, 0.94],
  duration: 0.15,
}

export function PageWrapper({ children }: PageWrapperProps) {
  const currentPage = useAppStore((state) => state.currentPage)

  return (
    <PageErrorBoundary>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
          className="w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </PageErrorBoundary>
  )
}

export default PageWrapper
