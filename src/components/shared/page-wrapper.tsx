'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/stores/app-store'
import { PageErrorBoundary } from '@/components/shared/page-error-boundary'

interface PageWrapperProps {
  children: React.ReactNode
}

const PAGE_ORDER: Record<string, number> = {
  dashboard: 0,
  tasks: 1,
  calendar: 2,
  grocery: 3,
  chat: 4,
  files: 5,
  settings: 6,
}

export function PageWrapper({ children }: PageWrapperProps) {
  const currentPage = useAppStore((state) => state.currentPage)
  const [prevPage, setPrevPage] = useState<string>(currentPage)

  const prevIndex = PAGE_ORDER[prevPage] ?? 0
  const currentIndex = PAGE_ORDER[currentPage] ?? 0

  const direction = useMemo(() => {
    if (currentIndex > prevIndex) return 1 // forward
    if (currentIndex < prevIndex) return -1 // backward
    return 0
  }, [currentIndex, prevIndex])

  // Update prev page after computing direction
  useEffect(() => {
    setPrevPage(currentPage)
  }, [currentPage])

  const pageVariants = {
    initial: {
      opacity: 0,
      x: direction * 40,
      scale: 0.995,
    },
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
    },
    exit: {
      opacity: 0,
      x: -direction * 40,
      scale: 0.995,
    },
  }

  const pageTransition = {
    type: 'tween' as const,
    ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    duration: 0.2,
  }

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
