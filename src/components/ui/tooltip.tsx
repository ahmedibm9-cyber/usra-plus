import React from 'react'
import MuiTooltip from '@mui/material/Tooltip'

export function Tooltip({
  children,
  content,
}: {
  children: React.ReactElement
  content: React.ReactNode
}) {
  return <MuiTooltip title={content}>{children}</MuiTooltip>
}

export function TooltipContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function TooltipTrigger({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
