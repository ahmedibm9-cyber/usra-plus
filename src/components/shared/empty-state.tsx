'use client'

import { motion } from 'framer-motion'

interface EmptyStateProps {
 icon: React.ElementType
 title: string
 description: string
 action?: { label: string; onClick: () => void }
 className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
 return (
  <motion.div
   initial={{ opacity: 0, y: 12 }}
   animate={{ opacity: 1, y: 0 }}
   transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
   className={`flex flex-col items-center justify-center py-12 ${className}`}
  >
   <div className="relative mb-5">
    <div className="w-20 h-20 rounded-2xl bg-muted border border-[--border-subtle] flex items-center justify-center">
     <Icon className="w-10 h-10 text-muted-foreground" />
    </div>
    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/[0.03] to-primary/[0.03] blur-xl" />
   </div>
   <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
   <p className="text-sm text-muted-foreground max-w-[280px] text-center leading-relaxed">{description}</p>
   {action && (
    <button
     onClick={action.onClick}
     className="mt-5 bg-[--accent-primary] hover:bg-[--accent-primary]/90 text-white rounded-xl h-10 px-5 text-sm font-medium transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-primary/30 btn-glow btn-press"
    >
     {action.label}
    </button>
   )}
  </motion.div>
 )
}
