import React from 'react'
import MuiCollapsible from '@mui/material/Collapse'

export function Collapsible({
  children,
  open,
}: {
  children: React.ReactNode
  open?: boolean
}) {
  return <MuiCollapsible in={open}>{children}</MuiCollapsible>
}

export function CollapsibleTrigger({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return <div onClick={onClick}>{children}</div>
}

export function CollapsibleContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
