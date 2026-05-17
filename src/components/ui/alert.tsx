import React from 'react'
import MuiAlert from '@mui/material/Alert'
import MuiAlertTitle from '@mui/material/AlertTitle'

interface AlertProps {
  children: React.ReactNode
  variant?: 'default' | 'destructive'
  className?: string
}

export function Alert({ children, variant = 'default', className }: AlertProps) {
  return (
    <MuiAlert
      severity={variant === 'destructive' ? 'error' : 'info'}
      className={className}
    >
      {children}
    </MuiAlert>
  )
}

export function AlertTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <MuiAlertTitle className={className}>{children}</MuiAlertTitle>
}

export function AlertDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}
