import React from 'react'
import MuiButton from '@mui/material/Button'
import type { ButtonProps as MuiButtonProps } from '@mui/material/Button'

export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

export interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'size'> {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
}

const variantMap: Record<NonNullable<ButtonVariant>, MuiButtonProps['variant']> = {
  default: 'contained',
  destructive: 'contained',
  outline: 'outlined',
  secondary: 'contained',
  ghost: 'text',
  link: 'text',
}

const sizeMap: Record<NonNullable<ButtonSize>, MuiButtonProps['size']> = {
  default: 'medium',
  sm: 'small',
  lg: 'large',
  icon: 'small',
}

export function Button({
  variant = 'default',
  size = 'default',
  asChild,
  children,
  sx,
  ...props
}: ButtonProps) {
  const isDestructive = variant === 'destructive'
  const isGhost = variant === 'ghost'
  const isLink = variant === 'link'

  const buttonSx = {
    ...(isDestructive && {
      bgcolor: 'error.main',
      '&:hover': { bgcolor: 'error.dark' },
    }),
    ...(isGhost && {
      bgcolor: 'transparent',
      '&:hover': { bgcolor: 'action.hover' },
    }),
    ...(isLink && {
      textDecoration: 'underline',
      textTransform: 'none',
    }),
    ...(size === 'icon' && {
      minWidth: 36,
      width: 36,
      height: 36,
      padding: 0,
    }),
    ...sx,
  }

  return (
    <MuiButton
      variant={variantMap[variant]}
      size={sizeMap[size]}
      sx={buttonSx}
      {...props}
    >
      {children}
    </MuiButton>
  )
}
