'use client'

import { motion, AnimatePresence } from 'framer-motion'

type AppLogoSize = 'sm' | 'md' | 'lg' | 'xl'

interface AppLogoProps {
  showText?: boolean
  size?: AppLogoSize
  collapsed?: boolean
  onClick?: () => void
  className?: string
}

const sizeMap: Record<AppLogoSize, { star: string; text: string; gap: string }> = {
  sm: { star: 'text-xl', text: 'text-sm font-bold', gap: 'gap-1.5' },
  md: { star: 'text-2xl', text: 'text-lg font-bold', gap: 'gap-2' },
  lg: { star: 'text-4xl', text: 'text-3xl font-bold', gap: 'gap-2.5' },
  xl: { star: 'text-6xl', text: 'text-4xl font-bold', gap: 'gap-3' },
}

export function AppLogo({
  showText = true,
  size = 'md',
  collapsed = false,
  onClick,
  className = '',
}: AppLogoProps) {
  const { star, text, gap } = sizeMap[size]

  return (
    <div
      className={`flex items-center ${collapsed ? 'justify-center' : gap} ${onClick ? 'cursor-pointer select-none' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <span className={`${star} leading-none shrink-0 text-purple-400`} role="img" aria-label="USRA PLUS logo">
        ✨
      </span>

      {showText && (
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <h1 className={`${text} text-[--text-primary] tracking-tight whitespace-nowrap`}>
                USRA PLUS
              </h1>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}

export function AppLogoBlock({
  size = 'lg',
  tagline,
  onClick,
}: {
  size?: AppLogoSize
  tagline?: string
  onClick?: () => void
}) {
  const { star, text } = sizeMap[size]

  return (
    <div className="flex flex-col items-center text-center">
      <h1
        className={`${text} text-[--text-primary] tracking-tight`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
      >
        <span className="text-purple-400">✨</span> USRA PLUS
      </h1>
      {tagline && (
        <p className="text-[--text-muted] text-sm mt-1">
          {tagline}
        </p>
      )}
    </div>
  )
}
