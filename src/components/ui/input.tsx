import React, { forwardRef } from 'react'
import TextField from '@mui/material/TextField'
import type { TextFieldProps } from '@mui/material/TextField'

export interface InputProps extends Omit<TextFieldProps, 'variant' | 'color'> {
  className?: string
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
  min?: number
  max?: number
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, color, min, max, ...props }, ref) => {
    return (
      <TextField
        ref={ref}
        type={type}
        variant="outlined"
        size="small"
        fullWidth
        color={color}
        inputProps={{ min, max }}
        inputRef={ref}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
