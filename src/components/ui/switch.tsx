import React from 'react'
import MuiSwitch from '@mui/material/Switch'
import type { SwitchProps as MuiSwitchProps } from '@mui/material/Switch'

export interface SwitchProps extends Omit<MuiSwitchProps, 'onChange'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
}

export function Switch({ checked, onCheckedChange, className, ...props }: SwitchProps) {
  return (
    <MuiSwitch
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={className}
      {...props}
    />
  )
}
