import React from 'react'
import MuiSkeleton from '@mui/material/Skeleton'
import type { SkeletonProps } from '@mui/material/Skeleton'

export function Skeleton({ className, ...props }: Partial<SkeletonProps>) {
  return <MuiSkeleton animation="wave" {...props} />
}
