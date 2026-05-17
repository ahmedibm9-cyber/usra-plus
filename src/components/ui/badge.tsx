import React from 'react'
import MuiBadge from '@mui/material/Badge'
import Chip from '@mui/material/Chip'
import type { BadgeProps as MuiBadgeProps } from '@mui/material/Badge'

export interface BadgeProps {
  children?: React.ReactNode
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  className?: string
  color?: string
}

export function Badge({ children, variant = 'default', className, color }: BadgeProps) {
  const colorMap: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
    default: 'default',
    secondary: 'secondary',
    destructive: 'error',
    outline: 'primary',
  }

  return (
    <Chip
      label={children}
      size="small"
      color={colorMap[variant] || 'default'}
      sx={className}
    />
  )
}
