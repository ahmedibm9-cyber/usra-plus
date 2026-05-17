import React from 'react'
import MuiScrollArea from '@mui/material/Box'

export function ScrollArea({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <MuiScrollArea
      className={className}
      sx={{ overflow: 'auto', maxHeight: '100%' }}
    >
      {children}
    </MuiScrollArea>
  )
}

export function ScrollBar({ orientation = 'vertical' }: { orientation?: 'vertical' | 'horizontal' }) {
  return null
}
