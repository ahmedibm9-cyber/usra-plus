import React from 'react'
import MuiLabel from '@mui/material/InputLabel'

export function Label({
  children,
  htmlFor,
  className,
}: {
  children: React.ReactNode
  htmlFor?: string
  className?: string
}) {
  return (
    <MuiLabel htmlFor={htmlFor} className={className}>
      {children}
    </MuiLabel>
  )
}
