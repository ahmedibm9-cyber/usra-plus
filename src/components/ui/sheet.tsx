import React from 'react'
import MuiSheet from '@mui/material/Drawer'

interface SheetProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  return (
    <MuiDrawer
      anchor="right"
      open={open}
      onClose={() => onOpenChange?.(false)}
    >
      {children}
    </MuiDrawer>
  )
}

export function SheetContent({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: 24, minWidth: 320 }}>{children}</div>
}

export function SheetHeader({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: 16 }}>{children}</div>
}

export function SheetTitle({ children }: { children: React.ReactNode }) {
  return <h2>{children}</h2>
}

export function SheetDescription({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>
}

export function SheetTrigger({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <div onClick={onClick}>{children}</div>
}

export function SheetClose({ onClick }: { onClick?: () => void }) {
  return <button onClick={onClick}>Close</button>
}

export function SheetFooter({ children }: { children: React.ReactNode }) {
  return <div style={{ marginTop: 16 }}>{children}</div>
}
