import React from 'react'
import MuiCard from '@mui/material/Card'
import MuiCardContent from '@mui/material/CardContent'
import MuiCardHeader from '@mui/material/CardHeader'

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <MuiCard className={className}>{children}</MuiCard>
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <MuiCardHeader className={className}>{children}</MuiCardHeader>
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <MuiCardContent className={className}>{children}</MuiCardContent>
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

export function CardDescription({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>
}
