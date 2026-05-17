import React from 'react'
import MuiCalendar from '@mui/lab/DatePicker'

export function Calendar({
  selected,
  onSelect,
  className,
}: {
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  className?: string
}) {
  return (
    <div className={className}>
      <MuiCalendar
        value={selected}
        onChange={(newValue) => onSelect?.(newValue || undefined)}
      />
    </div>
  )
}
