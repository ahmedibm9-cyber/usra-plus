import React from 'react'
import MuiAvatar from '@mui/material/Avatar'

interface AvatarProps {
  children?: React.ReactNode
  className?: string
}

export function Avatar({ children, className }: AvatarProps) {
  return (
    <MuiAvatar className={className}>
      {children}
    </MuiAvatar>
  )
}

export function AvatarImage({ src, alt }: { src?: string; alt?: string }) {
  return <MuiAvatar src={src} alt={alt} />
}

export function AvatarFallback({ children }: { children: React.ReactNode }) {
  return <MuiAvatar>{children}</MuiAvatar>
}
