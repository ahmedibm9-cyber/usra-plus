import React from 'react'
import MuiAccordion from '@mui/material/Accordion'
import MuiAccordionSummary from '@mui/material/AccordionSummary'
import MuiAccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'

export function Accordion({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <MuiAccordion className={className}>{children}</MuiAccordion>
}

export function AccordionItem({
  children,
  value,
}: {
  children: React.ReactNode
  value?: string
}) {
  return <MuiAccordion>{children}</MuiAccordion>
}

export function AccordionTrigger({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MuiAccordionSummary expandIcon={<ExpandMoreIcon />}>
      {children}
    </MuiAccordionSummary>
  )
}

export function AccordionContent({ children }: { children: React.ReactNode }) {
  return <MuiAccordionDetails>{children}</MuiAccordionDetails>
}
