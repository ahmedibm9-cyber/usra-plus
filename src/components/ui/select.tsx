import React from 'react'
import MuiSelect from '@mui/material/Select'
import MuiMenuItem from '@mui/material/MenuItem'
import MuiInputLabel from '@mui/material/InputLabel'
import MuiFormControl from '@mui/material/FormControl'

export function Select({
  value,
  onValueChange,
  children,
  placeholder,
  className,
}: {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  placeholder?: string
  className?: string
}) {
  return (
    <MuiFormControl fullWidth size="small" className={className}>
      <MuiSelect
        value={value || ''}
        onChange={(e) => onValueChange?.(e.target.value as string)}
        displayEmpty
      >
        {placeholder && (
          <MuiMenuItem value="" disabled>
            {placeholder}
          </MuiMenuItem>
        )}
        {children}
      </MuiSelect>
    </MuiFormControl>
  )
}

export function SelectTrigger({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function SelectValue({ value, placeholder }: { value?: string; placeholder?: string }) {
  return <span>{value || placeholder}</span>
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function SelectItem({
  value,
  children,
}: {
  value: string
  children: React.ReactNode
}) {
  return <MuiMenuItem value={value}>{children}</MuiMenuItem>
}
