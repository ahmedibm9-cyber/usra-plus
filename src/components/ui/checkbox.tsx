import React from 'react'
import MuiCheckbox from '@mui/material/Checkbox'
import type { CheckboxProps as MuiCheckboxProps } from '@mui/material/Checkbox'

export interface CheckboxProps extends Omit<MuiCheckboxProps, 'onChange'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
}

export function Checkbox({
  checked,
  onCheckedChange,
  className,
  ...props
}: CheckboxProps) {
  return (
    <MuiCheckbox
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={className}
      {...props}
    />
  )
}
