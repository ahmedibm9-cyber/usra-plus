import React, { type ReactNode } from 'react'
import MuiDialog from '@mui/material/Dialog'
import MuiDialogTitle from '@mui/material/DialogTitle'
import MuiDialogContent from '@mui/material/DialogContent'
import MuiDialogActions from '@mui/material/DialogActions'
import MuiIconButton from '@mui/material/IconButton'
import MuiTypography from '@mui/material/Typography'
import CloseIcon from '@mui/icons-material/Close'
import type { DialogProps as MuiDialogProps } from '@mui/material/Dialog'

interface DialogRootProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogRootProps) {
  return (
    <MuiDialog
      open={open}
      onClose={() => onOpenChange?.(false)}
    >
      {children}
    </MuiDialog>
  )
}

export function DialogTrigger({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return <div onClick={onClick}>{children}</div>
}

export function DialogPortal({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function DialogClose({ onClick }: { onClick?: () => void }) {
  return (
    <MuiIconButton
      onClick={onClick}
      sx={{ position: 'absolute', right: 8, top: 8 }}
    >
      <CloseIcon />
    </MuiIconButton>
  )
}

export function DialogOverlay() {
  return null
}

interface DialogContentProps extends Omit<MuiDialogProps, 'open' | 'onClose'> {
  showCloseButton?: boolean
  children: ReactNode
}

export function DialogContent({
  showCloseButton = true,
  children,
  sx,
  ...props
}: DialogContentProps) {
  return (
    <>
      {showCloseButton && <DialogClose />}
      <MuiDialogContent sx={{ ...sx }} {...props}>
        {children}
      </MuiDialogContent>
    </>
  )
}

export function DialogHeader({ children, sx }: { children: ReactNode; sx?: object }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...sx }}>
      {children}
    </div>
  )
}

export function DialogFooter({ children, sx }: { children: ReactNode; sx?: object }) {
  return (
    <MuiDialogActions sx={sx}>
      {children}
    </MuiDialogActions>
  )
}

export function DialogTitle({ children }: { children: ReactNode }) {
  return <MuiDialogTitle>{children}</MuiDialogTitle>
}

export function DialogDescription({ children }: { children: ReactNode }) {
  return <MuiTypography variant="body2" sx={{ color: 'text.secondary' }}>{children}</MuiTypography>
}
