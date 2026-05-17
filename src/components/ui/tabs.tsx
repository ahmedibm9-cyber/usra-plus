import React from 'react'
import MuiTabs from '@mui/material/Tabs'
import MuiTab from '@mui/material/Tab'
import type { TabsProps as MuiTabsProps, TabProps } from '@mui/material'

interface TabsRootProps {
  value: string | number
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function Tabs({ value, onValueChange, children, className }: TabsRootProps) {
  return (
    <div className={className}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            value,
            onChange: (_event: React.SyntheticEvent, newValue: string | number) => onValueChange?.(String(newValue)),
          })
        }
        return child
      })}
    </div>
  )
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <MuiTabs
      value={React.Children.toArray(children).find(
        (c): c is React.ReactElement<TabProps> =>
          React.isValidElement(c) && (c as React.ReactElement<any>).props.value
      )?.props?.value}
      className={className}
    >
      {children}
    </MuiTabs>
  )
}

export function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string | number
  children: React.ReactNode
  className?: string
}) {
  return (
    <MuiTab
      value={value}
      label={children}
      className={className}
    />
  )
}

export function TabsContent({
  value,
  children,
  className,
  forceMount,
}: {
  value: string | number
  children: React.ReactNode
  className?: string
  forceMount?: boolean
}) {
  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  )
}
