import React from 'react'
import MuiProgress from '@mui/material/LinearProgress'

export function Progress({ value, className }: { value?: number; className?: string }) {
  return value !== undefined ? (
    <MuiProgress variant="determinate" value={value} className={className} />
  ) : (
    <MuiProgress className={className} />
  )
}
