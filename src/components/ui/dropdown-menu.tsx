import React from 'react'
import MuiMenu from '@mui/material/Menu'
import MuiMenuItem from '@mui/material/MenuItem'
import MuiDivider from '@mui/material/Divider'

interface DropdownMenuProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DropdownMenu({ children, open, onOpenChange }: DropdownMenuProps) {
  return <>{children}</>
}

export function DropdownMenuTrigger({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: (event: React.MouseEvent) => void
}) {
  return <div onClick={onClick}>{children}</div>
}

export function DropdownMenuContent({
  children,
  anchorEl,
  open,
  onClose,
}: {
  children: React.ReactNode
  anchorEl?: HTMLElement | null
  open?: boolean
  onClose?: () => void
}) {
  return (
    <MuiMenu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
    >
      {children}
    </MuiMenu>
  )
}

export function DropdownMenuItem({
  children,
  onClick,
  className,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
}) {
  return (
    <MuiMenuItem onClick={onClick} className={className} disabled={disabled}>
      {children}
    </MuiMenuItem>
  )
}

export function DropdownMenuSeparator() {
  return <MuiDivider />
}

export function DropdownMenuLabel({ children }: { children: React.ReactNode }) {
  return <MuiMenuItem disabled>{children}</MuiMenuItem>
}

export function DropdownMenuShortcut({ children }: { children: React.ReactNode }) {
  return <span style={{ marginLeft: 'auto', opacity: 0.6 }}>{children}</span>
}

export function DropdownMenuGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function DropdownMenuPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function DropdownMenuSub({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function DropdownMenuSubTrigger({ children }: { children: React.ReactNode }) {
  return <MuiMenuItem>{children}</MuiMenuItem>
}

export function DropdownMenuSubContent({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function DropdownMenuCheckboxItem({
  children,
  checked,
  onCheckedChange,
}: {
  children: React.ReactNode
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}) {
  return (
    <MuiMenuItem onClick={() => onCheckedChange?.(!checked)}>
      <input type="checkbox" checked={checked} readOnly style={{ marginRight: 8 }} />
      {children}
    </MuiMenuItem>
  )
}

export function DropdownMenuRadioGroup({
  value,
  onValueChange,
  children,
}: {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}) {
  return <>{children}</>
}

export function DropdownMenuRadioItem({
  value,
  children,
  checked,
  onSelect,
}: {
  value: string
  children: React.ReactNode
  checked?: boolean
  onSelect?: () => void
}) {
  return (
    <MuiMenuItem onClick={onSelect}>
      <input type="radio" checked={checked} readOnly style={{ marginRight: 8 }} />
      {children}
    </MuiMenuItem>
  )
}
