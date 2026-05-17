import React from 'react'
import MuiDialog from '@mui/material/Dialog'
import MuiDialogTitle from '@mui/material/DialogTitle'
import MuiDialogContent from '@mui/material/DialogContent'
import MuiDialogActions from '@mui/material/DialogActions'
import MuiButton from '@mui/material/Button'

interface AlertDialogProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  return (
    <MuiDialog open={open} onClose={() => onOpenChange?.(false)}>
      {children}
    </MuiDialog>
  )
}

export function AlertDialogTrigger({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return <div onClick={onClick}>{children}</div>
}

export function AlertDialogContent({ children }: { children: React.ReactNode }) {
  return <MuiDialogContent>{children}</MuiDialogContent>
}

export function AlertDialogHeader({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: 16 }}>{children}</div>
}

export function AlertDialogFooter({ children }: { children: React.ReactNode }) {
  return <MuiDialogActions>{children}</MuiDialogActions>
}

export function AlertDialogTitle({ children }: { children: React.ReactNode }) {
  return <MuiDialogTitle>{children}</MuiDialogTitle>
}

export function AlertDialogDescription({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

export function AlertDialogCancel({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <MuiButton onClick={onClick} variant="outlined">
      {children}
    </MuiButton>
  )
}

export function AlertDialogAction({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <MuiButton onClick={onClick} variant="contained" sx={{ color: 'primary.main' }}>
      {children}
    </MuiButton>
  )
}
