import React from 'react'
import MuiPopover from '@mui/material/Popover'

export function Popover({
  children,
  open,
  onOpenChange,
  anchorEl,
}: {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  anchorEl?: HTMLElement | null
}) {
  return (
    <MuiPopover
      open={open}
      anchorEl={anchorEl}
      onClose={() => onOpenChange?.(false)}
    >
      {children}
    </MuiPopover>
  )
}

export function PopoverTrigger({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: (event: React.MouseEvent) => void
}) {
  return <div onClick={onClick}>{children}</div>
}

export function PopoverContent({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: 16 }}>{children}</div>
}
