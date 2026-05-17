import React from 'react'
import MuiSeparator from '@mui/material/Divider'

export function Separator({
  className,
  orientation = 'horizontal',
}: {
  className?: string
  orientation?: 'horizontal' | 'vertical'
}) {
  return (
    <MuiSeparator
      orientation={orientation}
      className={className}
    />
  )
}
