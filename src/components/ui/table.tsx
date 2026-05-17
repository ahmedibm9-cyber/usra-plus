import React from 'react'
import MuiTable from '@mui/material/Table'
import MuiTableBody from '@mui/material/TableBody'
import MuiTableCell from '@mui/material/TableCell'
import MuiTableHead from '@mui/material/TableHead'
import MuiTableRow from '@mui/material/TableRow'
import MuiTableContainer from '@mui/material/TableContainer'
import MuiTablePagination from '@mui/material/TablePagination'

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <MuiTableContainer className={className}>
      <MuiTable>{children}</MuiTable>
    </MuiTableContainer>
  )
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return <MuiTableHead>{children}</MuiTableHead>
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <MuiTableBody>{children}</MuiTableBody>
}

export function TableHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return <MuiTableCell component="th" className={className}>{children}</MuiTableCell>
}

export function TableRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <MuiTableRow className={className}>{children}</MuiTableRow>
}

export function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <MuiTableCell className={className}>{children}</MuiTableCell>
}

export function TableFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <MuiTableRow className={className}>{children}</MuiTableRow>
}

export function TableCaption({ children }: { children: React.ReactNode }) {
  return <caption>{children}</caption>
}
