'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'

interface ErrorBoundaryProps {
 children: React.ReactNode
}

interface ErrorBoundaryState {
 hasError: boolean
 error: Error | null
}

export class PageErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
 constructor(props: ErrorBoundaryProps) {
  super(props)
  this.state = { hasError: false, error: null }
 }

 static getDerivedStateFromError(error: Error): ErrorBoundaryState {
  return { hasError: true, error }
 }

 componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  console.error('[PageErrorBoundary] Caught error:', error, errorInfo)
 }

 handleRetry = () => {
  this.setState({ hasError: false, error: null })
 }

 handleGoToDashboard = () => {
  // Reset error state first
  this.setState({ hasError: false, error: null })
  // Navigate to dashboard via the app store
  useAppStore.getState().setCurrentPage('dashboard')
 }

 render() {
  if (this.state.hasError) {
   return <ErrorFallback onRetry={this.handleRetry} onGoToDashboard={this.handleGoToDashboard} error={this.state.error} />
  }

  return this.props.children
 }
}

interface ErrorFallbackProps {
 onRetry: () => void
 onGoToDashboard: () => void
 error: Error | null
}

function ErrorFallback({ onRetry, onGoToDashboard, error }: ErrorFallbackProps) {
 return (
  <div className="flex items-center justify-center min-h-[60vh] p-4">
   <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    className="w-full max-w-md"
   >
    {/* Glass morphism card */}
    <div
     className="relative rounded-2xl border border-[--border-subtle] p-8 text-center overflow-hidden"
     style={{ background: 'rgba(17, 17, 23, 0.8)', backdropFilter: 'blur(20px)' }}
    >
     {/* Ambient glow */}
     <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-red-500/10 blur-3xl rounded-full" />
     </div>

     {/* Content */}
     <div className="relative z-10">
      {/* Icon */}
      <motion.div
       initial={{ scale: 0 }}
       animate={{ scale: 1 }}
       transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
       className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mb-6"
      >
       <AlertTriangle className="w-8 h-8 text-red-400" />
      </motion.div>

      {/* Title */}
      <motion.h2
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ delay: 0.15 }}
       className="text-xl font-semibold text-foreground mb-2"
      >
       Something went wrong
      </motion.h2>

      {/* Description */}
      <motion.p
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ delay: 0.2 }}
       className="text-sm text-muted-foreground mb-2"
      >
       This page encountered an unexpected error. You can try again or go back to the dashboard.
      </motion.p>

      {/* Error detail (collapsible-style) */}
      {error?.message && (
       <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="mt-3 mb-5 px-3 py-2 rounded-lg bg-[--bg-primary] border border-[--border-subtle] text-xs text-muted-foreground font-mono break-all"
       >
        {error.message}
       </motion.div>
      )}

      {/* Actions */}
      <motion.div
       initial={{ opacity: 0, y: 10 }}
       animate={{ opacity: 1, y: 0 }}
       transition={{ delay: 0.3 }}
       className="flex flex-col sm:flex-row items-center gap-3 mt-6"
      >
       <button
        onClick={onRetry}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary text-white text-sm font-medium transition-colors duration-200 active:scale-[0.98]"
       >
        <RefreshCw className="w-4 h-4" />
        Try Again
       </button>
       <button
        onClick={onGoToDashboard}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-muted hover:bg-muted text-foreground text-sm font-medium border border-[--border-subtle] transition-colors duration-200 active:scale-[0.98]"
       >
        <LayoutDashboard className="w-4 h-4" />
        Go to Dashboard
       </button>
      </motion.div>
     </div>
    </div>
   </motion.div>
  </div>
 )
}

export default PageErrorBoundary
